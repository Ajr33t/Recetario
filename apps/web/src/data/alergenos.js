/**
 * Catálogo de alérgenos alimentarios (punto 4 del encargo).
 * Se usa en: formulario de platos, ficha de receta, carta digital, leyenda
 * de exportes y filtro del comensal.
 * Los valores son las claves que se guardan en `recipes.alergenos` y en
 * `carta_platos.alergenos` (JSON en la base de datos).
 * Se muestran solo etiquetas de texto, sin emojis.
 */
export const ALERGENOS = [
  { clave: 'gluten', etiqueta: 'Gluten' },
  { clave: 'lactosa', etiqueta: 'Lácteos / lactosa' },
  { clave: 'huevo', etiqueta: 'Huevo' },
  { clave: 'pescado', etiqueta: 'Pescado' },
  { clave: 'mariscos', etiqueta: 'Mariscos / crustáceos' },
  { clave: 'frutos_secos', etiqueta: 'Frutos secos' },
  { clave: 'cacahuetes', etiqueta: 'Cacahuetes' },
  { clave: 'soja', etiqueta: 'Soja' },
  { clave: 'apio', etiqueta: 'Apio' },
  { clave: 'mostaza', etiqueta: 'Mostaza' },
  { clave: 'sesamo', etiqueta: 'Sésamo' },
  { clave: 'sulfitos', etiqueta: 'Sulfitos' },
];

/** Busca la etiqueta legible de una clave (la clave si no está en el catálogo). */
export function etiquetaAlergeno(clave) {
  return ALERGENOS.find((a) => a.clave === clave)?.etiqueta || String(clave);
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
