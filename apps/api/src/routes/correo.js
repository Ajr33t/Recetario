import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { enviarCodigoCorreo } from '../services/mailer.js';
import { leerConfigCorreo, guardarConfigCorreo, PROVEEDORES } from '../services/correoConfig.js';
import { registrarAuditoria } from '../db/database.js';

/**
 * Correo de recuperación (Fase 10).
 *
 * - GET  /api/correo/estado      → configuración actual y proveedores
 * - POST /api/correo/configurar  → guarda la configuración (solo admin)
 * - POST /api/correo/prueba      → envía un correo de prueba al usuario
 *
 * Configurando **una vez** el proveedor, todos los usuarios reciben su
 * correo de recuperación automáticamente.
 */
const router = Router();

/** GET /api/correo/estado — visible en Ajustes. */
router.get('/estado', (_req, res) => {
  res.json({ ...leerConfigCorreo(), proveedores: PROVEEDORES });
});

/** POST /api/correo/configurar — solo administradores. */
router.post('/configurar', requireRole('admin'), (req, res) => {
  const { proveedor, host, puerto, usuario, clave, desde, seguro } = req.body || {};
  if (!PROVEEDORES[proveedor]) {
    return res.status(400).json({ error: 'Proveedor no válido' });
  }
  if (proveedor !== 'resend' && !String(host || PROVEEDORES[proveedor].host).trim()) {
    return res.status(400).json({ error: 'Escribe el host del servidor SMTP' });
  }
  if (proveedor !== 'resend' && !String(usuario || '').trim()) {
    return res.status(400).json({ error: 'Escribe el usuario del correo' });
  }
  if (!String(clave || '').trim()) {
    return res.status(400).json({ error: 'Falta la contraseña o la clave API' });
  }

  const config = guardarConfigCorreo({
    proveedor,
    host,
    puerto,
    usuario,
    clave,
    desde,
    seguro,
  });
  registrarAuditoria(req.user.correo, 'configurar_correo', { proveedor }, req.ip);
  return res.json({ ok: true, config });
});

/** POST /api/correo/prueba — envía un correo de prueba al usuario conectado. */
router.post('/prueba', requireAuth, async (req, res) => {
  const destino = String(req.body?.correo || req.user.correo).trim();
  const codigo = String(Math.floor(100000 + Math.random() * 900000));
  const enlace = `${process.env.APP_URL || 'http://localhost:5173'}/#/recuperar?token=prueba`;

  const resultado = await enviarCodigoCorreo(destino, codigo, 'recuperacion', { enlace });
  return res.json({
    ok: true,
    enviado: !resultado.demo,
    transporte: resultado.transporte,
    destino,
    mensaje: resultado.demo
      ? 'Modo demo: configura un proveedor de correo para que el mensaje salga de verdad.'
      : `Correo enviado a ${destino} por ${resultado.transporte.toUpperCase()}.`,
  });
});

export default router;
