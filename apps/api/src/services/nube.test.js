import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { newDb } from 'pg-mem';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

// La BD local de esta prueba va a una carpeta temporal
const DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'sazonlab-nube-'));
process.env.SAZONLAB_DATA_DIR = DIR;

const { initDatabase, getDb } = await import('../db/database.js');
const { usarPoolPersonalizado, leer } = await import('../db/postgres.js');
const { sincronizar, estadoNube } = await import('./nube.js');

let pool = null;

before(async () => {
  initDatabase();
  // PostgreSQL embebido en memoria (pg-mem): mismo dialecto que un Postgres real
  const memoria = newDb({ autoCreateForeignKeyIndices: true });
  const adaptador = memoria.adapters.createPg();
  pool = new adaptador.Pool();
  usarPoolPersonalizado(pool);
});

after(async () => {
  usarPoolPersonalizado(null);
  try {
    getDb().close();
  } catch {
    /* la BD puede ya estar cerrada */
  }
  fs.rmSync(DIR, { recursive: true, force: true });
});

/** Crea un usuario con una receta propia. */
function crearUsuarioLocal(correo, titulo) {
  const db = getDb();
  const r = db
    .prepare(
      "INSERT INTO users (nombre, correo, contrasena_hash, rol) VALUES (?, ?, 'hash', 'usuario')",
    )
    .run('Chef Nube', correo);
  const id = Number(r.lastInsertRowid);
  db.prepare('INSERT INTO user_preferences (user_id) VALUES (?)').run(id);
  const receta = db
    .prepare(
      'INSERT INTO recipes (user_id, titulo, descripcion, tiempo_min, dificultad, etiquetas) VALUES (?, ?, ?, ?, ?, ?)',
    )
    .run(id, titulo, 'Receta de prueba', 20, 'facil', '[]');
  return { id: Number(receta.lastInsertRowid), usuarioId: id };
}

test('la sincronización sube los datos locales a PostgreSQL', async () => {
  const correo = 'nube-1@sazonlab.test';
  const receta = crearUsuarioLocal(correo, 'Arepas synchronizadas');

  const resultado = await sincronizar(correo);
  assert.equal(resultado.ok, true, `la sincronización falló: ${resultado.motivo}`);
  assert.ok(resultado.subidos >= 2, `debía subir usuario y receta (subidos=${resultado.subidos})`);

  const usuarios = await leer('sazonlab_usuarios', correo);
  assert.equal(usuarios.length, 1);
  assert.equal(usuarios[0].datos.nombre, 'Chef Nube');

  const recetas = await leer('sazonlab_recetas', correo);
  assert.equal(recetas.length, 1);
  assert.equal(recetas[0].datos.titulo, 'Arepas synchronizadas');
  assert.equal(recetas[0].datos.id, receta.id);
});

test('la sincronización baja a local lo que hay más nuevo en la nube', async () => {
  const correo = 'nube-2@sazonlab.test';
  const receta = crearUsuarioLocal(correo, 'Receta local antigua');
  assert.ok(receta.id > 0, 'la receta local debe crearse');

  // Primero subimos
  await sincronizar(correo);

  // Ahora la nube tiene una receta más nueva (otro dispositivo)
  await pool.query(
    `INSERT INTO sazonlab_recetas (id, correo, datos, actualizado_en)
     VALUES ($1, $2, $3, $4)`,
    [
      9999,
      correo,
      JSON.stringify({
        id: 9999,
        titulo: 'Receta creada en otro dispositivo',
        descripcion: 'Viene de la nube',
        tiempo_min: 30,
        dificultad: 'media',
        etiquetas: '[]',
        ingredientes: [],
        pasos: [],
        creado_en: '2026-01-01 10:00:00',
      }),
      '2026-06-01 10:00:00',
    ],
  );

  const resultado = await sincronizar(correo);
  assert.equal(resultado.ok, true);
  assert.ok(
    resultado.bajados >= 1,
    `debía descargar la receta nueva (bajados=${resultado.bajados})`,
  );

  const local = getDb().prepare('SELECT * FROM recipes WHERE id = 9999').get();
  assert.ok(local, 'la receta de la nube debe estar en la caché local');
  assert.equal(local.titulo, 'Receta creada en otro dispositivo');
});

test('el estado de la nube informa del motor activo', async () => {
  const estado = await estadoNube();
  assert.equal(estado.configurado, true);
  assert.equal(estado.modo, 'nube + caché local');
});
