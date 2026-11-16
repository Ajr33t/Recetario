import { Router } from 'express';
import { getDb } from '../db/database.js';

const router = Router();

/**
 * GET /api/health — sonda de salud del servidor.
 * Verifica también la conexión a la base de datos.
 */
router.get('/', (_req, res) => {
  let database = 'ok';
  try {
    getDb().prepare('SELECT 1 AS ok').get();
  } catch {
    database = 'error';
  }

  res.json({
    status: database === 'ok' ? 'ok' : 'degraded',
    service: 'sazonlab-api',
    version: '1.0.0',
    database,
    timestamp: new Date().toISOString(),
  });
});

export default router;
