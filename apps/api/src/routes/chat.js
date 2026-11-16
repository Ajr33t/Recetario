import { Router } from 'express';
import { getDb, registrarAuditoria } from '../db/database.js';
import { requireAuth, opcionalAuth } from '../middleware/auth.js';
import { responderChat } from '../services/chat.js';
import { estadoIA } from '../services/ia.js';
import { estadoCorreo } from '../services/mailer.js';
import { estadoBaseDatos } from '../db/estado.js';

/**
 * Chatbot (Fase 10) + estado del sistema.
 *
 * - POST   /api/chat              → responde (con o sin sesión)
 * - GET    /api/chat/historial    → conversación del usuario (protegido)
 * - DELETE /api/chat/historial    → borra la conversación (protegido)
 * - GET    /api/ia/estado         → IA local/nube, correo y base de datos
 */
const router = Router();

/** POST /api/chat — mensaje del usuario y respuesta del asistente. */
router.post('/', opcionalAuth, async (req, res, next) => {
  try {
    const mensaje = String(req.body?.mensaje || '').trim();
    if (!mensaje) {
      return res.status(400).json({ error: 'Escribe un mensaje' });
    }
    if (mensaje.length > 1000) {
      return res
        .status(400)
        .json({ error: 'El mensaje es demasiado largo (máx. 1000 caracteres)' });
    }

    const db = getDb();
    const historial = req.user
      ? db
          .prepare(
            'SELECT rol, contenido FROM chat_messages WHERE user_id = ? ORDER BY id DESC LIMIT 8',
          )
          .all(req.user.id)
          .reverse()
      : [];

    const respuesta = await responderChat(mensaje, { usuario: req.user, historial });

    if (req.user) {
      db.prepare(
        'INSERT INTO chat_messages (user_id, rol, contenido, fuente) VALUES (?, ?, ?, ?)',
      ).run(req.user.id, 'usuario', mensaje, 'usuario');
      db.prepare(
        'INSERT INTO chat_messages (user_id, rol, contenido, fuente) VALUES (?, ?, ?, ?)',
      ).run(req.user.id, 'asistente', respuesta.respuesta, respuesta.fuente);
      // Historial de conversaciones (máx. 100 mensajes por usuario)
      db.prepare(
        'DELETE FROM chat_messages WHERE user_id = ? AND id NOT IN (SELECT id FROM chat_messages WHERE user_id = ? ORDER BY id DESC LIMIT 100)',
      ).run(req.user.id, req.user.id);
    }

    return res.json({
      respuesta: respuesta.respuesta,
      fuente: respuesta.fuente,
      sugerencias: respuesta.sugerencias || [],
    });
  } catch (err) {
    return next(err);
  }
});

/** GET /api/chat/historial — conversación guardada del usuario. */
router.get('/historial', requireAuth, (req, res) => {
  const mensajes = getDb()
    .prepare(
      'SELECT id, rol, contenido, fuente, creado_en FROM chat_messages WHERE user_id = ? ORDER BY id ASC',
    )
    .all(req.user.id);
  res.json({ mensajes });
});

/** DELETE /api/chat/historial — vacía la conversación. */
router.delete('/historial', requireAuth, (req, res) => {
  getDb().prepare('DELETE FROM chat_messages WHERE user_id = ?').run(req.user.id);
  registrarAuditoria(req.user.correo, 'chat_borrar_historial', null, req.ip);
  res.json({ ok: true });
});

/** GET /api/ia/estado — qué motores están disponibles (badge del chatbot). */
router.get('/estado', async (_req, res) => {
  const ia = await estadoIA();
  const correo = estadoCorreo();
  const baseDatos = estadoBaseDatos();
  res.json({ ia, correo, baseDatos });
});

export default router;
