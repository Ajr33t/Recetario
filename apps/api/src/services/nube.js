import { getDb } from '../db/database.js';
import {
  crearEsquemaRemoto,
  hayNube,
  hostNube,
  leer,
  obtenerPool,
  upsert,
} from '../db/postgres.js';

/**
 * Sincronización con la nube (Fase 10).
 *
 * SQLite local = caché/offline (obligatorio en el `.exe`).
 * PostgreSQL en la nube = almacén de verdad (DATABASE_URL).
 *
 * Regla: **última escritura gana** comparando `actualizado_en`.
 * El proceso es bidireccional:
 *   1. se sube a la nube lo que en local sea más nuevo;
 *   2. se baja a local lo que en la nube sea más nuevo.
 */

const TABLA_USUARIOS = 'sazonlab_usuarios';
const TABLA_RECETAS = 'sazonlab_recetas';
const TABLA_FAVORITOS = 'sazonlab_favoritos';
const TABLA_PREFERENCIAS = 'sazonlab_preferencias';

/** ¿El texto `a` es más reciente que `b`? (ISO/«YYYY-MM-DD HH:MM:SS»). */
function masReciente(a, b) {
  if (!a) return false;
  if (!b) return true;
  return String(a).replace('T', ' ') > String(b).replace('T', ' ');
}

/** Lee del caché local todo lo del usuario. */
function leerLocal(correo) {
  const db = getDb();
  const usuario = db.prepare('SELECT * FROM users WHERE correo = ?').get(correo);
  if (!usuario) return null;

  const recetas = db
    .prepare("SELECT * FROM recipes WHERE user_id = ? AND estado = 'activa' ORDER BY id")
    .all(usuario.id);
  const ingredientes = db
    .prepare(
      `SELECT ri.* FROM recipe_ingredients ri
         JOIN recipes r ON r.id = ri.recipe_id
        WHERE r.user_id = ? ORDER BY ri.recipe_id, ri.orden`,
    )
    .all(usuario.id);
  const pasos = db
    .prepare(
      `SELECT rs.* FROM recipe_steps rs
         JOIN recipes r ON r.id = rs.recipe_id
        WHERE r.user_id = ? ORDER BY rs.recipe_id, rs.orden`,
    )
    .all(usuario.id);
  const favoritos = db.prepare('SELECT * FROM favorites WHERE user_id = ?').all(usuario.id);
  const preferencias = db
    .prepare('SELECT * FROM user_preferences WHERE user_id = ?')
    .get(usuario.id);

  return {
    usuario,
    recetas: recetas.map((r) => ({
      ...r,
      ingredientes: ingredientes.filter((i) => i.recipe_id === r.id),
      pasos: pasos.filter((p) => p.recipe_id === r.id),
    })),
    favoritos,
    preferencias,
  };
}

/** Aplica en el caché local lo que venía más nuevo desde la nube. */
function aplicarLocal(correo, remotos) {
  const db = getDb();
  const usuario = db.prepare('SELECT id FROM users WHERE correo = ?').get(correo);
  if (!usuario) return 0;
  let aplicadas = 0;

  for (const fila of remotos.recetas) {
    const datos = fila.datos || {};
    const local = db.prepare('SELECT * FROM recipes WHERE id = ?').get(datos.id);
    if (local && !masReciente(fila.actualizado_en, local.actualizado_en)) continue;

    if (!local) {
      db.prepare(
        `INSERT INTO recipes (id, user_id, titulo, descripcion, tiempo_min, dificultad, porciones,
           imagen_url, visibilidad, origen, estado, etiquetas, deleted_at, creado_en, actualizado_en)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        datos.id,
        usuario.id,
        datos.titulo,
        datos.descripcion ?? null,
        datos.tiempo_min ?? null,
        datos.dificultad ?? null,
        datos.porciones ?? null,
        datos.imagen_url ?? null,
        datos.visibilidad || 'privada',
        datos.origen || 'propia',
        'activa',
        datos.etiquetas || '[]',
        null,
        datos.creado_en || new Date().toISOString(),
        fila.actualizado_en,
      );
    } else {
      db.prepare(
        `UPDATE recipes SET titulo = ?, descripcion = ?, tiempo_min = ?, dificultad = ?,
           porciones = ?, imagen_url = ?, visibilidad = ?, etiquetas = ?, actualizado_en = ?
         WHERE id = ?`,
      ).run(
        datos.titulo,
        datos.descripcion ?? null,
        datos.tiempo_min ?? null,
        datos.dificultad ?? null,
        datos.porciones ?? null,
        datos.imagen_url ?? null,
        datos.visibilidad || 'privada',
        datos.etiquetas || '[]',
        fila.actualizado_en,
        datos.id,
      );
    }

    db.prepare('DELETE FROM recipe_ingredients WHERE recipe_id = ?').run(datos.id);
    db.prepare('DELETE FROM recipe_steps WHERE recipe_id = ?').run(datos.id);
    for (const ing of datos.ingredientes || []) {
      db.prepare(
        'INSERT INTO recipe_ingredients (recipe_id, nombre, cantidad, unidad, orden) VALUES (?, ?, ?, ?, ?)',
      ).run(datos.id, ing.nombre, ing.cantidad ?? null, ing.unidad ?? null, ing.orden ?? 0);
    }
    for (const paso of datos.pasos || []) {
      db.prepare(
        'INSERT INTO recipe_steps (recipe_id, orden, descripcion, imagen_url) VALUES (?, ?, ?, ?)',
      ).run(datos.id, paso.orden ?? 0, paso.descripcion, paso.imagen_url ?? null);
    }
    aplicadas++;
  }

  for (const fila of remotos.favoritos) {
    const datos = fila.datos || {};
    const existe = db
      .prepare('SELECT 1 AS x FROM favorites WHERE user_id = ? AND recipe_id = ?')
      .get(usuario.id, datos.recipe_id);
    if (!existe) {
      db.prepare('INSERT INTO favorites (user_id, recipe_id) VALUES (?, ?)').run(
        usuario.id,
        datos.recipe_id,
      );
      aplicadas++;
    }
  }

  const pref = remotos.preferencias?.datos;
  if (pref) {
    db.prepare(
      `UPDATE user_preferences SET tema = ?, modo = ?, tamano_fuente = ?, reducir_movimiento = ?,
        actualizado_en = ? WHERE user_id = ?`,
    ).run(
      pref.tema || 'oceano',
      pref.modo || 'claro',
      pref.tamano_fuente || 'normal',
      pref.reducir_movimiento ?? 0,
      remotos.preferencias.actualizado_en,
      usuario.id,
    );
    aplicadas++;
  }

  return aplicadas;
}

/**
 * Sincroniza el usuario con la nube.
 * @param {string} correo
 * @returns {Promise<{ok: boolean, subidos: number, bajados: number, motivo?: string}>}
 */
export async function sincronizar(correo) {
  if (!hayNube()) {
    return { ok: false, subidos: 0, bajados: 0, motivo: 'sin nube configurada (DATABASE_URL)' };
  }

  const local = leerLocal(correo);
  if (!local) return { ok: false, subidos: 0, bajados: 0, motivo: 'usuario no encontrado' };

  try {
    await crearEsquemaRemoto();

    // ── Subir ──
    let subidos = 0;
    const remotos = {
      recetas: await leer(TABLA_RECETAS, correo, 'id'),
      favoritos: await leer(TABLA_FAVORITOS, correo, 'id'),
      preferencias: await leer(TABLA_PREFERENCIAS, correo),
    };
    const remotoUsuario = (await leer(TABLA_USUARIOS, correo))[0];

    if (!remotoUsuario || masReciente(local.usuario.actualizado_en, remotoUsuario.actualizado_en)) {
      await upsert(TABLA_USUARIOS, 'correo', {
        correo,
        datos: {
          nombre: local.usuario.nombre,
          rol: local.usuario.rol,
          estado: local.usuario.estado,
          avatar: local.usuario.avatar,
          avatar_imagen: local.usuario.avatar_imagen,
          color_perfil: local.usuario.color_perfil,
          bio: local.usuario.bio,
          contrasena_hash: local.usuario.contrasena_hash,
          creado_en: local.usuario.creado_en,
        },
        actualizado_en: local.usuario.actualizado_en,
      });
      subidos++;
    }

    for (const receta of local.recetas) {
      const remoto = remotos.recetas.find((f) => f.datos?.id === receta.id);
      if (!remoto || masReciente(receta.actualizado_en, remoto.actualizado_en)) {
        await upsert(TABLA_RECETAS, 'id', {
          id: receta.id,
          correo,
          datos: receta,
          actualizado_en: receta.actualizado_en,
        });
        subidos++;
      }
    }

    for (const favorito of local.favoritos) {
      const remoto = remotos.favoritos.find((f) => f.datos?.recipe_id === favorito.recipe_id);
      if (!remoto) {
        await upsert(TABLA_FAVORITOS, 'id', {
          id: favorito.id,
          correo,
          datos: favorito,
          actualizado_en: favorito.creado_en || new Date().toISOString(),
        });
        subidos++;
      }
    }

    const prefRemota = remotos.preferencias[0];
    if (
      local.preferencias &&
      (!prefRemota || masReciente(local.preferencias.actualizado_en, prefRemota.actualizado_en))
    ) {
      await upsert(TABLA_PREFERENCIAS, 'correo', {
        correo,
        datos: local.preferencias,
        actualizado_en: local.preferencias.actualizado_en || new Date().toISOString(),
      });
      subidos++;
    }

    // ── Bajar ──
    const bajados = aplicarLocal(correo, {
      recetas: remotos.recetas,
      favoritos: remotos.favoritos,
      preferencias: remotos.preferencias[0] || null,
    });

    getDb()
      .prepare(
        'INSERT INTO sync_state (correo, ultima_sync, detalle) VALUES (?, ?, ?) ON CONFLICT(correo) DO UPDATE SET ultima_sync = excluded.ultima_sync, detalle = excluded.detalle',
      )
      .run(correo, new Date().toISOString(), JSON.stringify({ subidos, bajados }));

    return { ok: true, subidos, bajados };
  } catch (err) {
    console.warn(`[SazónLab] Sincronización fallida (${err.message}).`);
    return { ok: false, subidos: 0, bajados: 0, motivo: err.message };
  }
}

/** Estado de la nube para el panel de Ajustes. */
export async function estadoNube() {
  const configurado = hayNube();
  const db = getDb();
  const ultima = db
    .prepare('SELECT correo, ultima_sync FROM sync_state ORDER BY ultima_sync DESC LIMIT 1')
    .get();

  let conexion = { conectado: false, motivo: 'sin DATABASE_URL' };
  if (configurado) {
    const inicio = Date.now();
    try {
      await obtenerPool().query('SELECT 1');
      conexion = { conectado: true, ms: Date.now() - inicio };
    } catch (err) {
      conexion = { conectado: false, motivo: err.message };
    }
  }

  return {
    configurado,
    host: hostNube(),
    conexion,
    ultimaSync: ultima?.ultima_sync || null,
    modo: configurado ? 'nube + caché local' : 'solo local (SQLite)',
  };
}
