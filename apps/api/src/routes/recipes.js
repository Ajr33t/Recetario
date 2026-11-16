import { Router } from 'express';
import { getDb, registrarAuditoria } from '../db/database.js';
import { requireAuth, opcionalAuth } from '../middleware/auth.js';
import { detallePorId } from '../services/mealdb.js';

/**
 * Recetas del usuario (RF-05/06/07/08/21 — Fase 3 + Fase 5).
 * - Las rutas de gestión exigen sesión (cada usuario solo ve/edita/borra las suyas).
 * - `GET /:id` es público: muestra recetas propias (con sesión) o públicas
 *   de cualquier usuario (RF-12 compartir por enlace).
 * - Versiones con snapshot completo (receta + ingredientes + pasos) para
 *   poder restaurar (RF-07).
 * - Papelera con restaurar/borrado permanente (RF-08, retención 30 días).
 * - Exportar/importar JSON (RF-21).
 */
const router = Router();

const DIFICULTADES = new Set(['facil', 'media', 'dificil']);
const VISIBILIDADES = new Set(['privada', 'publica']);

/** Añade ingredientes y pasos anidados a una receta. */
function conDetalles(receta, userId = null) {
  const db = getDb();
  const favorito = userId
    ? Boolean(
        db
          .prepare('SELECT 1 AS x FROM favorites WHERE user_id = ? AND recipe_id = ?')
          .get(userId, receta.id),
      )
    : false;
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
    favorito,
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

/** Receta propia o 404 (para rutas de gestión). */
function propiaO404(req, res) {
  const fila = getDb().prepare('SELECT * FROM recipes WHERE id = ?').get(req.params.id);
  if (!fila || fila.user_id !== req.user.id) {
    res.status(404).json({ error: 'Receta no encontrada' });
    return null;
  }
  return fila;
}

// ── Gestión (requieren sesión) ──

/** GET /api/recipes — lista las recetas del usuario (?estado=papelera incluye la papelera). */
router.get('/', requireAuth, (req, res) => {
  const estado = req.query.estado === 'papelera' ? 'papelera' : 'activa';
  const filas = getDb()
    .prepare(
      `SELECT id, titulo, descripcion, tiempo_min, dificultad, porciones, imagen_url,
              visibilidad, origen, estado, etiquetas, externo_id, creado_en, actualizado_en,
              deleted_at
       FROM recipes WHERE user_id = ? AND estado = ? ORDER BY actualizado_en DESC`,
    )
    .all(req.user.id, estado);

  return res.json({
    recetas: filas.map((f) => ({ ...f, etiquetas: JSON.parse(f.etiquetas || '[]') })),
  });
});

/** GET /api/recipes/exportar — descarga todas las recetas activas en JSON (RF-21). */
router.get('/exportar', requireAuth, (req, res) => {
  const db = getDb();
  const filas = db
    .prepare(`SELECT * FROM recipes WHERE user_id = ? AND estado = 'activa' ORDER BY creado_en`)
    .all(req.user.id);

  const recetas = filas.map((f) => ({
    titulo: f.titulo,
    descripcion: f.descripcion,
    tiempo_min: f.tiempo_min,
    dificultad: f.dificultad,
    porciones: f.porciones,
    imagen_url: f.imagen_url,
    visibilidad: f.visibilidad,
    origen: f.origen,
    etiquetas: JSON.parse(f.etiquetas || '[]'),
    creado_en: f.creado_en,
    ingredientes: db
      .prepare(
        'SELECT nombre, cantidad, unidad FROM recipe_ingredients WHERE recipe_id = ? ORDER BY orden',
      )
      .all(f.id),
    pasos: db
      .prepare('SELECT orden, descripcion FROM recipe_steps WHERE recipe_id = ? ORDER BY orden')
      .all(f.id),
  }));

  return res.json({
    formato: 'sazonlab.recetas',
    version: 1,
    exportado_en: new Date().toISOString(),
    total: recetas.length,
    recetas,
  });
});

/** POST /api/recipes/importar — importa recetas desde un JSON exportado (RF-21). */
router.post('/importar', requireAuth, (req, res) => {
  const lista = req.body?.recetas;
  if (!Array.isArray(lista) || lista.length === 0) {
    return res.status(400).json({ error: 'El archivo no contiene recetas' });
  }
  if (lista.length > 500) {
    return res.status(400).json({ error: 'Máximo 500 recetas por importación' });
  }

  const db = getDb();
  const insertReceta = db.prepare(
    `INSERT INTO recipes
       (user_id, titulo, descripcion, tiempo_min, dificultad, porciones, imagen_url,
        visibilidad, origen, etiquetas)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'privada', 'propia', ?)`,
  );
  let importadas = 0;
  const errores = [];

  const importar = db.transaction(() => {
    lista.forEach((r, i) => {
      const error = validarCampos(r);
      if (error) {
        errores.push(`Receta ${i + 1}: ${error}`);
        return;
      }
      const etiquetas = Array.isArray(r.etiquetas) ? r.etiquetas.slice(0, 10).map(String) : [];
      const id = Number(
        insertReceta.run(
          req.user.id,
          String(r.titulo).trim(),
          r.descripcion ?? null,
          r.tiempo_min != null && Number.isFinite(Number(r.tiempo_min))
            ? Number(r.tiempo_min)
            : null,
          DIFICULTADES.has(r.dificultad) ? r.dificultad : null,
          r.porciones != null && Number(r.porciones) >= 1 ? Number(r.porciones) : null,
          typeof r.imagen_url === 'string' ? r.imagen_url : null,
          JSON.stringify(etiquetas),
        ).lastInsertRowid,
      );
      reemplazarDetalles(id, r.ingredientes, r.pasos);
      importadas++;
    });
  });
  importar();

  registrarAuditoria(req.user.correo, 'importar_recetas', { importadas }, req.ip);
  return res.status(201).json({ importadas, errores });
});

/** GET /api/recipes/:id — detalle: pública para cualquiera, propia con sesión. */
router.get('/:id', opcionalAuth, (req, res) => {
  const fila = getDb().prepare('SELECT * FROM recipes WHERE id = ?').get(req.params.id);
  if (!fila || fila.estado === 'papelera') {
    return res.status(404).json({ error: 'Receta no encontrada' });
  }
  const esDuenia = req.user && fila.user_id === req.user.id;
  if (!esDuenia && fila.visibilidad !== 'publica') {
    return res.status(404).json({ error: 'Receta no encontrada' });
  }
  return res.json({ receta: conDetalles(fila, req.user?.id ?? null) });
});

/** GET /api/recipes/:id/versiones — historial de versiones (dueña). */
router.get('/:id/versiones', requireAuth, (req, res) => {
  const fila = propiaO404(req, res);
  if (!fila) return undefined;
  const filas = getDb()
    .prepare(
      `SELECT version, datos, creado_en FROM recipe_versions
       WHERE recipe_id = ? ORDER BY version DESC`,
    )
    .all(fila.id);
  return res.json({
    versiones: filas.map((v) => {
      let titulo = null;
      try {
        const datos = JSON.parse(v.datos);
        titulo = datos.titulo ?? datos.receta?.titulo ?? null;
      } catch {
        titulo = null;
      }
      return { version: v.version, creado_en: v.creado_en, titulo };
    }),
  });
});

/** POST /api/recipes/:id/versiones/:version/restaurar — restaura una versión (RF-07). */
router.post('/:id/versiones/:version/restaurar', requireAuth, (req, res) => {
  const db = getDb();
  const fila = propiaO404(req, res);
  if (!fila) return undefined;

  const previa = db
    .prepare('SELECT datos FROM recipe_versions WHERE recipe_id = ? AND version = ?')
    .get(fila.id, Number(req.params.version));
  if (!previa) return res.status(404).json({ error: 'Versión no encontrada' });

  let datos;
  try {
    datos = JSON.parse(previa.datos);
  } catch {
    return res.status(500).json({ error: 'Versión corrupta' });
  }
  // Formato antiguo: solo la fila. Nuevo: { receta, ingredientes, pasos }
  const origen = datos.receta || datos;
  const ingredientes = datos.ingredientes;
  const pasos = datos.pasos;

  // Se conserva el estado actual como una versión nueva antes de restaurar
  db.prepare('INSERT INTO recipe_versions (recipe_id, version, datos) VALUES (?, ?, ?)').run(
    fila.id,
    (db
      .prepare('SELECT COALESCE(MAX(version), 0) AS v FROM recipe_versions WHERE recipe_id = ?')
      .get(fila.id).v ?? 0) + 1,
    JSON.stringify(conDetalles(fila)),
  );

  db.prepare(
    `UPDATE recipes SET titulo = ?, descripcion = ?, tiempo_min = ?, dificultad = ?,
       porciones = ?, imagen_url = ?, visibilidad = ?, etiquetas = ?,
       actualizado_en = datetime('now')
     WHERE id = ?`,
  ).run(
    origen.titulo ?? fila.titulo,
    origen.descripcion ?? fila.descripcion,
    origen.tiempo_min ?? fila.tiempo_min,
    origen.dificultad ?? fila.dificultad,
    origen.porciones ?? fila.porciones,
    origen.imagen_url ?? fila.imagen_url,
    origen.visibilidad ?? fila.visibilidad,
    typeof origen.etiquetas === 'string'
      ? origen.etiquetas
      : JSON.stringify(Array.isArray(origen.etiquetas) ? origen.etiquetas : []),
    fila.id,
  );
  if (Array.isArray(ingredientes)) reemplazarDetalles(fila.id, ingredientes, undefined);
  if (Array.isArray(pasos)) reemplazarDetalles(fila.id, undefined, pasos);

  registrarAuditoria(req.user.correo, 'restaurar_version', { id: fila.id }, req.ip);
  return res.json({
    receta: conDetalles(db.prepare('SELECT * FROM recipes WHERE id = ?').get(fila.id), req.user.id),
  });
});

/** POST /api/recipes — crea una receta (con ingredientes y pasos opcionales). */
router.post('/', requireAuth, (req, res) => {
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
  const receta = conDetalles(db.prepare('SELECT * FROM recipes WHERE id = ?').get(id), req.user.id);
  return res.status(201).json({ receta });
});

/** PUT /api/recipes/:id — actualiza (solo la del usuario) con snapshot de versión. */
router.put('/:id', requireAuth, (req, res) => {
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

  // Snapshot completo (receta + ingredientes + pasos) antes de editar (RF-07)
  db.prepare('INSERT INTO recipe_versions (recipe_id, version, datos) VALUES (?, ?, ?)').run(
    fila.id,
    (db
      .prepare('SELECT COALESCE(MAX(version), 0) AS v FROM recipe_versions WHERE recipe_id = ?')
      .get(fila.id).v ?? 0) + 1,
    JSON.stringify(conDetalles(fila)),
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
    receta: conDetalles(db.prepare('SELECT * FROM recipes WHERE id = ?').get(fila.id), req.user.id),
  });
});

/** DELETE /api/recipes/:id — papelera (borrado suave, RF-08). */
router.delete('/:id', requireAuth, (req, res) => {
  const db = getDb();
  const fila = db.prepare('SELECT * FROM recipes WHERE id = ?').get(req.params.id);
  if (!fila || fila.user_id !== req.user.id) {
    return res.status(404).json({ error: 'Receta no encontrada' });
  }

  // ?permanente=1 elimina de raíz (desde la papelera, con confirmación)
  if (req.query.permanente === '1') {
    db.prepare('DELETE FROM favorites WHERE recipe_id = ?').run(fila.id);
    db.prepare('DELETE FROM recipes WHERE id = ?').run(fila.id);
    registrarAuditoria(req.user.correo, 'borrar_definitivo', { id: fila.id }, req.ip);
    return res.json({ ok: true, id: fila.id, permanente: true });
  }

  db.prepare(
    `UPDATE recipes SET estado = 'papelera', deleted_at = datetime('now'),
       actualizado_en = datetime('now') WHERE id = ?`,
  ).run(fila.id);

  registrarAuditoria(req.user.correo, 'borrar_receta', { id: fila.id }, req.ip);
  return res.json({ ok: true, id: fila.id });
});

/** POST /api/recipes/:id/restaurar — saca la receta de la papelera (RF/CU-10). */
router.post('/:id/restaurar', requireAuth, (req, res) => {
  const db = getDb();
  const fila = db.prepare('SELECT * FROM recipes WHERE id = ?').get(req.params.id);
  if (!fila || fila.user_id !== req.user.id) {
    return res.status(404).json({ error: 'Receta no encontrada' });
  }
  if (fila.estado !== 'papelera') {
    return res.status(400).json({ error: 'La receta no está en la papelera' });
  }
  db.prepare(
    `UPDATE recipes SET estado = 'activa', deleted_at = NULL,
       actualizado_en = datetime('now') WHERE id = ?`,
  ).run(fila.id);
  registrarAuditoria(req.user.correo, 'restaurar_receta', { id: fila.id }, req.ip);
  return res.json({ ok: true, id: fila.id });
});

/** Importa una receta de TheMealDB a la colección del usuario (usado por favoritos). */
export async function importarExterna(userId, externoId) {
  const db = getDb();
  const existente = db
    .prepare(`SELECT id FROM recipes WHERE user_id = ? AND externo_id = ? AND estado = 'activa'`)
    .get(userId, String(externoId));
  if (existente) return existente.id;

  const detalle = await detallePorId(externoId);
  if (!detalle) return null;

  const etiquetas = [
    ...(detalle.categoria ? [detalle.categoria] : []),
    ...(detalle.area ? [detalle.area] : []),
    ...detalle.etiquetas,
  ].slice(0, 10);

  const id = Number(
    db
      .prepare(
        `INSERT INTO recipes
           (user_id, titulo, imagen_url, visibilidad, origen, etiquetas, externo_id)
         VALUES (?, ?, ?, 'privada', 'sugerida', ?, ?)`,
      )
      .run(userId, detalle.titulo, detalle.imagen, JSON.stringify(etiquetas), String(externoId))
      .lastInsertRowid,
  );

  const insertIng = db.prepare(
    'INSERT INTO recipe_ingredients (recipe_id, nombre, cantidad, unidad, orden) VALUES (?, ?, ?, ?, ?)',
  );
  detalle.ingredientes.forEach((ing, i) => {
    insertIng.run(id, ing.nombre, null, ing.cantidad || null, i);
  });
  const insertPaso = db.prepare(
    'INSERT INTO recipe_steps (recipe_id, orden, descripcion) VALUES (?, ?, ?)',
  );
  detalle.instrucciones
    .split(/\r?\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .forEach((paso, i) => insertPaso.run(id, i + 1, paso));

  return id;
}

export default router;
