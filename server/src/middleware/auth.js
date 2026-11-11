import jwt from 'jsonwebtoken';

/**
 * Secreto para firmar JWT.
 * Se lee después de `import 'dotenv/config'` en index.js (dotenv carga
 * server/.env). En desarrollo, si falta, se genera un secreto de sesión
 * (los tokens caducan al reiniciar el servidor: aceptable en dev).
 */
function obtenerSecreto() {
  const secreto = process.env.JWT_SECRET;
  if (secreto && secreto !== 'cambiar-en-produccion') return secreto;
  console.warn('[SazónLab] JWT_SECRET no definido — usando secreto de desarrollo.');
  return 'sazonlab-dev-secret';
}

export { obtenerSecreto };

/**
 * Middleware de autenticación: exige `Authorization: Bearer <jwt>`.
 * Si es válido, adjunta `req.user = { id, nombre, correo, rol }`.
 */
export function requireAuth(req, res, next) {
  const cabecera = req.headers.authorization || '';
  const [esquema, token] = cabecera.split(' ');

  if (esquema !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Se requiere iniciar sesión' });
  }

  try {
    const payload = jwt.verify(token, obtenerSecreto());
    req.user = {
      id: Number(payload.sub),
      nombre: payload.nombre,
      correo: payload.correo,
      rol: payload.rol,
    };
    return next();
  } catch {
    return res.status(401).json({ error: 'Sesión expirada o token inválido' });
  }
}

/**
 * Autenticación opcional (Fase 5): adjunta `req.user` si el token es
 * válido, pero nunca rechaza la petición. Permite que el detalle de
 * receta funcione tanto para invitados (recetas públicas) como con
 * sesión (las suyas + indicador de favorito).
 */
export function opcionalAuth(req, _res, next) {
  const cabecera = req.headers.authorization || '';
  const [esquema, token] = cabecera.split(' ');
  if (esquema === 'Bearer' && token) {
    try {
      const payload = jwt.verify(token, obtenerSecreto());
      req.user = {
        id: Number(payload.sub),
        nombre: payload.nombre,
        correo: payload.correo,
        rol: payload.rol,
      };
    } catch {
      // Token inválido o caducado: se trata como invitado
    }
  }
  return next();
}

/** Firma un JWT de 7 días para el usuario dado. */
export function firmarToken(usuario) {
  return jwt.sign(
    { nombre: usuario.nombre, correo: usuario.correo, rol: usuario.rol },
    obtenerSecreto(),
    { subject: String(usuario.id), expiresIn: '7d' },
  );
}
