import { Router } from 'express';
import { getDb, registrarAuditoria } from '../db/database.js';
import { requireAuth } from '../middleware/auth.js';
import { importarExterna } from './recipes.js';

/**
 * Favoritos (RF-09 — Fase 5).
 * - `GET /` lista las recetas favoritas del usuario.
 * - `POST /:id` alterna el favorito de una receta ya existente (propias o públicas).
 * - `POST /externa` guarda una receta de TheMealDB: se importa a la
 *   colección del usuario (origen "sugerida") y se marca favorita.
 * - `GET /estado?externo_id=` indica si una receta externa ya fue guardada.
 */
const router = Router();
router.use(requireAuth);

/** GET /api/favorites — recetas favoritas del usuario. */
router.get('/', (req, res) => {
  const filas = getDb()
    .prepare(
      `SELECT r.id, r.titulo, r.imagen_url, r.tiempo_min, r.dificultad, r.porciones,
              r.origen, r.externo_id, r.etiquetas, r.visibilidad,
              f.creado_en AS favorito_desde
       FROM favorites f
       JOIN recipes r ON r.id = f.recipe_id
       WHERE f.user_id = ? AND r.estado = 'activa'
       ORDER BY f.creado_en DESC`,
    )
    .all(req.user.id);
  return res.json({
    favoritos: filas.map((f) => ({ ...f, etiquetas: JSON.parse(f.etiquetas || '[]') })),
  });
});

/** GET /api/favorites/estado?externo_id=52772 — ¿ya está guardada? */
router.get('/estado', (req, res) => {
  const externoId = String(req.query.externo_id || '');
  if (!/^\d+$/.test(externoId)) {
    return res.status(400).json({ error: 'Identificador externo inválido' });
  }
  const fila = getDb()
    .prepare(
      `SELECT r.id AS receta_id, f.user_id AS favorito
       FROM recipes r
       LEFT JOIN favorites f ON f.recipe_id = r.id AND f.user_id = ?
       WHERE r.user_id = ? AND r.externo_id = ? AND r.estado = 'activa'`,
    )
    .get(req.user.id, req.user.id, externoId);
  return res.json({
    receta_id: fila?.receta_id ?? null,
    favorito: Boolean(fila?.favorito),
  });
});

/** POST /api/favorites/externa — importa una receta de TheMealDB y la marca favorita. */
router.post('/externa', async (req, res, next) => {
  try {
    const externoId = String(req.body?.externo_id || '');
    if (!/^\d+$/.test(externoId)) {
      return res.status(400).json({ error: 'Identificador externo inválido' });
    }
    const recetaId = await importarExterna(req.user.id, externoId);
    if (!recetaId) return res.status(404).json({ error: 'Receta no encontrada en TheMealDB' });

    const db = getDb();
    const yaFavorita = db
      .prepare('SELECT 1 AS x FROM favorites WHERE user_id = ? AND recipe_id = ?')
      .get(req.user.id, recetaId);
    if (!yaFavorita) {
      db.prepare('INSERT INTO favorites (user_id, recipe_id) VALUES (?, ?)').run(
        req.user.id,
        recetaId,
      );
      registrarAuditoria(req.user.correo, 'guardar_favorita_externa', { externoId }, req.ip);
    }
    return res.status(201).json({ receta_id: recetaId, favorito: true });
  } catch (err) {
    return next(err);
  }
});

/** POST /api/favorites/:id — alterna favorito de una receta existente. */
router.post('/:id', (req, res) => {
  const db = getDb();
  const receta = db
    .prepare(`SELECT id, user_id, visibilidad FROM recipes WHERE id = ? AND estado = 'activa'`)
    .get(req.params.id);
  if (!receta) return res.status(404).json({ error: 'Receta no encontrada' });
  if (receta.user_id !== req.user.id && receta.visibilidad !== 'publica') {
    return res.status(404).json({ error: 'Receta no encontrada' });
  }

  const actual = db
    .prepare('SELECT 1 AS x FROM favorites WHERE user_id = ? AND recipe_id = ?')
    .get(req.user.id, receta.id);
  if (actual) {
    db.prepare('DELETE FROM favorites WHERE user_id = ? AND recipe_id = ?').run(
      req.user.id,
      receta.id,
    );
    return res.json({ favorito: false });
  }
  db.prepare('INSERT INTO favorites (user_id, recipe_id) VALUES (?, ?)').run(
    req.user.id,
    receta.id,
  );
  registrarAuditoria(req.user.correo, 'agregar_favorita', { id: receta.id }, req.ip);
  return res.json({ favorito: true });
});

export default router;
