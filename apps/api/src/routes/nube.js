import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { estadoNube, sincronizar } from '../services/nube.js';
import { registrarAuditoria } from '../db/database.js';

/**
 * Estado y sincronización con la nube (Fase 10).
 *
 * - GET  /api/nube/estado       → configuración y estado de la conexión
 * - POST /api/nube/sincronizar   → replica los datos del usuario (protegido)
 */
const router = Router();

/** GET /api/nube/estado — visible en Ajustes. */
router.get('/estado', async (_req, res) => {
  res.json(await estadoNube());
});

/** POST /api/nube/sincronizar — sube y baja los datos del usuario. */
router.post('/sincronizar', requireAuth, async (req, res) => {
  const resultado = await sincronizar(req.user.correo);
  if (resultado.ok) {
    registrarAuditoria(req.user.correo, 'nube_sincronizar', resultado, req.ip);
  }
  res.status(resultado.ok ? 200 : 503).json(resultado);
});

export default router;
