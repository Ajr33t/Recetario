import { Router } from 'express';
import { getDb, registrarAuditoria } from '../db/database.js';
import { requireAuth } from '../middleware/auth.js';

/**
 * Recetas del usuario (RF-06 CRUD — capa servidor de la Fase 3).
 * Todas las rutas exigen sesión: cada usuario solo ve/edita/borra las suyas
 * (y las públicas de otros en el detalle). Así las recetas viajan con la
 * cuenta: desde cualquier dispositivo.
 */
const router = Router();
router.use(requireAuth);

const DIFICULTADES = new Set(['facil', 'media', 'dificil']);
const VISIBILIDADES = new Set(['privada', 'publica']);

/** Añade ingredientes y pasos anidados a una receta. */
function conDetalles(receta) {
  const db = getDb();
  return {
    ...receta,
    etiquetas: JSON.parse(receta.etiquetas || '[]'),
    ingredientes: db
      .prepare(
        'SELECT nombre, cantidad, unidad FROM recipe_ingredients WHERE recipe_id = ? ORDER BY orden',
      )
      .all(receta.id),
    pasos: db
      .prepare('SELECT orden, descripcion FROM recipe_steps WHERE recipe_id = ? ORDER BY orden')
      .all(receta.id),
  };
}

/** Sustituye ingredientes/pasos (borra y reinserta). */
function reemplazarDetalles(recipeId, ingredientes, pasos) {
  const db = getDb();
  if (Array.isArray(ingredientes)) {
    db.prepare('DELETE FROM recipe_ingredients WHERE recipe_id = ?').run(recipeId);
    const insert = db.prepare(
      'INSERT INTO recipe_ingredients (recipe_id, nombre, cantidad, unidad, orden) VALUES (?, ?, ?, ?, ?)',
    );
    ingredientes.forEach((ing, i) => {
      if (ing && ing.nombre) {
        insert.run(recipeId, String(ing.nombre), ing.cantidad ?? null, ing.unidad ?? null, i);
      }
    });
  }
  if (Array.isArray(pasos)) {
    db.prepare('DELETE FROM recipe_steps WHERE recipe_id = ?').run(recipeId);
    const insert = db.prepare(
      'INSERT INTO recipe_steps (recipe_id, orden, descripcion) VALUES (?, ?, ?)',
    );
    pasos.forEach((paso, i) => {
      if (paso && paso.descripcion) insert.run(recipeId, i + 1, String(paso.descripcion));
    });
  }
}

/** Valida y normaliza los campos comunes de creación/edición. */
function validarCampos(body) {
  const { titulo, dificultad, visibilidad, tiempo_min, porciones } = body || {};
  if (!titulo || typeof titulo !== 'string' || titulo.trim().length < 3) {
    return 'El título debe tener al menos 3 caracteres';
  }
  if (dificultad && !DIFICULTADES.has(dificultad)) return 'Dificultad inválida';
  if (visibilidad && !VISIBILIDADES.has(visibilidad)) return 'Visibilidad inválida';
  if (tiempo_min != null && (!Number.isFinite(Number(tiempo_min)) || Number(tiempo_min) < 0)) {
    return 'Tiempo inválido';
  }
  if (porciones != null && (!Number.isFinite(Number(porciones)) || Number(porciones) < 1)) {
    return 'Porciones inválidas';
  }
  return null;
}

/** GET /api/recipes — lista las recetas del usuario (?estado=papelera incluye la papelera). */
router.get('/', (req, res) => {
  const estado = req.query.estado === 'papelera' ? 'papelera' : 'activa';
  const filas = getDb()
    .prepare(
      `SELECT id, titulo, descripcion, tiempo_min, dificultad, porciones, imagen_url,
              visibilidad, origen, estado, etiquetas, creado_en, actualizado_en
       FROM recipes WHERE user_id = ? AND estado = ? ORDER BY actualizado_en DESC`,
    )
    .all(req.user.id, estado);

  return res.json({
    recetas: filas.map((f) => ({ ...f, etiquetas: JSON.parse(f.etiquetas || '[]') })),
  });
});

/** GET /api/recipes/:id — detalle (propia o pública). */
router.get('/:id', (req, res) => {
  const fila = getDb().prepare('SELECT * FROM recipes WHERE id = ?').get(req.params.id);
  if (!fila || fila.estado === 'papelera') {
    return res.status(404).json({ error: 'Receta no encontrada' });
  }
  if (fila.user_id !== req.user.id && fila.visibilidad !== 'publica') {
    return res.status(404).json({ error: 'Receta no encontrada' });
  }
  return res.json({ receta: conDetalles(fila) });
});

/** POST /api/recipes — crea una receta (con ingredientes y pasos opcionales). */
router.post('/', (req, res) => {
  const error = validarCampos(req.body);
  if (error) return res.status(400).json({ error });

  const db = getDb();
  const b = req.body;
  const etiquetas = Array.isArray(b.etiquetas) ? b.etiquetas.slice(0, 10).map(String) : [];

  const resultado = db
    .prepare(
      `INSERT INTO recipes
         (user_id, titulo, descripcion, tiempo_min, dificultad, porciones, imagen_url,
          visibilidad, origen, etiquetas)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'propia', ?)`,
    )
    .run(
      req.user.id,
      b.titulo.trim(),
      b.descripcion ?? null,
      b.tiempo_min != null ? Number(b.tiempo_min) : null,
      b.dificultad ?? null,
      b.porciones != null ? Number(b.porciones) : null,
      b.imagen_url ?? null,
      b.visibilidad || 'privada',
      JSON.stringify(etiquetas),
    );

  const id = Number(resultado.lastInsertRowid);
  reemplazarDetalles(id, b.ingredientes, b.pasos);

  registrarAuditoria(req.user.correo, 'crear_receta', { id, titulo: b.titulo.trim() }, req.ip);
  const receta = conDetalles(db.prepare('SELECT * FROM recipes WHERE id = ?').get(id));
  return res.status(201).json({ receta });
});

/** PUT /api/recipes/:id — actualiza (solo la del usuario). */
router.put('/:id', (req, res) => {
  const db = getDb();
  const fila = db.prepare('SELECT * FROM recipes WHERE id = ?').get(req.params.id);
  if (!fila || fila.user_id !== req.user.id) {
    return res.status(404).json({ error: 'Receta no encontrada' });
  }

  const error = validarCampos({ ...fila, ...req.body });
  if (error) return res.status(400).json({ error });

  const b = req.body;
  const etiquetas = Array.isArray(b.etiquetas)
    ? b.etiquetas.slice(0, 10).map(String)
    : fila.etiquetas;

  // Snapshot de versión antes de editar (histórico del IEEE)
  db.prepare('INSERT INTO recipe_versions (recipe_id, version, datos) VALUES (?, ?, ?)').run(
    fila.id,
    (db
      .prepare('SELECT COALESCE(MAX(version), 0) AS v FROM recipe_versions WHERE recipe_id = ?')
      .get(fila.id).v ?? 0) + 1,
    JSON.stringify(fila),
  );

  db.prepare(
    `UPDATE recipes SET
       titulo = ?, descripcion = ?, tiempo_min = ?, dificultad = ?, porciones = ?,
       imagen_url = ?, visibilidad = ?, etiquetas = ?, actualizado_en = datetime('now')
     WHERE id = ?`,
  ).run(
    b.titulo !== undefined ? String(b.titulo).trim() : fila.titulo,
    b.descripcion !== undefined ? b.descripcion : fila.descripcion,
    b.tiempo_min !== undefined && b.tiempo_min != null ? Number(b.tiempo_min) : fila.tiempo_min,
    b.dificultad !== undefined ? b.dificultad : fila.dificultad,
    b.porciones !== undefined && b.porciones != null ? Number(b.porciones) : fila.porciones,
    b.imagen_url !== undefined ? b.imagen_url : fila.imagen_url,
    b.visibilidad !== undefined ? b.visibilidad : fila.visibilidad,
    JSON.stringify(etiquetas),
    fila.id,
  );

  if (b.ingredientes !== undefined || b.pasos !== undefined) {
    reemplazarDetalles(fila.id, b.ingredientes, b.pasos);
  }

  registrarAuditoria(req.user.correo, 'editar_receta', { id: fila.id }, req.ip);
  return res.json({
    receta: conDetalles(db.prepare('SELECT * FROM recipes WHERE id = ?').get(fila.id)),
  });
});

/** DELETE /api/recipes/:id — papelera (borrado suave, RF-06). */
router.delete('/:id', (req, res) => {
  const db = getDb();
  const fila = db.prepare('SELECT * FROM recipes WHERE id = ?').get(req.params.id);
  if (!fila || fila.user_id !== req.user.id) {
    return res.status(404).json({ error: 'Receta no encontrada' });
  }

  db.prepare(
    `UPDATE recipes SET estado = 'papelera', deleted_at = datetime('now'),
       actualizado_en = datetime('now') WHERE id = ?`,
  ).run(fila.id);

  registrarAuditoria(req.user.correo, 'borrar_receta', { id: fila.id }, req.ip);
  return res.json({ ok: true, id: fila.id });
});

export default router;
