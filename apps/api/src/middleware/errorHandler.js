/** Manejador de rutas inexistentes (404). */
export function notFound(_req, res) {
  res.status(404).json({ error: 'Recurso no encontrado' });
}

/** Manejador centralizado de errores (siempre JSON). */
export function errorHandler(err, _req, res, _next) {
  console.error('[SazónLab] Error:', err.message);
  const status = err.status || 500;
  res.status(status).json({
    error: status === 500 ? 'Error interno del servidor' : err.message,
  });
}
