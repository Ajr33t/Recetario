import { Router } from 'express';
import { getDb, registrarAuditoria } from '../db/database.js';
import { requireAuth } from '../middleware/auth.js';

/**
 * Lista de pedidos (nueva funcionalidad — punto 1 del encargo).
 *
 * Permite crear, editar, marcar como completado y eliminar pedidos, con
 * filtros por estado y fechas, y un contador de pedidos activos para la UI.
 *
 * Reglas de acceso:
 * - Cualquier usuario con sesión ve y gestiona **sus** pedidos.
 * - El administrador ve y gestiona **todos** los pedidos.
 *
 * Endpoints:
 * - GET    /api/pedidos/contador  → conteo por estado (para el badge de la UI)
 * - GET    /api/pedidos           → lista con filtros (estado, fecha_desde, fecha_hasta)
 * - GET    /api/pedidos/:id       → detalle con las recetas incluidas
 * - POST   /api/pedidos           → crear pedido (con recetas y cantidades)
 * - PUT    /api/pedidos/:id       → editar total / método de pago / notas
 * - PUT    /api/pedidos/:id/completar → marcar como completado
 * - DELETE /api/pedidos/:id       → eliminar (dueño solo si no está completado)
 */
const router = Router();
router.use(requireAuth);

/** Estados válidos de un pedido (deben coincidir con el CHECK de la BD). */
const ESTADOS = new Set(['pendiente', 'completado', 'cancelado']);

/** ¿Puede gestionar este pedido el usuario de la petición? */
function puedeGestionar(req, pedido) {
  return req.user.rol === 'admin' || pedido.user_id === req.user.id;
}

/** Cláusula WHERE según el rol: admin ve todos, el resto los suyos. */
function whereSegunRol(req) {
  return req.user.rol === 'admin' ? '' : ' AND p.user_id = ?';
}

/** Parámetros WHERE según el rol (coinciden con los `?` de la consulta). */
function paramsSegunRol(req) {
  return req.user.rol === 'admin' ? [] : [req.user.id];
}

/** GET /api/pedidos/contador — pedidos por estado para el contador de la UI. */
router.get('/contador', (req, res) => {
  const db = getDb();
  const extra = whereSegunRol(req);
  const params = paramsSegunRol(req);

  const filas = db
    .prepare(
      `SELECT p.estado, COUNT(*) AS total
       FROM pedidos p
       WHERE 1 = 1 ${extra}
       GROUP BY p.estado`,
    )
    .all(...params);

  const contador = { pendiente: 0, completado: 0, cancelado: 0, total: 0 };
  for (const fila of filas) {
    contador[fila.estado] = fila.total;
    contador.total += fila.total;
  }
  // "Activos" = pendientes: es el número que muestra el badge de la UI.
  return res.json({ ...contador, activos: contador.pendiente });
});

/** GET /api/pedidos — lista con filtros opcionales por estado y rango de fechas. */
router.get('/', (req, res) => {
  const db = getDb();
  const { estado, fecha_desde, fecha_hasta } = req.query;

  if (estado && !ESTADOS.has(estado)) {
    return res.status(400).json({ error: 'Estado inválido (pendiente | completado | cancelado)' });
  }

  const condiciones = ['1 = 1'];
  const params = [];

  const extraRol = whereSegunRol(req);
  if (extraRol) {
    condiciones.push('p.user_id = ?');
    params.push(...paramsSegunRol(req));
  }
  if (estado) {
    condiciones.push('p.estado = ?');
    params.push(estado);
  }
  if (fecha_desde) {
    condiciones.push('date(p.creado_en) >= date(?)');
    params.push(fecha_desde);
  }
  if (fecha_hasta) {
    condiciones.push('date(p.creado_en) <= date(?)');
    params.push(fecha_hasta);
  }

  const pedidos = db
    .prepare(
      `SELECT p.id, p.user_id, p.total, p.estado, p.metodo_pago, p.notas,
              p.creado_en, p.actualizado_en,
              u.nombre AS usuario_nombre, u.correo AS usuario_correo,
              (SELECT COUNT(*) FROM pedido_detalle d WHERE d.pedido_id = p.id) AS items
       FROM pedidos p
       JOIN users u ON u.id = p.user_id
       WHERE ${condiciones.join(' AND ')}
       ORDER BY p.creado_en DESC`,
    )
    .all(...params);

  return res.json({ pedidos });
});

/** GET /api/pedidos/:id — detalle de un pedido con sus recetas. */
router.get('/:id', (req, res) => {
  const db = getDb();
  const pedido = db
    .prepare(
      `SELECT p.*, u.nombre AS usuario_nombre, u.correo AS usuario_correo
       FROM pedidos p
       JOIN users u ON u.id = p.user_id
       WHERE p.id = ?`,
    )
    .get(req.params.id);

  if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado' });
  if (!puedeGestionar(req, pedido)) {
    return res.status(403).json({ error: 'No tienes permiso para ver este pedido' });
  }

  const recetas = db
    .prepare(
      `SELECT d.receta_id, d.cantidad, r.titulo, r.imagen_url, r.origen
       FROM pedido_detalle d
       LEFT JOIN recipes r ON r.id = d.receta_id
       WHERE d.pedido_id = ?
       ORDER BY d.id`,
    )
    .all(pedido.id);

  return res.json({ pedido, recetas });
});

/** POST /api/pedidos — crea un pedido con sus recetas. */
router.post('/', (req, res) => {
  const db = getDb();
  const { total, metodo_pago = 'efectivo', notas = null, recetas = [] } = req.body || {};

  if (typeof total !== 'number' || total < 0) {
    return res.status(400).json({ error: 'total debe ser un número mayor o igual a 0' });
  }
  if (!Array.isArray(recetas)) {
    return res.status(400).json({ error: 'recetas debe ser una lista' });
  }

  try {
    const resultado = db.transaction(() => {
      const info = db
        .prepare(
          `INSERT INTO pedidos (user_id, total, metodo_pago, notas, estado)
           VALUES (?, ?, ?, ?, 'pendiente')`,
        )
        .run(req.user.id, total, metodo_pago, notas);

      const insertarDetalle = db.prepare(
        'INSERT INTO pedido_detalle (pedido_id, receta_id, cantidad) VALUES (?, ?, ?)',
      );
      for (const item of recetas) {
        const recetaId = Number(item?.receta_id);
        const cantidad = Math.max(1, Number(item?.cantidad) || 1);
        if (!recetaId) continue;
        // Solo recetas existentes y activas entran al pedido.
        const existe = db
          .prepare("SELECT id FROM recipes WHERE id = ? AND estado = 'activa'")
          .get(recetaId);
        if (existe) insertarDetalle.run(info.lastInsertRowid, recetaId, cantidad);
      }
      return Number(info.lastInsertRowid);
    })();

    registrarAuditoria(req.user.correo, 'crear_pedido', { pedidoId: resultado }, req.ip);
    const pedido = db.prepare('SELECT * FROM pedidos WHERE id = ?').get(resultado);
    return res.status(201).json({ pedido });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/** PUT /api/pedidos/:id — edita total, método de pago o notas. */
router.put('/:id', (req, res) => {
  const db = getDb();
  const pedido = db.prepare('SELECT * FROM pedidos WHERE id = ?').get(req.params.id);
  if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado' });
  if (!puedeGestionar(req, pedido)) {
    return res.status(403).json({ error: 'No tienes permiso para editar este pedido' });
  }

  const { total, metodo_pago, notas } = req.body || {};
  const cambios = [];
  const params = [];

  if (total !== undefined) {
    if (typeof total !== 'number' || total < 0) {
      return res.status(400).json({ error: 'total debe ser un número mayor o igual a 0' });
    }
    cambios.push('total = ?');
    params.push(total);
  }
  if (metodo_pago !== undefined) {
    cambios.push('metodo_pago = ?');
    params.push(String(metodo_pago));
  }
  if (notas !== undefined) {
    cambios.push('notas = ?');
    params.push(notas === null ? null : String(notas));
  }
  if (cambios.length === 0) {
    return res.status(400).json({ error: 'No hay cambios para aplicar' });
  }

  cambios.push("actualizado_en = datetime('now')");
  params.push(pedido.id);
  db.prepare(`UPDATE pedidos SET ${cambios.join(', ')} WHERE id = ?`).run(...params);

  registrarAuditoria(req.user.correo, 'editar_pedido', { pedidoId: pedido.id }, req.ip);
  return res.json({ pedido: db.prepare('SELECT * FROM pedidos WHERE id = ?').get(pedido.id) });
});

/** PUT /api/pedidos/:id/completar — marca el pedido como completado. */
router.put('/:id/completar', (req, res) => {
  const db = getDb();
  const pedido = db.prepare('SELECT * FROM pedidos WHERE id = ?').get(req.params.id);
  if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado' });
  if (!puedeGestionar(req, pedido)) {
    return res.status(403).json({ error: 'No tienes permiso para gestionar este pedido' });
  }
  if (pedido.estado === 'completado') {
    return res.status(400).json({ error: 'El pedido ya está completado' });
  }

  db.prepare(
    `UPDATE pedidos
        SET estado = 'completado', actualizado_en = datetime('now')
      WHERE id = ?`,
  ).run(pedido.id);

  registrarAuditoria(req.user.correo, 'completar_pedido', { pedidoId: pedido.id }, req.ip);
  return res.json({
    mensaje: 'Pedido marcado como completado',
    pedido: db.prepare('SELECT * FROM pedidos WHERE id = ?').get(pedido.id),
  });
});

/** DELETE /api/pedidos/:id — elimina un pedido (el dueño solo si no está completado). */
router.delete('/:id', (req, res) => {
  const db = getDb();
  const pedido = db.prepare('SELECT * FROM pedidos WHERE id = ?').get(req.params.id);
  if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado' });
  if (!puedeGestionar(req, pedido)) {
    return res.status(403).json({ error: 'No tienes permiso para eliminar este pedido' });
  }
  if (pedido.estado === 'completado' && req.user.rol !== 'admin') {
    return res.status(400).json({ error: 'No se puede eliminar un pedido completado' });
  }

  // pedido_detalle se elimina en cascada (ON DELETE CASCADE).
  db.prepare('DELETE FROM pedidos WHERE id = ?').run(pedido.id);

  registrarAuditoria(req.user.correo, 'eliminar_pedido', { pedidoId: pedido.id }, req.ip);
  return res.json({ mensaje: 'Pedido eliminado', id: pedido.id });
});

export default router;
