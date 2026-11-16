import pg from 'pg';

/**
 * Capa PostgreSQL (Fase 10) — la **base de datos sólida en la nube**.
 *
 * Diseño local-first (conservador y sin romper el modo offline del `.exe`):
 *  - **PostgreSQL** (Neon, Supabase, Railway, RDS…) es el almacén de verdad:
 *    se configura con `DATABASE_URL` y ahí quedan recetas, favoritos y
 *    preferencias, disponibles desde cualquier dispositivo.
 *  - **SQLite** local actúa como caché y respaldo offline (obligatorio en
 *    el `.exe`, que debe funcionar sin internet).
 *  - `sincronizar()` (services/nube.js) replica en ambos sentidos con
 *    regla *última escritura gana* usando `actualizado_en`.
 *
 * El esquema remoto usa JSONB por entidad: es simple, versionable y no
 * depende de migraciones fragile mientras el modelo de la app evoluciona.
 */

const { Pool } = pg;

/** Tablas del esquema remoto (idempotentes). */
export const ESQUEMA_REMOTO = `
CREATE TABLE IF NOT EXISTS sazonlab_usuarios (
  correo TEXT PRIMARY KEY,
  datos JSONB NOT NULL,
  actualizado_en TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sazonlab_recetas (
  id INTEGER PRIMARY KEY,
  correo TEXT NOT NULL,
  datos JSONB NOT NULL,
  actualizado_en TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sazonlab_favoritos (
  id INTEGER PRIMARY KEY,
  correo TEXT NOT NULL,
  datos JSONB NOT NULL,
  actualizado_en TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sazonlab_preferencias (
  correo TEXT PRIMARY KEY,
  datos JSONB NOT NULL,
  actualizado_en TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sazonlab_recetas_correo ON sazonlab_recetas(correo);
CREATE INDEX IF NOT EXISTS idx_sazonlab_favoritos_correo ON sazonlab_favoritos(correo);
`;

let pool = null;
let esquemaCreado = false;

/**
 * Inyecta un pool ya creado (solo para pruebas con PostgreSQL embebido).
 * @param {object|null} p pool de `pg`
 */
export function usarPoolPersonalizado(p) {
  pool = p;
  esquemaCreado = false;
}

/** ¿Hay una base de datos en la nube configurada? */
export function hayNube() {
  return Boolean(pool) || Boolean(process.env.DATABASE_URL);
}

/** Host de la nube (sin credenciales) para mostrarlo en la interfaz. */
export function hostNube() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  try {
    return new URL(url).host;
  } catch {
    return 'postgresql';
  }
}

/**
 * Devuelve el pool de conexiones (o null si no hay nube configurada).
 * `ssl` se activa automáticamente en proveedores que lo exigen (Neon).
 */
export function obtenerPool() {
  if (!hayNube()) return null;
  if (pool) return pool;
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false },
    max: Number(process.env.DATABASE_POOL || 5),
    connectionTimeoutMillis: 8000,
  });
  pool.on('error', (err) => {
    console.warn(`[SazónLab] Error del pool de PostgreSQL: ${err.message}`);
  });
  return pool;
}

/** Crea el esquema remoto si no existe (una sola vez por conexión). */
export async function crearEsquemaRemoto() {
  const p = obtenerPool();
  if (!p) return false;
  if (esquemaCreado) return true;
  for (const sentencia of ESQUEMA_REMOTO.split(';')
    .map((s) => s.trim())
    .filter(Boolean)) {
    try {
      await p.query(sentencia);
    } catch (err) {
      // Si la tabla ya existe, seguimos (Postgres y PostgreSQL embebido
      // lo avisan de forma distinta).
      if (!/already exists|not supported/i.test(err.message)) throw err;
    }
  }
  esquemaCreado = true;
  return true;
}

/**
 * Inserta o actualiza una fila (upsert) por clave.
 * `valores` debe incluir la clave y `actualizado_en`.
 * Se hace UPDATE y, si no había fila, INSERT (evita depender de
 * `ON CONFLICT`, que no existe en todas las versiones).
 * @param {string} tabla tabla remota
 * @param {string} clave columna de la clave primaria
 * @param {Record<string, unknown>} valores columnas a escribir
 */
export async function upsert(tabla, clave, valores) {
  const p = obtenerPool();
  if (!p) return false;
  const columnas = Object.keys(valores);
  const aEscribir = columnas.filter((c) => c !== clave);

  const actualizacion = await p.query(
    `UPDATE ${tabla} SET ${aEscribir.map((c, i) => `${c} = $${i + 2}`).join(', ')} WHERE ${clave} = $1`,
    [valores[clave], ...aEscribir.map((c) => valores[c])],
  );
  if (actualizacion.rowCount > 0) return true;

  await p.query(
    `INSERT INTO ${tabla} (${clave}, ${columnas.join(', ')}) VALUES ($1, ${columnas
      .map((_, i) => `$${i + 2}`)
      .join(', ')})`,
    [valores[clave], ...columnas.map((c) => valores[c])],
  );
  return true;
}

/**
 * Lee todas las filas de una tabla para un correo.
 * @param {string} tabla tabla remota
 * @param {string} correo correo del usuario
 * @param {string} [orden] columnas de orden (por defecto, solo `correo`)
 */
export async function leer(tabla, correo, orden = 'correo') {
  const p = obtenerPool();
  if (!p) return [];
  const { rows } = await p.query(`SELECT * FROM ${tabla} WHERE correo = $1 ORDER BY ${orden}`, [
    correo,
  ]);
  return rows;
}

/** Prueba rápida de conexión (para el panel de estado). */
export async function comprobarConexion() {
  const p = obtenerPool();
  if (!p) return { conectado: false, motivo: 'sin DATABASE_URL' };
  try {
    const inicio = Date.now();
    await p.query('SELECT 1 AS ok');
    return { conectado: true, ms: Date.now() - inicio, version: await versionPostgres() };
  } catch (err) {
    return { conectado: false, motivo: err.message };
  }
}

async function versionPostgres() {
  const p = obtenerPool();
  try {
    const { rows } = await p.query('SHOW server_version');
    return rows?.[0]?.server_version || null;
  } catch {
    return null;
  }
}

/** Cierra el pool (apagado orderly). */
export async function cerrarPool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
