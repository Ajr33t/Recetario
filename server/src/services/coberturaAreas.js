/**
 * Cobertura de áreas de TheMealDB (fix «Explorar» — Fase 5).
 *
 * La API free de TheMealDB lista 195 áreas en `list.php?a=list`, pero
 * solo unas 30 tienen recetas reales (p. ej. Angolan, Bahamian, Afghan
 * o French devuelven 0 resultados). Si «Explorar» ofrece todas, casi
 * cualquier selección acaba en «Sin coincidencias» y parece roto.
 *
 * Solución: sondear cada área una vez (secuencial y con pausa para no
 * activar el rate-limit, que devuelve 0 falsos) y guardar el resultado
 * en SQLite durante 30 días. La ruta /search/filtros ofrece únicamente
 * las áreas con recetas; mientras la caché no está completa se devuelve
 * el listado completo (o los positivos ya conocidos) y se sondea en
 * segundo plano.
 */
import { getDb } from '../db/database.js';
import { contarArea, filtros } from './mealdb.js';

const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 días
const ENTRE_PETICIONES_MS = 300; // cortesía con la API gratuita
const ESPERA_CONFIRMACION_MS = 500; // tras un 0 se vuelve a preguntar
const COOLDOWN_SONDEO_MS = 5 * 60 * 1000; // entre sondeos fallidos

const dormir = (ms) => new Promise((resolver) => setTimeout(resolver, ms));

let consultas = null;
let sondeando = false;
let ultimoIntento = 0;

function tabla() {
  if (!consultas) {
    const db = getDb();
    db.exec(`CREATE TABLE IF NOT EXISTS cobertura_areas (
      area TEXT PRIMARY KEY,
      con_recetas INTEGER NOT NULL,
      actualizado_en INTEGER NOT NULL
    )`);
    consultas = {
      leer: db.prepare('SELECT area, con_recetas, actualizado_en FROM cobertura_areas'),
      guardar: db.prepare(`INSERT INTO cobertura_areas (area, con_recetas, actualizado_en)
        VALUES (?, ?, ?)
        ON CONFLICT(area) DO UPDATE SET
          con_recetas = excluded.con_recetas,
          actualizado_en = excluded.actualizado_en`),
    };
  }
  return consultas;
}

/** Sondea en segundo plano las áreas sin caché vigente (una sola vez). */
export function sondearCobertura() {
  if (sondeando || Date.now() - ultimoIntento < COOLDOWN_SONDEO_MS) return;
  sondeando = true;
  ultimoIntento = Date.now();

  (async () => {
    try {
      const { areas } = await filtros();
      const conocidas = new Map(
        tabla()
          .leer.all()
          .map((f) => [f.area, f]),
      );
      const expirada = (f) => !f || f.actualizado_en < Date.now() - TTL_MS;
      const pendientes = areas.filter((a) => expirada(conocidas.get(a)));

      let consultadas = 0;
      for (const area of pendientes) {
        try {
          let n = await contarArea(area);
          if (n === 0) {
            // Un 0 puede ser rate-limit: se confirma antes de darlo por válido
            await dormir(ESPERA_CONFIRMACION_MS);
            n = await contarArea(area);
          }
          tabla().guardar.run(area, n > 0 ? 1 : 0, Date.now());
          consultadas++;
        } catch {
          // Red o cuota agotada: se reintenta en el próximo sondeo
        }
        await dormir(ENTRE_PETICIONES_MS);
      }
      console.log(
        `[SazónLab] Cobertura de áreas actualizada: ${consultadas}/${pendientes.length} consultadas.`,
      );
    } catch (err) {
      console.warn(`[SazónLab] Sondeo de cobertura no disponible: ${err.message}`);
    } finally {
      sondeando = false;
    }
  })();
}

/**
 * Filtra las áreas sin recetas de TheMealDB.
 * @param {string[]} areasCrudas — listado en inglés de `filtros()`
 * @returns {string[] | null} las áreas con recetas (con al menos 5
 *   conocidas) o null si aún no hay datos suficientes: entonces el
 *   llamante usa el listado completo mientras se sondea en background.
 */
export function areasConRecetas(areasCrudas) {
  const vigente = (f) => f && f.actualizado_en >= Date.now() - TTL_MS;
  const conocidas = new Map(
    tabla()
      .leer.all()
      .map((f) => [f.area, f]),
  );
  const completo = areasCrudas.every((a) => vigente(conocidas.get(a)));

  if (completo) {
    return areasCrudas.filter((a) => conocidas.get(a).con_recetas === 1);
  }

  sondearCobertura();
  // Durante el primer sondeo se ofrecen solo los positivos conocidos
  // (para que todo lo visible funcione), salvo que aún no haya ninguno.
  const positivas = areasCrudas.filter((a) => {
    const f = conocidas.get(a);
    return f && vigente(f) && f.con_recetas === 1;
  });
  return positivas.length >= 5 ? positivas : null;
}
