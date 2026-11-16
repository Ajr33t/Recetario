/**
 * Medidas y conversor (idea del cliente — Fase 5).
 *
 * Tabla de equivalencias fijas español ↔ inglés para recetas
 * (cucharadas, tazas, onzas…) y funciones de conversión. Compartida
 * por la página /medidas y por la página fija del libro de cocina.
 *
 * Factores de referencia (sistema internacional):
 *  - Volumen: base mililitros (ml).
 *  - Peso: base gramos (g).
 *  - Temperatura: fórmulas propias (°C ↔ °F).
 */

/** @typedef {{id: string, es: string, en: string, grupo: string, factor: number}} Medida */

/** @type {Medida[]} Volumen — factor = ml exactos por unidad. */
export const VOLUMEN = [
  { id: 'ml', es: 'Mililitro', en: 'Milliliter (ml)', grupo: 'volumen', factor: 1 },
  { id: 'l', es: 'Litro', en: 'Liter (l)', grupo: 'volumen', factor: 1000 },
  { id: 'cucharadita', es: 'Cucharadita', en: 'Teaspoon (tsp)', grupo: 'volumen', factor: 4.92892 },
  { id: 'cucharada', es: 'Cucharada', en: 'Tablespoon (tbsp)', grupo: 'volumen', factor: 14.7868 },
  {
    id: 'onzaliq',
    es: 'Onza líquida',
    en: 'Fluid ounce (fl oz)',
    grupo: 'volumen',
    factor: 29.5735,
  },
  { id: 'taza', es: 'Taza', en: 'Cup', grupo: 'volumen', factor: 236.588 },
  { id: 'pinta', es: 'Pinta', en: 'Pint (pt)', grupo: 'volumen', factor: 473.176 },
  { id: 'cuarto', es: 'Cuarto de galón', en: 'Quart (qt)', grupo: 'volumen', factor: 946.353 },
  { id: 'galon', es: 'Galón', en: 'Gallon (gal)', grupo: 'volumen', factor: 3785.41 },
];

/** @type {Medida[]} Peso — factor = gramos exactos por unidad. */
export const PESO = [
  { id: 'g', es: 'Gramo', en: 'Gram (g)', grupo: 'peso', factor: 1 },
  { id: 'kg', es: 'Kilogramo', en: 'Kilogram (kg)', grupo: 'peso', factor: 1000 },
  { id: 'onza', es: 'Onza', en: 'Ounce (oz)', grupo: 'peso', factor: 28.3495 },
  { id: 'libra', es: 'Libra', en: 'Pound (lb)', grupo: 'peso', factor: 453.592 },
];

/** Unidades de temperatura (sin factor: se convierten con fórmulas). */
export const TEMPERATURA = [
  { id: 'c', es: 'Grados Celsius', en: 'Celsius (°C)', grupo: 'temperatura' },
  { id: 'f', es: 'Grados Fahrenheit', en: 'Fahrenheit (°F)', grupo: 'temperatura' },
];

/** Todas las medidas para los selectores del conversor. */
export const MEDIDAS = [...VOLUMEN, ...PESO, ...TEMPERATURA];

/** Convierte una cantidad entre dos medidas del mismo grupo. */
export function convertir(valor, deId, aId) {
  const de = MEDIDAS.find((m) => m.id === deId);
  const a = MEDIDAS.find((m) => m.id === aId);
  if (!de || !a || de.grupo !== a.grupo || Number.isNaN(valor)) return null;
  if (de.grupo === 'temperatura') {
    if (de.id === a.id) return valor;
    // °C → °F y °F → °C
    return de.id === 'c' ? valor * 1.8 + 32 : ((valor - 32) * 5) / 9;
  }
  return (valor * de.factor) / a.factor;
}

/** Formatea un resultado con hasta 4 decimales (sin ceros sobrantes). */
export function formatear(valor) {
  if (valor == null || Number.isNaN(valor)) return '—';
  return Number(valor.toFixed(4)).toLocaleString('es-ES');
}

/**
 * Filas de la tabla de equivalencias: «1 cucharada (tablespoon) = 14,79 ml».
 * Usa siempre la unidad base del grupo (ml / g) como referencia.
 */
export function filasEquivalencias(unidades) {
  const base = unidades[0]; // ml o g (factor 1)
  return unidades.map((u) => ({
    es: u.es,
    en: u.en,
    valor: formatear(u.factor / base.factor),
    base: base.es.toLowerCase(),
  }));
}

/** Equivalencias directas de temperatura para la tabla. */
export const TEMPERATURA_EQUIVALENCIAS = [
  { es: '0 °C', en: '32 °F', nota: 'punto de congelación del agua' },
  { es: '20 °C', en: '68 °F', nota: 'temperatura ambiente' },
  { es: '37 °C', en: '98,6 °F', nota: 'temperatura corporal' },
  { es: '100 °C', en: '212 °F', nota: 'punto de ebullición del agua' },
  { es: '180 °C', en: '356 °F', nota: 'horno moderado' },
  { es: '200 °C', en: '392 °F', nota: 'horno caliente' },
  { es: '220 °C', en: '428 °F', nota: 'horno fuerte' },
];
