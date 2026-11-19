import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { createHash, randomBytes, randomInt } from 'node:crypto';
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
const CODIGO_2FA_TTL_MIN = 5; // vigencia del código de verificación en dos pasos
// Origen público de la app: se usa para los enlaces de un clic del correo
const URL_APP = process.env.APP_URL || 'http://localhost:5173';

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
    dos_factores: Number(row.dos_factores) === 1,
    creado_en: row.creado_en || null,
  };
}

/** Hash SHA-256 del código (nunca se guarda el código en claro). */
const hashCodigo = (codigo) => createHash('sha256').update(String(codigo)).digest('hex');

/**
 * Genera y guarda (en hash) un código de verificación en dos pasos.
 * Un código vigente por correo y uso: pedir otro invalida al anterior.
 * @returns {string} código de 6 dígitos
 */
function crearCodigo2fa(db, correo, uso) {
  const codigo = String(randomInt(100000, 1000000));
  const expira = new Date(Date.now() + CODIGO_2FA_TTL_MIN * 60_000).toISOString();
  db.prepare('DELETE FROM two_factor WHERE correo = ? AND uso = ?').run(correo, uso);
  db.prepare(
    'INSERT INTO two_factor (correo, codigo_hash, uso, expira_en) VALUES (?, ?, ?, ?)',
  ).run(correo, hashCodigo(codigo), uso, expira);
  return codigo;
}

/**
 * Valida un código de 2FA. Incrementa intentos y borra el código agotado.
 * @returns {{ok: true} | {ok: false, status: number, error: string}}
 */
function validarCodigo2fa(db, correo, codigo, uso) {
  const registro = db
    .prepare('SELECT * FROM two_factor WHERE correo = ? AND uso = ? ORDER BY creado_en DESC LIMIT 1')
    .get(correo, uso);

  if (!registro) return { ok: false, status: 400, error: 'Solicita un código nuevo' };
  if (registro.intentos >= 5) {
    db.prepare('DELETE FROM two_factor WHERE id = ?').run(registro.id);
    return { ok: false, status: 429, error: 'Demasiados intentos: pide un código nuevo' };
  }
  if (new Date(registro.expira_en) < new Date()) {
    db.prepare('DELETE FROM two_factor WHERE id = ?').run(registro.id);
    return { ok: false, status: 400, error: 'El código expiró: pide uno nuevo' };
  }
  if (registro.codigo_hash !== hashCodigo(codigo)) {
    db.prepare('UPDATE two_factor SET intentos = intentos + 1 WHERE id = ?').run(registro.id);
    return { ok: false, status: 400, error: 'El código no es correcto' };
  }

  db.prepare('DELETE FROM two_factor WHERE id = ?').run(registro.id);
  return { ok: true };
}

/** POST /api/auth/registro — crea la cuenta y devuelve el token.
 *  Exige las autorizaciones de la Ley 1581 de 2012 (tratamiento de datos /
 *  hábeas data) y de cookies; quedan archivadas junto con la cuenta. */
router.post('/registro', (req, res) => {
  const { nombre, correo, contrasena, aceptaTratamiento, aceptaCookies } = req.body || {};

  if (!nombre || typeof nombre !== 'string' || nombre.trim().length < 2) {
    return res.status(400).json({ error: 'El nombre debe tener al menos 2 caracteres' });
  }
  if (!correo || typeof correo !== 'string' || !EMAIL_RE.test(correo.trim())) {
    return res.status(400).json({ error: 'Correo electrónico inválido' });
  }
  if (!contrasena || typeof contrasena !== 'string' || contrasena.length < 8) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
  }
  if (aceptaTratamiento !== true) {
    return res.status(400).json({
      error:
        'Debes autorizar el tratamiento de tus datos personales (Ley 1581 de 2012 / hábeas data)',
    });
  }
  if (aceptaCookies !== true) {
    return res.status(400).json({ error: 'Debes aceptar las cookies y los términos del servicio' });
  }

  const db = getDb();
  const correoLimpio = correo.trim().toLowerCase();

  if (db.prepare('SELECT id FROM users WHERE correo = ?').get(correoLimpio)) {
    return res.status(409).json({ error: 'Ya existe una cuenta con ese correo' });
  }

  const hash = bcrypt.hashSync(contrasena, SALT_RONDS);
  const resultado = db
    .prepare(
      `INSERT INTO users (nombre, correo, contrasena_hash, consentimiento_datos,
                          consentimiento_cookies, consentimiento_en)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`,
    )
    .run(nombre.trim(), correoLimpio, hash, 1, 1);

  const usuario = {
    id: Number(resultado.lastInsertRowid),
    nombre: nombre.trim(),
    correo: correoLimpio,
    rol: 'usuario',
    avatar: 'fa-user',
    avatar_imagen: null,
    color_perfil: null,
    bio: '',
    dos_factores: false,
    creado_en: null,
  };

  // Preferencias por defecto del usuario (tema/modo/a11y en servidor)
  db.prepare('INSERT OR IGNORE INTO user_preferences (user_id) VALUES (?)').run(usuario.id);

  registrarAuditoria(correoLimpio, 'registro', null, req.ip);
  return res.status(201).json({ token: firmarToken(usuario), usuario });
});

/** POST /api/auth/login — verifica credenciales y devuelve el token.
 *  Con 2FA activo responde { requiere2fa: true } hasta validar el código. */
router.post('/login', async (req, res) => {
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

  // Verificación en dos pasos (2FA): si la cuenta la tiene activa, antes del
  // token se envía un código de 6 dígitos al correo (vence en 5 minutos).
  if (Number(fila.dos_factores) === 1) {
    const codigo = crearCodigo2fa(db, correoLimpio, 'login');
    const resultado = await enviarCodigoCorreo(correoLimpio, codigo, '2fa', {
      nombre: fila.nombre,
    });
    registrarAuditoria(correoLimpio, 'login_pendiente_2fa', null, req.ip);
    // En desarrollo se muestra el código (igual que en la recuperación);
    // en producción jamás se devuelve.
    const dev = process.env.NODE_ENV !== 'production' ? codigo : null;
    return res.json({
      ok: true,
      requiere2fa: true,
      correo: correoLimpio,
      demo: resultado.demo,
      mensaje: 'Enviamos un código de verificación a tu correo.',
      ...(dev ? { codigo: dev } : {}),
    });
  }

  const usuario = usuarioPublico(fila);
  registrarAuditoria(correoLimpio, 'login', null, req.ip);
  return res.json({ token: firmarToken(usuario), usuario });
});

/**
 * POST /api/auth/verificar-2fa — valida el código del correo y completa el
 * login (devuelve el token). { correo, codigo }
 */
router.post('/verificar-2fa', (req, res) => {
  const { correo, codigo } = req.body || {};
  if (!correo || !EMAIL_RE.test(String(correo).trim())) {
    return res.status(400).json({ error: 'Correo electrónico inválido' });
  }
  if (!codigo || !/^\d{6}$/.test(String(codigo))) {
    return res.status(400).json({ error: 'El código debe tener 6 dígitos' });
  }

  const correoLimpio = String(correo).trim().toLowerCase();
  const db = getDb();
  const fila = db.prepare('SELECT * FROM users WHERE correo = ?').get(correoLimpio);
  if (!fila || fila.estado !== 'activo' || Number(fila.dos_factores) !== 1) {
    return res.status(400).json({ error: 'Solicita un código nuevo' });
  }

  const comprobacion = validarCodigo2fa(db, correoLimpio, String(codigo), 'login');
  if (!comprobacion.ok) {
    return res.status(comprobacion.status).json({ error: comprobacion.error });
  }

  const usuario = usuarioPublico(fila);
  registrarAuditoria(correoLimpio, 'login_2fa', null, req.ip);
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
 * Siempre responde ok (no revela si el correo existe). El correo enviado
 * lleva el **código de 6 dígitos** y un **enlace de un clic** (token).
 * En modo demo (sin SMTP/Resend y fuera de producción) devuelve el código
 * para poder probar el flujo completo en desarrollo.
 */
router.post('/olvide-contrasena', async (req, res) => {
  const { correo } = req.body || {};
  if (!correo || !EMAIL_RE.test(String(correo).trim())) {
    return res.status(400).json({ error: 'Correo electrónico inválido' });
  }

  const correoLimpio = String(correo).trim().toLowerCase();
  const db = getDb();
  const usuario = db.prepare('SELECT id, nombre FROM users WHERE correo = ?').get(correoLimpio);

  let demo = false;
  let codigoDev = null;
  let enlaceDev = null;

  if (usuario) {
    const codigo = String(randomInt(100000, 1000000)); // 6 dígitos
    const token = randomBytes(24).toString('hex'); // enlace de un clic
    const expira = new Date(Date.now() + CODIGO_TTL_MIN * 60_000).toISOString();

    db.prepare("DELETE FROM password_reset WHERE correo = ? AND proposito = 'recuperacion'").run(
      correoLimpio,
    );
    db.prepare(
      'INSERT INTO password_reset (correo, codigo_hash, token_hash, proposito, expira_en) VALUES (?, ?, ?, ?, ?)',
    ).run(correoLimpio, hashCodigo(codigo), hashCodigo(token), 'recuperacion', expira);

    const enlace = `${URL_APP}/#/recuperar?token=${token}`;
    const resultado = await enviarCodigoCorreo(correoLimpio, codigo, 'recuperacion', {
      enlace,
      nombre: usuario.nombre,
    });
    demo = resultado.demo;
    // En desarrollo se muestran el código y el enlace aunque el envío sea real
    // (en producción nunca se devuelven).
    if (process.env.NODE_ENV !== 'production') {
      codigoDev = codigo;
      enlaceDev = enlace;
    }

    registrarAuditoria(correoLimpio, 'solicitar_recuperacion', null, req.ip);
  }

  return res.json({
    ok: true,
    mensaje: 'Si el correo existe, recibirás un código y un enlace para restablecer la clave.',
    demo,
    ...(codigoDev ? { codigo: codigoDev } : {}),
    ...(enlaceDev ? { enlace: enlaceDev } : {}),
  });
});

/**
 * POST /api/auth/restablecer-contrasena — valida el código o el token del
 * enlace y cambia la contraseña. Acepta:
 *   { correo, codigo, contrasena }  → flujo con el código de 6 dígitos
 *   { token, contrasena }           → flujo con el enlace de un clic
 */
router.post('/restablecer-contrasena', (req, res) => {
  const { correo, codigo, contrasena, token } = req.body || {};

  if (!contrasena || typeof contrasena !== 'string' || contrasena.length < 8) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
  }

  const db = getDb();

  // ── Flujo por enlace (token) ──
  if (token) {
    const registro = db
      .prepare(
        "SELECT * FROM password_reset WHERE token_hash = ? AND proposito = 'recuperacion' ORDER BY creado_en DESC LIMIT 1",
      )
      .get(hashCodigo(String(token)));

    if (!registro) {
      return res.status(400).json({ error: 'El enlace no es válido: pide uno nuevo' });
    }
    if (new Date(registro.expira_en) < new Date()) {
      db.prepare('DELETE FROM password_reset WHERE id = ?').run(registro.id);
      return res.status(400).json({ error: 'El enlace expiró: pide uno nuevo' });
    }

    const usuario = db.prepare('SELECT id FROM users WHERE correo = ?').get(registro.correo);
    if (!usuario) {
      return res.status(400).json({ error: 'Solicita un código nuevo' });
    }

    const hash = bcrypt.hashSync(contrasena, SALT_RONDS);
    db.prepare(
      "UPDATE users SET contrasena_hash = ?, actualizado_en = datetime('now') WHERE id = ?",
    ).run(hash, usuario.id);
    db.prepare('DELETE FROM password_reset WHERE id = ?').run(registro.id);

    registrarAuditoria(registro.correo, 'restablecer_contrasena_enlace', null, req.ip);
    return res.json({ ok: true, mensaje: 'Contraseña actualizada. Ya puedes iniciar sesión.' });
  }

  // ── Flujo por código ──
  if (!correo || !EMAIL_RE.test(String(correo).trim())) {
    return res.status(400).json({ error: 'Correo electrónico inválido' });
  }
  if (!codigo || !/^\d{6}$/.test(String(codigo))) {
    return res.status(400).json({ error: 'El código debe tener 6 dígitos' });
  }

  const correoLimpio = String(correo).trim().toLowerCase();
  const registro = db
    .prepare(
      "SELECT * FROM password_reset WHERE correo = ? AND proposito = 'recuperacion' ORDER BY creado_en DESC LIMIT 1",
    )
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
  db.prepare("DELETE FROM password_reset WHERE correo = ? AND proposito = 'recuperacion'").run(
    correoLimpio,
  );

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

/**
 * POST /api/auth/solicitar-eliminacion — envía al correo un código de
 * 6 dígitos para confirmar la eliminación definitiva de la cuenta.
 * Requiere sesión; en modo demo devuelve el código (fuera de producción).
 */
router.post('/solicitar-eliminacion', requireAuth, async (req, res) => {
  const db = getDb();
  const fila = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!fila || fila.estado !== 'activo') {
    return res.status(401).json({ error: 'Usuario no encontrado' });
  }

  const codigo = String(randomInt(100000, 1000000)); // 6 dígitos
  const expira = new Date(Date.now() + CODIGO_TTL_MIN * 60_000).toISOString();

  db.prepare("DELETE FROM password_reset WHERE correo = ? AND proposito = 'eliminacion'").run(
    fila.correo,
  );
  db.prepare(
    'INSERT INTO password_reset (correo, codigo_hash, proposito, expira_en) VALUES (?, ?, ?, ?)',
  ).run(fila.correo, hashCodigo(codigo), 'eliminacion', expira);

  const resultado = await enviarCodigoCorreo(fila.correo, codigo, 'eliminacion', {
    nombre: fila.nombre,
  });
  let codigoDev = null;
  if (process.env.NODE_ENV !== 'production') codigoDev = codigo;

  registrarAuditoria(fila.correo, 'solicitar_eliminacion', null, req.ip);
  return res.json({
    ok: true,
    mensaje: 'Te enviamos un código a tu correo para confirmar la eliminación.',
    demo: resultado.demo,
    ...(codigoDev ? { codigo: codigoDev } : {}),
  });
});

/**
 * POST /api/auth/eliminar-cuenta — elimina la cuenta y todos sus datos
 * (recetas propias, favoritos, búsquedas y preferencias) al validar el
 * código de 6 dígitos. Acción irreversible.
 */
router.post('/eliminar-cuenta', requireAuth, (req, res) => {
  const { codigo } = req.body || {};
  if (!codigo || !/^\d{6}$/.test(String(codigo))) {
    return res.status(400).json({ error: 'El código debe tener 6 dígitos' });
  }

  const db = getDb();
  const fila = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!fila || fila.estado !== 'activo') {
    return res.status(401).json({ error: 'Usuario no encontrado' });
  }

  const registro = db
    .prepare(
      "SELECT * FROM password_reset WHERE correo = ? AND proposito = 'eliminacion' ORDER BY creado_en DESC LIMIT 1",
    )
    .get(fila.correo);

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

  // Borra en orden: recipes.user_id es ON DELETE SET NULL, así que las
  // recetas propias se eliminan explícitamente; el resto cae en cascada
  // (user_preferences, favorites, search_history).
  const eliminar = db.transaction(() => {
    db.prepare('DELETE FROM recipes WHERE user_id = ?').run(fila.id);
    db.prepare('DELETE FROM password_reset WHERE correo = ?').run(fila.correo);
    db.prepare('DELETE FROM users WHERE id = ?').run(fila.id);
  });
  eliminar();

  registrarAuditoria(fila.correo, 'eliminar_cuenta', null, req.ip);
  return res.json({ ok: true, mensaje: 'Cuenta eliminada definitivamente.' });
});

/**
 * ── Verificación en dos pasos (2FA por correo) — Fase 11 ──────────────────
 * El usuario activa/desactiva con su contraseña; activar exige además
 * confirmar un código de 6 dígitos enviado a su correo.
 */

/** POST /api/auth/2fa/activar — envía el código de confirmación. */
router.post('/2fa/activar', requireAuth, async (req, res) => {
  const { contrasena } = req.body || {};
  if (!contrasena || typeof contrasena !== 'string') {
    return res.status(400).json({ error: 'Escribe tu contraseña actual' });
  }

  const db = getDb();
  const fila = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!fila || !bcrypt.compareSync(String(contrasena), fila.contrasena_hash)) {
    return res.status(401).json({ error: 'Contraseña incorrecta' });
  }
  if (Number(fila.dos_factores) === 1) {
    return res.status(400).json({ error: 'La verificación en dos pasos ya está activa' });
  }

  const codigo = crearCodigo2fa(db, fila.correo, 'activacion');
  const resultado = await enviarCodigoCorreo(fila.correo, codigo, '2fa', { nombre: fila.nombre });
  registrarAuditoria(fila.correo, '2fa_solicitar_activacion', null, req.ip);

  const dev = process.env.NODE_ENV !== 'production' ? codigo : null;
  return res.json({
    ok: true,
    demo: resultado.demo,
    mensaje: 'Enviamos un código de confirmación a tu correo.',
    ...(dev ? { codigo: dev } : {}),
  });
});

/** POST /api/auth/2fa/confirmar — valida el código y activa el 2FA. */
router.post('/2fa/confirmar', requireAuth, (req, res) => {
  const { codigo } = req.body || {};
  if (!codigo || !/^\d{6}$/.test(String(codigo))) {
    return res.status(400).json({ error: 'El código debe tener 6 dígitos' });
  }

  const db = getDb();
  const fila = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!fila) return res.status(404).json({ error: 'Usuario no encontrado' });

  const comprobacion = validarCodigo2fa(db, fila.correo, String(codigo), 'activacion');
  if (!comprobacion.ok) {
    return res.status(comprobacion.status).json({ error: comprobacion.error });
  }

  db.prepare(
    "UPDATE users SET dos_factores = 1, actualizado_en = datetime('now') WHERE id = ?",
  ).run(fila.id);
  registrarAuditoria(fila.correo, '2fa_activar', null, req.ip);
  return res.json({ ok: true, mensaje: 'Verificación en dos pasos activada.' });
});

/** POST /api/auth/2fa/desactivar — apaga el 2FA con la contraseña. */
router.post('/2fa/desactivar', requireAuth, (req, res) => {
  const { contrasena } = req.body || {};
  if (!contrasena || typeof contrasena !== 'string') {
    return res.status(400).json({ error: 'Escribe tu contraseña actual' });
  }

  const db = getDb();
  const fila = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!fila || !bcrypt.compareSync(String(contrasena), fila.contrasena_hash)) {
    return res.status(401).json({ error: 'Contraseña incorrecta' });
  }

  db.prepare(
    "UPDATE users SET dos_factores = 0, actualizado_en = datetime('now') WHERE id = ?",
  ).run(fila.id);
  db.prepare('DELETE FROM two_factor WHERE correo = ?').run(fila.correo);
  registrarAuditoria(fila.correo, '2fa_desactivar', null, req.ip);
  return res.json({ ok: true, mensaje: 'Verificación en dos pasos desactivada.' });
});

export default router;
