/**
 * Traductor EN → ES (Fase 4 — "todo siempre en español").
 *
 * Cadena de resolución por cada texto:
 *   1. Diccionario culinario local (instantáneo, offline).
 *   2. Caché permanente en SQLite (tabla `traducciones`).
 *   3. Google translate (sin clave) en lotes por líneas → MyMemory (respaldo).
 *   4. Si todo falla: se devuelve el original (nunca se rompe la búsqueda).
 *
 * Los resultados en línea se guardan en la caché para que solo se traduzca
 * una vez cada texto durante toda la vida del proyecto.
 */
import { getDb } from '../db/database.js';
import { conDiccionario, aIngles } from './diccionario.js';

export { aIngles };

const MAX_LOTE = 1200; // caracteres por petición en lotes
const TIMEOUT_MS = 8000;
const MAX_MYMEMORY = 450; // límite real de MyMemory por consulta
const ENFRIAMIENTO_MS = 60_000; // espera tras un 429 de Google

let consultas = null;
let googleBloqueadoHasta = 0; // tras 429 se usa solo MyMemory durante 1 min

const dormir = (ms) => new Promise((resolver) => setTimeout(resolver, ms));

function caché() {
  if (!consultas) {
    const db = getDb();
    db.exec(`CREATE TABLE IF NOT EXISTS traducciones (
      clave TEXT PRIMARY KEY,
      valor TEXT NOT NULL,
      creado_en TEXT NOT NULL DEFAULT (datetime('now'))
    )`);
    consultas = {
      leer: db.prepare('SELECT valor FROM traducciones WHERE clave = ?'),
      guardar: db.prepare('INSERT OR IGNORE INTO traducciones (clave, valor) VALUES (?, ?)'),
      // Traducción inversa: español → inglés (para lo traducido en línea)
      inverso: db.prepare('SELECT clave FROM traducciones WHERE valor = ? COLLATE NOCASE LIMIT 1'),
    };
  }
  return consultas;
}

// ── Proveedores en línea ──

/** Google translate (gtx, sin clave). Soporta lotes separados por \n. */
async function conGoogle(texto) {
  if (Date.now() < googleBloqueadoHasta) throw new Error('Google en enfriamiento (429)');
  const url =
    'https://translate.googleapis.com/translate_a/single' +
    `?client=gtx&sl=en&tl=es&dt=t&q=${encodeURIComponent(texto)}`;
  const respuesta = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (respuesta.status === 429) {
    // Cuota agotada: se enfría y se usa el respaldo sin castigar a Google
    googleBloqueadoHasta = Date.now() + ENFRIAMIENTO_MS;
    throw new Error('Google 429');
  }
  if (!respuesta.ok) throw new Error(`Google ${respuesta.status}`);
  const datos = await respuesta.json();
  return (datos[0] || []).map((seg) => seg[0]).join('');
}

/** MyMemory (respaldo, sin clave). Trocea textos largos a ≤450 caracteres. */
async function conMyMemory(texto) {
  if (texto.length <= MAX_MYMEMORY) return myMemoryUnico(texto);
  // Trocea por límites de frase/línea conservando los separadores
  const unidades = texto.split(/(?<=[.!?]\s+|\n+)/);
  const trozos = [];
  let actual = '';
  for (const unidad of unidades) {
    if (actual && actual.length + unidad.length > MAX_MYMEMORY) {
      trozos.push(actual);
      actual = '';
    }
    actual += unidad;
    while (actual.length > MAX_MYMEMORY) {
      trozos.push(actual.slice(0, MAX_MYMEMORY));
      actual = actual.slice(MAX_MYMEMORY);
    }
  }
  if (actual) trozos.push(actual);

  const partes = [];
  for (const trozo of trozos) {
    partes.push(await myMemoryUnico(trozo));
    await dormir(120); // cortesía con la API gratuita
  }
  return partes.join('');
}

async function myMemoryUnico(texto) {
  const url =
    'https://api.mymemory.translated.net/get' + `?q=${encodeURIComponent(texto)}&langpair=en|es`;
  const respuesta = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!respuesta.ok) throw new Error(`MyMemory ${respuesta.status}`);
  const datos = await respuesta.json();
  const traducido = datos.responseData?.translatedText;
  if (!traducido || datos.responseStatus !== 200) throw new Error('MyMemory vacío');
  return traducido;
}

async function proveedor(texto) {
  try {
    return await conGoogle(texto);
  } catch {
    return conMyMemory(texto);
  }
}

// ── API principal ──

/**
 * Traduce un lote de textos devolviendo un Map original → español.
 * @param {string[]} textos
 * @returns {Promise<Map<string, string>>}
 */
export async function traducirTextos(textos) {
  const unicos = [...new Set(textos.filter((t) => typeof t === 'string' && t.trim()))];
  const resultado = new Map();
  const tabla = caché();
  const pendientes = [];

  for (const texto of unicos) {
    const enDiccionario = conDiccionario(texto);
    if (enDiccionario) {
      resultado.set(texto, enDiccionario);
      continue;
    }
    const guardado = tabla.leer.get(texto)?.valor;
    if (guardado) {
      resultado.set(texto, guardado);
      continue;
    }
    pendientes.push(texto);
  }

  if (pendientes.length === 0) return resultado;

  // Los textos largos o multilínea viajan solos; el resto se agrupa en lotes
  const lotes = [];
  let actual = [];
  let longitud = 0;
  for (const texto of pendientes) {
    const esLargo = texto.length > 400 || texto.includes('\n');
    if (esLargo) {
      if (actual.length) {
        lotes.push(actual);
        actual = [];
        longitud = 0;
      }
      lotes.push([texto]);
      continue;
    }
    if (actual.length && longitud + texto.length + 1 > MAX_LOTE) {
      lotes.push(actual);
      actual = [];
      longitud = 0;
    }
    actual.push(texto);
    longitud += texto.length + 1;
  }
  if (actual.length) lotes.push(actual);

  for (const lote of lotes) {
    try {
      if (lote.length === 1) {
        const traducido = (await proveedor(lote[0])).trim();
        if (traducido) {
          resultado.set(lote[0], traducido);
          tabla.guardar.run(lote[0], traducido);
        }
        continue;
      }
      const crudo = await proveedor(lote.join('\n'));
      const lineas = crudo.split('\n');
      if (lineas.length === lote.length) {
        lote.forEach((texto, i) => {
          const traducido = lineas[i].trim();
          if (traducido) {
            resultado.set(texto, traducido);
            tabla.guardar.run(texto, traducido);
          }
        });
      } else {
        // El lote no se pudo separar: traducción individual (más lenta, correcta)
        for (const texto of lote) {
          const traducido = (await proveedor(texto)).trim();
          if (traducido) {
            resultado.set(texto, traducido);
            tabla.guardar.run(texto, traducido);
          }
        }
      }
    } catch (err) {
      console.warn(`[SazónLab] Traducción no disponible (${err.message}); texto original.`);
    }
  }

  return resultado;
}

/** Traduce un solo texto. Devuelve el original si no hay traducción. */
export async function traducir(texto) {
  const mapa = await traducirTextos([texto]);
  return mapa.get(texto) || texto;
}

/**
 * Español → inglés para las consultas: primero el diccionario local
 * y luego la caché de traducciones (áreas/títulos traducidos en línea,
 * p. ej. "Afgano" → "Afghan"). Si no hay coincidencia se devuelve igual.
 */
export async function aInglesConCache(texto) {
  const directo = aIngles(texto);
  if (directo !== texto) return directo;
  try {
    const fila = caché().inverso.get(String(texto).trim());
    if (fila) return fila.clave;
  } catch {
    // Sin caché disponible: se usa el texto tal cual
  }
  return texto;
}

/** Traduce una lista de textos en paralelo controlado (lotes de 40). */
export async function traducirLista(textos) {
  const salida = [];
  for (let i = 0; i < textos.length; i += 40) {
    const lote = textos.slice(i, i + 40);
    const mapa = await traducirTextos(lote);
    salida.push(...lote.map((t) => mapa.get(t) || t));
  }
  return salida;
}

/**
 * Traduce todos los campos visibles de una receta (título, categoría, área,
 * etiquetas, ingredientes con cantidades e instrucciones).
 * @template {{titulo?: string, categoria?: string|null, area?: string|null,
 *   etiquetas?: string[], ingredientes?: {nombre: string, cantidad?: string|null}[],
 *   instrucciones?: string}} T
 * @param {T} receta
 * @returns {Promise<T & {traducido: boolean, idioma: string}>}
 */
export async function traducirReceta(receta) {
  if (!receta) return receta;
  const originales = [
    receta.titulo,
    receta.categoria,
    receta.area,
    ...(receta.etiquetas || []),
    ...(receta.ingredientes || []).flatMap((i) => [i.nombre, i.cantidad]),
    receta.instrucciones,
  ].filter(Boolean);

  const mapa = await traducirTextos(originales);
  const aplicar = (t) => (t ? mapa.get(t) || t : t);

  const salida = {
    ...receta,
    titulo: aplicar(receta.titulo),
    categoria: aplicar(receta.categoria),
    area: aplicar(receta.area),
    etiquetas: (receta.etiquetas || []).map(aplicar),
    ingredientes: (receta.ingredientes || []).map((i) => ({
      ...i,
      nombre: aplicar(i.nombre),
      cantidad: aplicar(i.cantidad),
    })),
    instrucciones: aplicar(receta.instrucciones),
    idioma: 'es',
  };
  salida.traducido = originales.some((t) => mapa.get(t) && mapa.get(t) !== t);
  return salida;
}

/**
 * Traduce solo los títulos (y categoría si existe) de una lista de resúmenes.
 * @param {{titulo: string, categoria?: string|null}[]} recetas
 */
export async function traducirResumenes(recetas) {
  const textos = recetas.flatMap((r) => [r.titulo, r.categoria].filter(Boolean));
  const mapa = await traducirTextos(textos);
  return recetas.map((r) => ({
    ...r,
    titulo: (r.titulo && mapa.get(r.titulo)) || r.titulo,
    categoria: r.categoria ? mapa.get(r.categoria) || r.categoria : r.categoria,
    idioma: 'es',
  }));
}
