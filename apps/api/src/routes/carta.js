import { Router } from 'express';
import { getDb, registrarAuditoria } from '../db/database.js';
import { requireAuth, opcionalAuth } from '../middleware/auth.js';

/**
 * Carta del rol Chef/Restaurante (nuevos puntos 3, 4, 6 y 7 del encargo).
 *
 * - Preferencias de personalización de la carta (colores, tipografía,
 *   orientación, versión con/sin precio, organización, logo, alérgenos…).
 * - Platos de la carta: se agregan a partir de recetas propias, con precio,
 *   categoría, alérgenos (precargados desde la receta y editables) y
 *   composición visible.
 * - Carta digital pública (la que abre el código QR), con opción de ocultar
 *   precios y de filtrar platos por alérgenos del comensal.
 *
 * Endpoints:
 * - GET   /api/carta/preferencias        → preferencias propias
 * - PUT   /api/carta/preferencias        → guarda la personalización
 * - GET   /api/carta/platos              → platos de la propia carta
 * - POST  /api/carta/platos              → agrega una receta a la carta
 * - PUT   /api/carta/platos/:id          → edita precio/categoría/alérgenos…
 * - DELETE /api/carta/platos/:id         → quita el plato de la carta
 * - GET   /api/carta/publica/:user_id    → carta digital (acceso vía QR)
 */
const router = Router();

/** Campos permitidos en las preferencias de carta (whitelist). */
function limpiarPreferencias(body = {}) {
  const hex = (v) => (typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v) ? v : undefined);
  const texto = (v, max = 120) =>
    typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : undefined;

  const prefs = {
    nombre_establecimiento: texto(body.nombre_establecimiento),
    color_principal: hex(body.color_principal),
    color_secundaria: hex(body.color_secundaria),
    color_fondo: hex(body.color_fondo),
    color_texto: hex(body.color_texto),
    orientacion: ['vertical', 'horizontal'].includes(body.orientacion) ? body.orientacion : undefined,
    tamano: ['A4', 'A5', 'carta', 'personalizado'].includes(body.tamano) ? body.tamano : undefined,
    tipografia: texto(body.tipografia, 60),
    version: ['con_precio', 'sin_precio', 'ambas'].includes(body.version) ? body.version : undefined,
    organizacion: ['categorias', 'precio', 'manual'].includes(body.organizacion)
      ? body.organizacion
      : undefined,
    mostrar_alergenos:
      typeof body.mostrar_alergenos === 'boolean' ? body.mostrar_alergenos : undefined,
    mostrar_composicion:
      typeof body.mostrar_composicion === 'boolean' ? body.mostrar_composicion : undefined,
    // Logo del restaurante: data URL (imagen base64) o null para quitarlo.
    logo: typeof body.logo === 'string' ? body.logo.slice(0, 400_000) : body.logo === null ? null : undefined,
  };
  // Se descartan los `undefined` para no pisar valores guardados.
  return Object.fromEntries(Object.entries(prefs).filter(([, v]) => v !== undefined));
}

/** GET /api/carta/preferencias — preferencias de personalización del usuario. */
router.get('/preferencias', requireAuth, (req, res) => {
  const fila = getDb()
    .prepare('SELECT preferences_json FROM user_preferences WHERE user_id = ?')
    .get(req.user.id);
  let preferencias = null;
  try {
    preferencias = fila?.preferences_json ? JSON.parse(fila.preferences_json) : null;
  } catch {
    preferencias = null;
  }
  return res.json({ preferencias });
});

/** PUT /api/carta/preferencias — guarda (fusiona) la personalización. */
router.put('/preferencias', requireAuth, (req, res) => {
  const db = getDb();
  const cambios = limpiarPreferencias(req.body);
  if (Object.keys(cambios).length === 0) {
    return res.status(400).json({ error: 'No hay preferencias válidas para guardar' });
  }

  try {
    const fila = db
      .prepare('SELECT preferences_json FROM user_preferences WHERE user_id = ?')
      .get(req.user.id);
    const actuales = fila?.preferences_json ? JSON.parse(fila.preferences_json) : {};
    const guardadas = { ...actuales, ...cambios };

    db.prepare(
      `INSERT INTO user_preferences (user_id, preferences_json, actualizado_en)
       VALUES (?, ?, datetime('now'))
       ON CONFLICT(user_id) DO UPDATE SET
         preferences_json = excluded.preferences_json,
         actualizado_en = excluded.actualizado_en`,
    ).run(req.user.id, JSON.stringify(guardadas));

    registrarAuditoria(req.user.correo, 'guardar_carta_preferencias', Object.keys(cambios), req.ip);
    return res.json({ preferencias: guardadas });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/** GET /api/carta/platos — platos de la carta del usuario autenticado. */
router.get('/platos', requireAuth, (req, res) => {
  const platos = getDb()
    .prepare(
      `SELECT c.id, c.receta_id, c.precio, c.categoria, c.alergenos, c.composicion,
              c.activo, c.orden, c.creado_en, c.actualizado_en,
              r.titulo, r.imagen_url, r.origen, r.alergenos AS alergenos_receta
       FROM carta_platos c
       JOIN recipes r ON r.id = c.receta_id
       WHERE c.user_id = ?
       ORDER BY c.orden, c.id`,
    )
    .all(req.user.id);

  return res.json({
    platos: platos.map((p) => ({
      ...p,
      alergenos: JSON.parse(p.alergenos || '[]'),
      alergenos_receta: JSON.parse(p.alergenos_receta || '[]'),
    })),
  });
});

/** Construye la composición visible por defecto a partir de los ingredientes. */
function composicionDesdeReceta(db, recetaId) {
  const filas = db
    .prepare(
      'SELECT nombre, cantidad, unidad FROM recipe_ingredients WHERE recipe_id = ? ORDER BY orden, id',
    )
    .all(recetaId);
  return filas
    .map((i) => (i.cantidad ? `${i.nombre} ${i.cantidad}${i.unidad ? ` ${i.unidad}` : ''}` : i.nombre))
    .join(', ');
}

/** POST /api/carta/platos — agrega una receta propia a la carta. */
router.post('/platos', requireAuth, (req, res) => {
  const db = getDb();
  const { receta_id, precio = 0, categoria = null, alergenos, composicion } = req.body || {};
  const recetaId = Number(receta_id);

  if (!recetaId) return res.status(400).json({ error: 'receta_id es obligatorio' });
  if (typeof precio !== 'number' || precio < 0) {
    return res.status(400).json({ error: 'precio debe ser un número mayor o igual a 0' });
  }

  // Debe ser una receta propia activa (rol chef: sus recetas; admin: cualquiera).
  const receta = db
    .prepare("SELECT * FROM recipes WHERE id = ? AND estado = 'activa'")
    .get(recetaId);
  if (!receta) return res.status(404).json({ error: 'Receta no encontrada' });
  if (req.user.rol !== 'admin' && receta.user_id !== req.user.id) {
    return res.status(403).json({ error: 'Solo puedes agregar tus propias recetas' });
  }

  const duplicado = db
    .prepare('SELECT id FROM carta_platos WHERE user_id = ? AND receta_id = ?')
    .get(req.user.id, recetaId);
  if (duplicado) {
    return res.status(409).json({ error: 'Esta receta ya está en tu carta' });
  }

  try {
    // Alérgenos: si no se envían, se precargan desde la receta (editables después).
    const listaAlergenos = Array.isArray(alergenos)
      ? alergenos.map(String)
      : JSON.parse(receta.alergenos || '[]');
    const visible = composicion || composicionDesdeReceta(db, recetaId) || null;

    const info = db
      .prepare(
        `INSERT INTO carta_platos (user_id, receta_id, precio, categoria, alergenos, composicion)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(
        req.user.id,
        recetaId,
        precio,
        categoria ? String(categoria).slice(0, 60) : null,
        JSON.stringify(listaAlergenos),
        visible,
      );

    registrarAuditoria(req.user.correo, 'agregar_plato_carta', { recetaId }, req.ip);
    const plato = db
      .prepare('SELECT * FROM carta_platos WHERE id = ?')
      .get(info.lastInsertRowid);
    return res.status(201).json({
      plato: { ...plato, alergenos: JSON.parse(plato.alergenos || '[]') },
    });
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) {
      return res.status(409).json({ error: 'Esta receta ya está en tu carta' });
    }
    return res.status(500).json({ error: err.message });
  }
});

/** PUT /api/carta/platos/:id — edita precio, categoría, alérgenos o composición. */
router.put('/platos/:id', requireAuth, (req, res) => {
  const db = getDb();
  const plato = db.prepare('SELECT * FROM carta_platos WHERE id = ?').get(req.params.id);
  if (!plato) return res.status(404).json({ error: 'Plato no encontrado' });
  if (plato.user_id !== req.user.id && req.user.rol !== 'admin') {
    return res.status(403).json({ error: 'No tienes permiso para editar este plato' });
  }

  const { precio, categoria, alergenos, composicion, activo, orden } = req.body || {};
  const cambios = [];
  const params = [];

  if (precio !== undefined) {
    if (typeof precio !== 'number' || precio < 0) {
      return res.status(400).json({ error: 'precio debe ser un número mayor o igual a 0' });
    }
    cambios.push('precio = ?');
    params.push(precio);
  }
  if (categoria !== undefined) {
    cambios.push('categoria = ?');
    params.push(categoria ? String(categoria).slice(0, 60) : null);
  }
  if (alergenos !== undefined) {
    if (!Array.isArray(alergenos)) {
      return res.status(400).json({ error: 'alergenos debe ser una lista' });
    }
    cambios.push('alergenos = ?');
    params.push(JSON.stringify(alergenos.map(String)));
  }
  if (composicion !== undefined) {
    cambios.push('composicion = ?');
    params.push(composicion === null ? null : String(composicion).slice(0, 2000));
  }
  if (activo !== undefined) {
    cambios.push('activo = ?');
    params.push(activo ? 1 : 0);
  }
  if (orden !== undefined) {
    cambios.push('orden = ?');
    params.push(Math.max(0, Number(orden) || 0));
  }
  if (cambios.length === 0) {
    return res.status(400).json({ error: 'No hay cambios para aplicar' });
  }

  cambios.push("actualizado_en = datetime('now')");
  params.push(plato.id);
  db.prepare(`UPDATE carta_platos SET ${cambios.join(', ')} WHERE id = ?`).run(...params);

  registrarAuditoria(req.user.correo, 'editar_plato_carta', { platoId: plato.id }, req.ip);
  const actualizado = db.prepare('SELECT * FROM carta_platos WHERE id = ?').get(plato.id);
  return res.json({
    plato: { ...actualizado, alergenos: JSON.parse(actualizado.alergenos || '[]') },
  });
});

/** DELETE /api/carta/platos/:id — quita el plato de la carta. */
router.delete('/platos/:id', requireAuth, (req, res) => {
  const db = getDb();
  const plato = db.prepare('SELECT * FROM carta_platos WHERE id = ?').get(req.params.id);
  if (!plato) return res.status(404).json({ error: 'Plato no encontrado' });
  if (plato.user_id !== req.user.id && req.user.rol !== 'admin') {
    return res.status(403).json({ error: 'No tienes permiso para eliminar este plato' });
  }

  db.prepare('DELETE FROM carta_platos WHERE id = ?').run(plato.id);
  registrarAuditoria(req.user.correo, 'eliminar_plato_carta', { platoId: plato.id }, req.ip);
  return res.json({ mensaje: 'Plato eliminado de la carta', id: plato.id });
});

/** GET /api/carta/publica/:user_id — carta digital pública (la que abre el QR). */
router.get('/publica/:user_id', opcionalAuth, (req, res) => {
  const db = getDb();
  const userId = Number(req.params.user_id);
  if (!userId) return res.status(400).json({ error: 'Identificador inválido' });

  const usuario = db
    .prepare('SELECT id, nombre FROM users WHERE id = ? AND estado = ?')
    .get(userId, 'activo');
  if (!usuario) return res.status(404).json({ error: 'Carta no encontrada' });

  // Nombre del restaurante: el de la personalización o el del usuario.
  let prefs = {};
  const fila = db
    .prepare('SELECT preferences_json FROM user_preferences WHERE user_id = ?')
    .get(userId);
  try {
    prefs = fila?.preferences_json ? JSON.parse(fila.preferences_json) : {};
  } catch {
    prefs = {};
  }

  const conPrecio = req.query.con_precio !== '0' && prefs.version !== 'sin_precio';
  const excluir = String(req.query.excluir_alergenos || '')
    .split(',')
    .map((a) => a.trim().toLowerCase())
    .filter(Boolean);

  let platos = db
    .prepare(
      `SELECT c.id, c.precio, c.categoria, c.alergenos, c.composicion, c.orden,
              r.titulo, r.descripcion, r.imagen_url, r.tiempo_min, r.dificultad, r.porciones
       FROM carta_platos c
       JOIN recipes r ON r.id = c.receta_id
       WHERE c.user_id = ? AND c.activo = 1 AND r.estado = 'activa'
       ORDER BY c.orden, c.id`,
    )
    .all(userId)
    .map((p) => ({
      ...p,
      alergenos: JSON.parse(p.alergenos || '[]'),
      precio: conPrecio ? p.precio : null,
    }));

  // Filtro del comensal: oculta platos que contengan cualquiera de los alérgenos indicados.
  if (excluir.length > 0) {
    platos = platos.filter(
      (p) => !p.alergenos.some((a) => excluir.includes(String(a).toLowerCase())),
    );
  }

  return res.json({
    restaurante: prefs.nombre_establecimiento || usuario.nombre,
    preferencias: prefs,
    version: conPrecio ? 'con_precio' : 'sin_precio',
    platos,
  });
});

export default router;
