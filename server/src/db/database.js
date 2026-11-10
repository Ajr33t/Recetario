import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

/**
 * Conexión SQLite (demo web y desarrollo).
 * En despliegue web con PostgreSQL se puede sustituir esta capa
 * manteniendo la misma interfaz (decisión de la Fase 0).
 *
 * Esquema completo basado en el modelo de dominio del IEEE
 * (Usuario, Receta, Ingrediente, Paso, Favorito, Búsqueda, Auditoría…).
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../../data');
const DB_PATH = path.join(DATA_DIR, 'sazonlab.db');

let db = null;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  correo TEXT NOT NULL UNIQUE,
  contrasena_hash TEXT NOT NULL,
  rol TEXT NOT NULL DEFAULT 'usuario' CHECK (rol IN ('admin', 'usuario')),
  estado TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo')),
  creado_en TEXT NOT NULL DEFAULT (datetime('now')),
  actualizado_en TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  tema TEXT NOT NULL DEFAULT 'oceano',
  modo TEXT NOT NULL DEFAULT 'claro' CHECK (modo IN ('claro', 'oscuro', 'alto-contraste')),
  tamano_fuente TEXT NOT NULL DEFAULT 'normal' CHECK (tamano_fuente IN ('normal', 'grande', 'extra')),
  reducir_movimiento INTEGER NOT NULL DEFAULT 0 CHECK (reducir_movimiento IN (0, 1)),
  actualizado_en TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS recipes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  tiempo_min INTEGER,
  dificultad TEXT CHECK (dificultad IN ('facil', 'media', 'dificil')),
  porciones INTEGER,
  imagen_url TEXT,
  visibilidad TEXT NOT NULL DEFAULT 'privada' CHECK (visibilidad IN ('privada', 'publica')),
  origen TEXT NOT NULL DEFAULT 'propia' CHECK (origen IN ('propia', 'sugerida')),
  estado TEXT NOT NULL DEFAULT 'activa' CHECK (estado IN ('activa', 'papelera')),
  etiquetas TEXT NOT NULL DEFAULT '[]',
  deleted_at TEXT,
  creado_en TEXT NOT NULL DEFAULT (datetime('now')),
  actualizado_en TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  cantidad REAL,
  unidad TEXT,
  orden INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS recipe_steps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  orden INTEGER NOT NULL,
  descripcion TEXT NOT NULL,
  imagen_url TEXT
);

CREATE TABLE IF NOT EXISTS recipe_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  datos TEXT NOT NULL,
  creado_en TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS favorites (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  creado_en TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, recipe_id)
);

CREATE TABLE IF NOT EXISTS search_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ingredientes TEXT NOT NULL,
  filtros TEXT NOT NULL DEFAULT '{}',
  creado_en TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ingredients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  nombre_en TEXT,
  categoria TEXT
);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario TEXT,
  accion TEXT NOT NULL,
  detalle TEXT,
  ip TEXT,
  creado_en TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS password_reset (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  correo TEXT NOT NULL,
  codigo_hash TEXT NOT NULL,
  expira_en TEXT NOT NULL,
  intentos INTEGER NOT NULL DEFAULT 0,
  creado_en TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_recipes_user ON recipes(user_id);
CREATE INDEX IF NOT EXISTS idx_recipes_estado ON recipes(estado);
CREATE INDEX IF NOT EXISTS idx_audit_fecha ON audit_log(creado_en);
CREATE INDEX IF NOT EXISTS idx_search_user ON search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_reset_correo ON password_reset(correo);
`;

/**
 * Migraciones mínimas para bases creadas en fases anteriores:
 * SQLite no añade columnas con CREATE TABLE IF NOT EXISTS, así que se
 * agregan faltantes de forma segura (avatar/bio del perfil — Fase 3).
 */
function migrarEsquema(db) {
  const columnas = db
    .prepare('PRAGMA table_info(users)')
    .all()
    .map((c) => c.name);
  if (!columnas.includes('avatar')) {
    db.exec("ALTER TABLE users ADD COLUMN avatar TEXT DEFAULT 'fa-user'");
  }
  if (!columnas.includes('bio')) {
    db.exec('ALTER TABLE users ADD COLUMN bio TEXT');
  }
  if (!columnas.includes('avatar_imagen')) {
    // Foto de perfil como data URL (JPEG 256px, recortado en el navegador)
    db.exec('ALTER TABLE users ADD COLUMN avatar_imagen TEXT');
  }
  if (!columnas.includes('color_perfil')) {
    // Color de acento propio (#rrggbb) para la tarjeta de perfil
    db.exec('ALTER TABLE users ADD COLUMN color_perfil TEXT');
  }
}

/** Inicializa la conexión y crea el esquema si no existe. */
export function initDatabase() {
  if (db) return db;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA);
  migrarEsquema(db);
  console.log(`[SazónLab] Base de datos lista en ${DB_PATH}`);
  return db;
}

/** Devuelve la instancia activa de la base de datos. */
export function getDb() {
  if (!db) return initDatabase();
  return db;
}

/** Registra una operación crítica en la bitácora (RF-23). */
export function registrarAuditoria(usuario, accion, detalle = null, ip = null) {
  getDb()
    .prepare('INSERT INTO audit_log (usuario, accion, detalle, ip) VALUES (?, ?, ?, ?)')
    .run(usuario, accion, detalle ? JSON.stringify(detalle) : null, ip);
}
