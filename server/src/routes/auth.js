import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { createHash, randomInt } from 'node:crypto';
import { getDb, registrarAuditoria } from '../db/database.js';
import { requireAuth, firmarToken } from '../middleware/auth.js';
import { enviarCodigoCorreo } from '../services/mailer.js';

/**
 * Autenticación (RF-01 registro, RF-02 login, RF-03 sesión) + Fase 3:
 * restablecimiento de contraseña por código de 6 dígitos al correo,
 * edición de perfil (avatar/nombre/bio) y cambio de contraseña.
 */
const router = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SALT_RONDS = 10;
const CODIGO_TTL_MIN = 15; // vigencia del código de recuperación

/** Devuelve el usuario sin el hash de contraseña. */
function usuarioPublico(row) {
  return {
    id: row.id,
    nombre: row.nombre,
    correo: row.correo,
    rol: row.rol,
    avatar: row.avatar || 'fa-user',
    avatar_imagen: row.avatar_imagen || null,
    color_perfil: row.color_perfil || null,
    bio: row.bio || '',
    creado_en: row.creado_en || null,
  };
}

/** Hash SHA-256 del código (nunca se guarda el código en claro). */
const hashCodigo = (codigo) => createHash('sha256').update(String(codigo)).digest('hex');

/** POST /api/auth/registro — crea la cuenta y devuelve el token. */
router.post('/registro', (req, res) => {
  const { nombre, correo, contrasena } = req.body || {};

  if (!nombre || typeof nombre !== 'string' || nombre.trim().length < 2) {
    return res.status(400).json({ error: 'El nombre debe tener al menos 2 caracteres' });
  }
  if (!correo || typeof correo !== 'string' || !EMAIL_RE.test(correo.trim())) {
    return res.status(400).json({ error: 'Correo electrónico inválido' });
  }
  if (!contrasena || typeof contrasena !== 'string' || contrasena.length < 8) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
  }

  const db = getDb();
  const correoLimpio = correo.trim().toLowerCase();

  if (db.prepare('SELECT id FROM users WHERE correo = ?').get(correoLimpio)) {
    return res.status(409).json({ error: 'Ya existe una cuenta con ese correo' });
  }

  const hash = bcrypt.hashSync(contrasena, SALT_RONDS);
  const resultado = db
    .prepare('INSERT INTO users (nombre, correo, contrasena_hash) VALUES (?, ?, ?)')
    .run(nombre.trim(), correoLimpio, hash);

  const usuario = {
    id: Number(resultado.lastInsertRowid),
    nombre: nombre.trim(),
    correo: correoLimpio,
    rol: 'usuario',
    avatar: 'fa-user',
    avatar_imagen: null,
    color_perfil: null,
    bio: '',
    creado_en: null,
  };

  // Preferencias por defecto del usuario (tema/modo/a11y en servidor)
  db.prepare('INSERT OR IGNORE INTO user_preferences (user_id) VALUES (?)').run(usuario.id);

  registrarAuditoria(correoLimpio, 'registro', null, req.ip);
  return res.status(201).json({ token: firmarToken(usuario), usuario });
});

/** POST /api/auth/login — verifica credenciales y devuelve el token. */
router.post('/login', (req, res) => {
  const { correo, contrasena } = req.body || {};

  if (!correo || !contrasena) {
    return res.status(400).json({ error: 'Correo y contraseña son obligatorios' });
  }

  const db = getDb();
  const correoLimpio = String(correo).trim().toLowerCase();
  const fila = db.prepare('SELECT * FROM users WHERE correo = ?').get(correoLimpio);

  // Mismo mensaje para usuario inexistente o contraseña incorrecta (no filtrar)
  if (!fila || !bcrypt.compareSync(String(contrasena), fila.contrasena_hash)) {
    return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
  }
  if (fila.estado !== 'activo') {
    return res.status(403).json({ error: 'La cuenta está desactivada' });
  }

  const usuario = usuarioPublico(fila);
  registrarAuditoria(correoLimpio, 'login', null, req.ip);
  return res.json({ token: firmarToken(usuario), usuario });
});

/** GET /api/auth/me — perfil del token actual (protegido). */
router.get('/me', requireAuth, (req, res) => {
  const fila = getDb().prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!fila || fila.estado !== 'activo') {
    return res.status(401).json({ error: 'Usuario no encontrado' });
  }
  return res.json({ usuario: usuarioPublico(fila) });
});

/**
 * POST /api/auth/olvide-contrasena — pide el código de recuperación.
 * Siempre responde ok (no revela si el correo existe). En modo demo
 * (sin RESEND_API_KEY y fuera de producción) devuelve el código para
 * poder probar el flujo completo en desarrollo.
 */
router.post('/olvide-contrasena', async (req, res) => {
  const { correo } = req.body || {};
  if (!correo || !EMAIL_RE.test(String(correo).trim())) {
    return res.status(400).json({ error: 'Correo electrónico inválido' });
  }

  const correoLimpio = String(correo).trim().toLowerCase();
  const db = getDb();
  const usuario = db.prepare('SELECT id FROM users WHERE correo = ?').get(correoLimpio);

  let demo = false;
  let codigoDev = null;

  if (usuario) {
    const codigo = String(randomInt(100000, 1000000)); // 6 dígitos
    const expira = new Date(Date.now() + CODIGO_TTL_MIN * 60_000).toISOString();

    db.prepare('DELETE FROM password_reset WHERE correo = ?').run(correoLimpio);
    db.prepare('INSERT INTO password_reset (correo, codigo_hash, expira_en) VALUES (?, ?, ?)').run(
      correoLimpio,
      hashCodigo(codigo),
      expira,
    );

    const resultado = await enviarCodigoCorreo(correoLimpio, codigo);
    demo = resultado.demo;
    // Solo en desarrollo se devuelve el código para verlo en pantalla
    if (demo && process.env.NODE_ENV !== 'production') codigoDev = codigo;

    registrarAuditoria(correoLimpio, 'solicitar_recuperacion', null, req.ip);
  }

  return res.json({
    ok: true,
    mensaje: 'Si el correo existe, recibirás un código con instrucciones.',
    demo,
    ...(codigoDev ? { codigo: codigoDev } : {}),
  });
});

/** POST /api/auth/restablecer-contrasena — valida el código y cambia la clave. */
router.post('/restablecer-contrasena', (req, res) => {
  const { correo, codigo, contrasena } = req.body || {};

  if (!correo || !EMAIL_RE.test(String(correo).trim())) {
    return res.status(400).json({ error: 'Correo electrónico inválido' });
  }
  if (!codigo || !/^\d{6}$/.test(String(codigo))) {
    return res.status(400).json({ error: 'El código debe tener 6 dígitos' });
  }
  if (!contrasena || typeof contrasena !== 'string' || contrasena.length < 8) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
  }

  const correoLimpio = String(correo).trim().toLowerCase();
  const db = getDb();
  const registro = db
    .prepare('SELECT * FROM password_reset WHERE correo = ? ORDER BY creado_en DESC LIMIT 1')
    .get(correoLimpio);

  if (!registro) {
    return res.status(400).json({ error: 'Solicita un código nuevo' });
  }
  if (registro.intentos >= 5) {
    db.prepare('DELETE FROM password_reset WHERE id = ?').run(registro.id);
    return res.status(429).json({ error: 'Demasiados intentos: pide un código nuevo' });
  }
  if (new Date(registro.expira_en) < new Date()) {
    db.prepare('DELETE FROM password_reset WHERE id = ?').run(registro.id);
    return res.status(400).json({ error: 'El código expiró: pide uno nuevo' });
  }
  if (registro.codigo_hash !== hashCodigo(codigo)) {
    db.prepare('UPDATE password_reset SET intentos = intentos + 1 WHERE id = ?').run(registro.id);
    return res.status(400).json({ error: 'Código incorrecto' });
  }

  const usuario = db.prepare('SELECT id FROM users WHERE correo = ?').get(correoLimpio);
  if (!usuario) {
    return res.status(400).json({ error: 'Solicita un código nuevo' });
  }

  const hash = bcrypt.hashSync(contrasena, SALT_RONDS);
  db.prepare(
    "UPDATE users SET contrasena_hash = ?, actualizado_en = datetime('now') WHERE id = ?",
  ).run(hash, usuario.id);
  db.prepare('DELETE FROM password_reset WHERE correo = ?').run(correoLimpio);

  registrarAuditoria(correoLimpio, 'restablecer_contrasena', null, req.ip);
  return res.json({ ok: true, mensaje: 'Contraseña actualizada. Ya puedes iniciar sesión.' });
});

/** PUT /api/auth/perfil — personaliza nombre, avatar, foto, color y bio. */
router.put('/perfil', requireAuth, (req, res) => {
  const { nombre, avatar, avatar_imagen, color_perfil, bio } = req.body || {};
  const db = getDb();
  const fila = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!fila) return res.status(404).json({ error: 'Usuario no encontrado' });

  if (nombre !== undefined && (!nombre || String(nombre).trim().length < 2)) {
    return res.status(400).json({ error: 'El nombre debe tener al menos 2 caracteres' });
  }
  if (avatar !== undefined && avatar !== null && !/^[a-z0-9-]{1,40}$/i.test(String(avatar))) {
    return res.status(400).json({ error: 'Avatar inválido' });
  }
  // Foto: data URL JPEG/PNG recortada en el navegador (máx. ~700 KB)
  if (avatar_imagen !== undefined && avatar_imagen !== null) {
    if (!/^data:image\/(jpeg|png|webp);base64,/.test(String(avatar_imagen))) {
      return res.status(400).json({ error: 'La foto debe ser una imagen (data URL)' });
    }
    if (String(avatar_imagen).length > 700_000) {
      return res.status(400).json({ error: 'La foto es demasiado grande (máx. ~500 KB)' });
    }
  }
  if (
    color_perfil !== undefined &&
    color_perfil !== null &&
    !/^#[0-9a-f]{6}$/i.test(String(color_perfil))
  ) {
    return res.status(400).json({ error: 'Color inválido (usa el formato #rrggbb)' });
  }
  if (bio !== undefined && String(bio).length > 200) {
    return res.status(400).json({ error: 'La bio no puede pasar de 200 caracteres' });
  }

  db.prepare(
    `UPDATE users SET
       nombre = COALESCE(?, nombre),
       avatar = COALESCE(?, avatar),
       avatar_imagen = ?,
       color_perfil = ?,
       bio = COALESCE(?, bio),
       actualizado_en = datetime('now')
     WHERE id = ?`,
  ).run(
    nombre !== undefined ? String(nombre).trim() : null,
    avatar !== undefined && avatar !== null ? String(avatar) : null,
    avatar_imagen !== undefined
      ? avatar_imagen !== null
        ? String(avatar_imagen)
        : null
      : fila.avatar_imagen,
    color_perfil !== undefined
      ? color_perfil !== null
        ? String(color_perfil)
        : null
      : fila.color_perfil,
    bio !== undefined ? String(bio).trim() : null,
    fila.id,
  );

  registrarAuditoria(fila.correo, 'editar_perfil', null, req.ip);
  const actualizado = db.prepare('SELECT * FROM users WHERE id = ?').get(fila.id);
  return res.json({ usuario: usuarioPublico(actualizado) });
});

/** POST /api/auth/cambiar-contrasena — con la contraseña actual (desde el perfil). */
router.post('/cambiar-contrasena', requireAuth, (req, res) => {
  const { actual, nueva } = req.body || {};
  if (!actual || !nueva || String(nueva).length < 8) {
    return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 8 caracteres' });
  }

  const db = getDb();
  const fila = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!fila || !bcrypt.compareSync(String(actual), fila.contrasena_hash)) {
    return res.status(401).json({ error: 'La contraseña actual no coincide' });
  }

  db.prepare(
    "UPDATE users SET contrasena_hash = ?, actualizado_en = datetime('now') WHERE id = ?",
  ).run(bcrypt.hashSync(String(nueva), SALT_RONDS), fila.id);

  registrarAuditoria(fila.correo, 'cambiar_contrasena', null, req.ip);
  return res.json({ ok: true, mensaje: 'Contraseña actualizada.' });
});

export default router;
