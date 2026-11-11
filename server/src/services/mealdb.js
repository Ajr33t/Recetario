/**
 * Cliente de TheMealDB (Fase 4) con caché en memoria.
 * API pública sin clave (endpoint /1/). Los resultados se cachean 10 min
 * para no saturar el servicio externo.
 */
import { DICCIONARIO } from './diccionario.js';

const BASE = 'https://www.themealdb.com/api/json/v1/1';
const TTL_MS = 10 * 60 * 1000;

/** @type {Map<string, {datos: unknown, expira: number}>} */
const cache = new Map();

async function obtener(ruta) {
  const clave = ruta;
  const golpe = cache.get(clave);
  if (golpe && golpe.expira > Date.now()) return golpe.datos;

  const respuesta = await fetch(`${BASE}${ruta}`);
  if (!respuesta.ok) {
    throw Object.assign(new Error(`TheMealDB respondió ${respuesta.status}`), {
      status: 502,
    });
  }
  const datos = await respuesta.json();
  cache.set(clave, { datos, expira: Date.now() + TTL_MS });
  return datos;
}

/** Normaliza una receta de TheMealDB a la forma interna. */
export function normalizar(meal) {
  if (!meal) return null;
  const ingredientes = [];
  for (let i = 1; i <= 20; i++) {
    const nombre = meal[`strIngredient${i}`]?.trim();
    if (nombre) {
      ingredientes.push({ nombre, cantidad: meal[`strMeasure${i}`]?.trim() || null });
    }
  }
  return {
    id: meal.idMeal,
    titulo: meal.strMeal,
    imagen: meal.strMealThumb,
    categoria: meal.strCategory || null,
    area: meal.strArea || null,
    etiquetas: meal.strTags ? meal.strTags.split(',').map((t) => t.trim()) : [],
    ingredientes,
    instrucciones: meal.strInstructions || '',
    video: meal.strYoutube || null,
    fuente: meal.strSource || null,
    fuenteDatos: 'themealdb',
  };
}

/** Busca recetas por nombre (parcial). */
export async function buscarPorNombre(consulta) {
  const datos = await obtener(`/search.php?s=${encodeURIComponent(consulta)}`);
  return (datos.meals || []).map(normalizar);
}

/**
 * Busca recetas que contengan los ingredientes indicados.
 * Nota: el filtro multi-ingrediente oficial (i=a,b) de TheMealDB devuelve
 * null vacío, así que se consulta ingrediente por ingrediente y se fusiona
 * por frecuencia: las recetas que usan más de tus ingredientes van primero.
 */
export async function buscarPorIngredientes(ingredientes) {
  if (ingredientes.length === 1) {
    const datos = await obtener(`/filter.php?i=${encodeURIComponent(ingredientes[0])}`);
    return (datos.meals || []).map((m) => ({
      id: m.idMeal,
      titulo: m.strMeal,
      imagen: m.strMealThumb,
      coincidencias: 1,
      fuenteDatos: 'themealdb',
    }));
  }

  const consultas = await Promise.allSettled(
    ingredientes.map((i) => obtener(`/filter.php?i=${encodeURIComponent(i)}`)),
  );

  const cuenta = new Map();
  for (const consulta of consultas) {
    if (consulta.status !== 'fulfilled') continue;
    for (const m of consulta.value.meals || []) {
      const previo = cuenta.get(m.idMeal) || { meal: m, coincidencias: 0 };
      previo.coincidencias += 1;
      cuenta.set(m.idMeal, previo);
    }
  }

  return [...cuenta.values()]
    .sort((a, b) => b.coincidencias - a.coincidencias)
    .slice(0, 12)
    .map(({ meal, coincidencias }) => ({
      id: meal.idMeal,
      titulo: meal.strMeal,
      imagen: meal.strMealThumb,
      coincidencias,
      fuenteDatos: 'themealdb',
    }));
}

/** Detalle completo por id. */
export async function detallePorId(id) {
  const datos = await obtener(`/lookup.php?i=${encodeURIComponent(id)}`);
  return normalizar(datos.meals?.[0] || null);
}

/** Recetas aleatorias (para destacadas del inicio). */
export async function aleatorias(cantidad = 3) {
  const resultados = await Promise.all(
    Array.from({ length: cantidad }, () => obtener('/random.php')),
  );
  return resultados.map((d) => normalizar(d.meals?.[0])).filter(Boolean);
}

/**
 * Cuenta las recetas de un área (sondeo de cobertura — Fase 5).
 * La API free de TheMealDB lista 195 áreas pero solo unas pocas tienen
 * recetas; se usa para no ofrecer filtros que siempre dan 0 resultados.
 */
export async function contarArea(area) {
  const datos = await obtener(`/filter.php?a=${encodeURIComponent(area)}`);
  return (datos.meals || []).length;
}

/** Categorías y áreas (para los filtros de búsqueda). */
export async function filtros() {
  const [categorias, areas] = await Promise.all([
    obtener('/list.php?c=list'),
    obtener('/list.php?a=list'),
  ]);
  return {
    categorias: (categorias.meals || []).map((m) => m.strCategory),
    areas: (areas.meals || []).map((m) => m.strArea),
  };
}

/**
 * Explora por categoría o área (un solo filtro a la vez; TheMealDB
 * prioriza la categoría cuando se envían ambas).
 */
export async function explorar({ categoria = '', area = '' } = {}) {
  const ruta = categoria
    ? `/filter.php?c=${encodeURIComponent(categoria)}`
    : `/filter.php?a=${encodeURIComponent(area)}`;
  const datos = await obtener(ruta);
  return (datos.meals || []).slice(0, 24).map((m) => ({
    id: m.idMeal,
    titulo: m.strMeal,
    imagen: m.strMealThumb,
    fuenteDatos: 'themealdb',
  }));
}

/** Listado global de ingredientes de TheMealDB (para autocompletado). */
export async function ingredientesTodos() {
  const datos = await obtener('/list.php?i=list');
  return (datos.meals || []).map((m) => m.strIngredient).filter(Boolean);
}

/**
 * Autocompletado (Fase 4): por tipo, hasta 7 sugerencias.
 * - 'ingrediente': filtra el listado global en memoria; acepta búsqueda
 *   parcial en español usando el diccionario culinario local.
 * - 'receta': busca nombres parciales en TheMealDB (llega ya en inglés).
 */
export async function autocomplete(texto, tipo = 'receta', textoOriginal = texto) {
  const t = texto.trim().toLowerCase();
  const tEsp = (textoOriginal || '').trim().toLowerCase();
  if (t.length < 2 && tEsp.length < 2) return [];

  if (tipo === 'ingrediente') {
    const todas = await ingredientesTodos();
    const exactos = [];
    const contienen = [];
    for (const nombre of todas) {
      const min = nombre.toLowerCase();
      const es = DICCIONARIO[min] ? DICCIONARIO[min].toLowerCase() : null;
      const empiezaEn = min.startsWith(t) || Boolean(es && es.startsWith(tEsp));
      const contiene = min.includes(t) || Boolean(es && es.includes(tEsp));
      if (empiezaEn) exactos.push(nombre);
      else if (contiene) contienen.push(nombre);
    }
    return [...exactos, ...contienen].slice(0, 7);
  }

  const recetas = await buscarPorNombre(t);
  return recetas.slice(0, 7).map((r) => ({ id: r.id, titulo: r.titulo, imagen: r.imagen }));
}

/**
 * Sugerencias de respaldo SIN IA: busca por los ingredientes dados
 * (y por el primero en nombre como alternativa) y devuelve hasta 12.
 */
export async function sugerenciasSinIA(ingredientes) {
  let recetas = [];
  try {
    recetas = await buscarPorIngredientes(ingredientes);
  } catch {
    recetas = [];
  }
  if (recetas.length === 0 && ingredientes.length > 0) {
    try {
      recetas = await buscarPorNombre(ingredientes[0]);
    } catch {
      recetas = [];
    }
  }
  return recetas.slice(0, 12);
}
