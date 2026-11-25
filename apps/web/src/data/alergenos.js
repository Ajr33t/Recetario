/**
 * Catálogo de alérgenos alimentarios (punto 4 del encargo).
 * Se usa en: formulario de platos, ficha de receta, carta digital, leyenda
 * de exportes y filtro del comensal.
 * Los valores son las claves que se guardan en `recipes.alergenos` y en
 * `carta_platos.alergenos` (JSON en la base de datos).
 */
export const ALERGENOS = [
  { clave: 'gluten', etiqueta: 'Gluten', icono: '🌾' },
  { clave: 'lactosa', etiqueta: 'Lácteos / lactosa', icono: '🥛' },
  { clave: 'huevo', etiqueta: 'Huevo', icono: '🥚' },
  { clave: 'pescado', etiqueta: 'Pescado', icono: '🐟' },
  { clave: 'mariscos', etiqueta: 'Mariscos / crustáceos', icono: '🦐' },
  { clave: 'frutos_secos', etiqueta: 'Frutos secos', icono: '🌰' },
  { clave: 'cacahuetes', etiqueta: 'Cacahuetes', icono: '🥜' },
  { clave: 'soja', etiqueta: 'Soja', icono: '🫘' },
  { clave: 'apio', etiqueta: 'Apio', icono: '🌿' },
  { clave: 'mostaza', etiqueta: 'Mostaza', icono: '🧂' },
  { clave: 'sesamo', etiqueta: 'Sésamo', icono: '⚪' },
  { clave: 'sulfitos', etiqueta: 'Sulfitos', icono: '🍷' },
];

/** Busca la etiqueta legible de una clave (la clave si no está en el catálogo). */
export function etiquetaAlergeno(clave) {
  return ALERGENOS.find((a) => a.clave === clave)?.etiqueta || String(clave);
}

/** Busca el emoji representativo de una clave (uno genérico si no existe). */
export function iconoAlergeno(clave) {
  return ALERGENOS.find((a) => a.clave === clave)?.icono || '⚠️';
}

/** Normaliza una lista venida de la BD (JSON/string/array) a array de claves. */
export function normalizarAlergenos(valor) {
  if (Array.isArray(valor)) return valor.map(String);
  if (typeof valor !== 'string' || !valor.trim()) return [];
  try {
    const parsed = JSON.parse(valor);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

/**
 * Detecta alérgenos presentes en los nombres de ingredientes (precarga).
 * Es orientativo: el usuario puede marcar/desmarcar antes de guardar.
 */
export function detectarAlergenos(ingredientes = []) {
  const señales = {
    gluten: ['harina', 'trigo', 'pan', 'pasta', 'cuscús', 'cebada', 'centeno', 'avena'],
    lactosa: ['leche', 'queso', 'yogur', 'mantequilla', 'crema', 'nata'],
    huevo: ['huevo', 'clara', 'yema', 'mayonesa'],
    pescado: ['pescado', 'salmón', 'atún', 'bacalao', 'merluza', 'anchoa'],
    mariscos: ['camarón', 'gamba', 'langostino', 'cangrejo', 'mejillón', 'almeja', 'pulpo', 'calamar'],
    frutos_secos: ['almendra', 'nueces', 'avellana', 'pistacho', 'anacardo'],
    cacahuetes: ['cacahuete', 'maní', 'peanut'],
    soja: ['soja', 'tofu', 'tempeh'],
    apio: ['apio'],
    mostaza: ['mostaza'],
    sesamo: ['sésamo', 'ajonjolí', 'tahini'],
    sulfitos: ['vino', 'vinagre', 'sulfito'],
  };
  const texto = ingredientes
    .map((i) => (typeof i === 'string' ? i : i?.nombre || ''))
    .join(' ')
    .toLowerCase();
  return ALERGENOS.filter(({ clave }) => señales[clave].some((s) => texto.includes(s))).map(
    ({ clave }) => clave,
  );
}
