import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { getDb, registrarAuditoria } from '../db/database.js';
import { requireRole } from '../middleware/auth.js';

/**
 * Panel de administración de usuarios (RF-22 + RF-02 — Fase 9).
 *
 * - GET    /api/admin/usuarios        lista cuentas (rol, estado, recetas)
 * - POST   /api/admin/usuarios        crea una cuenta con el rol elegido
 * - PATCH  /api/admin/usuarios/:id    cambia rol y/o estado (inactivar)
 *
 * Todo exige sesión de administrador: 401 sin sesión, 403 sin el rol.
 * Además se revalida el rol contra la base de datos en cada petición:
 * si el JWT fue emitido antes de degradar al admin, deja de servir.
 */
const router = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SALT_RONDS = 10;
const ROLES = ['admin', 'usuario'];
const ESTADOS = ['activo', 'inactivo'];

/** requireRole('admin') + revalidación del rol/estado en la BD. */
function soloAdmin(req, res, next) {
  requireRole('admin')(req, res, () => {
    const fila = getDb().prepare('SELECT rol, estado FROM users WHERE id = ?').get(req.user.id);
    if (!fila || fila.rol !== 'admin' || fila.estado !== 'activo') {
      return res.status(403).json({ error: 'No tienes permiso para esta acción' });
    }
    return next();
  });
}

router.use(soloAdmin);

/** GET /api/admin/usuarios — listado de cuentas con su actividad. */
router.get('/usuarios', (_req, res) => {
  const usuarios = getDb()
    .prepare(
      `SELECT u.id, u.nombre, u.correo, u.rol, u.estado, u.creado_en,
              (SELECT COUNT(*) FROM recipes r
                WHERE r.user_id = u.id AND r.estado = 'activa') AS recetas
         FROM users u
        ORDER BY u.creado_en DESC, u.id DESC`,
    )
    .all();
  res.json({ usuarios });
});

/** POST /api/admin/usuarios — crea una cuenta con rol elegido (RF-22 «crear»). */
router.post('/usuarios', (req, res) => {
  const { nombre, correo, contrasena, rol = 'usuario' } = req.body || {};

  if (!nombre || typeof nombre !== 'string' || nombre.trim().length < 2) {
    return res.status(400).json({ error: 'El nombre debe tener al menos 2 caracteres' });
  }
  if (!correo || typeof correo !== 'string' || !EMAIL_RE.test(correo.trim())) {
    return res.status(400).json({ error: 'Correo electrónico inválido' });
  }
  if (!contrasena || typeof contrasena !== 'string' || contrasena.length < 8) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
  }
  if (!ROLES.includes(rol)) {
    return res.status(400).json({ error: 'Rol no válido (admin o usuario)' });
  }

  const db = getDb();
  const correoLimpio = correo.trim().toLowerCase();
  if (db.prepare('SELECT id FROM users WHERE correo = ?').get(correoLimpio)) {
    return res.status(409).json({ error: 'Ya existe una cuenta con ese correo' });
  }

  const hash = bcrypt.hashSync(contrasena, SALT_RONDS);
  const r = db
    .prepare('INSERT INTO users (nombre, correo, contrasena_hash, rol) VALUES (?, ?, ?, ?)')
    .run(nombre.trim(), correoLimpio, hash, rol);
  const id = Number(r.lastInsertRowid);
  db.prepare('INSERT OR IGNORE INTO user_preferences (user_id) VALUES (?)').run(id);

  registrarAuditoria(
    req.user.correo,
    'admin_crear_usuario',
    { id, correo: correoLimpio, rol },
    req.ip,
  );
  return res.status(201).json({
    usuario: { id, nombre: nombre.trim(), correo: correoLimpio, rol, estado: 'activo', recetas: 0 },
  });
});

/** PATCH /api/admin/usuarios/:id — cambia rol y/o estado (RF-22 «modificar/inactivar»). */
router.patch('/usuarios/:id', (req, res) => {
  const id = Number(req.params.id);
  const { rol, estado } = req.body || {};

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Identificador de usuario no válido' });
  }
  if (rol === undefined && estado === undefined) {
    return res.status(400).json({ error: 'Indica el rol o el estado a cambiar' });
  }
  if (rol !== undefined && !ROLES.includes(rol)) {
    return res.status(400).json({ error: 'Rol no válido (admin o usuario)' });
  }
  if (estado !== undefined && !ESTADOS.includes(estado)) {
    return res.status(400).json({ error: 'Estado no válido (activo o inactivo)' });
  }

  const db = getDb();
  const usuario = db.prepare('SELECT id, rol, estado FROM users WHERE id = ?').get(id);
  if (!usuario) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }

  // Protección de la propia sesión: no auto-degradarse ni auto-desactivarse.
  // Al prohibir tocar la cuenta propia, siempre queda al menos un
  // administrador activo en el sistema.
  if (id === req.user.id && ((rol && rol !== 'admin') || estado === 'inactivo')) {
    return res.status(400).json({ error: 'No puedes cambiar tu propia cuenta así' });
  }

  const cambios = {};
  if (rol !== undefined && rol !== usuario.rol) cambios.rol = rol;
  if (estado !== undefined && estado !== usuario.estado) cambios.estado = estado;
  if (Object.keys(cambios).length === 0) {
    return res.json({ usuario, mensaje: 'Sin cambios' });
  }

  db.prepare(
    `UPDATE users
        SET rol = COALESCE(?, rol),
            estado = COALESCE(?, estado),
            actualizado_en = datetime('now')
      WHERE id = ?`,
  ).run(rol ?? null, estado ?? null, id);

  const actualizado = db
    .prepare('SELECT id, nombre, correo, rol, estado FROM users WHERE id = ?')
    .get(id);

  // Una cuenta desactivada pierde sus APIs de inmediato (requireAuth revalida)
  registrarAuditoria(req.user.correo, 'admin_cambiar_usuario', { id, ...cambios }, req.ip);
  return res.json({ usuario: actualizado, cambios });
});

export default router;
