/**
 * Historial de búsquedas del usuario (RF-11 — Fase 9).
 * Persiste en localStorage (sin cuenta, sin servidor): guarda la última
 * configuración de cada búsqueda distinta para repetirla con un clic.
 */
const CLAVE = 'sazonlab:historial-busquedas';
const MAX = 8;

/** @returns {Array<{clave: string, tipo: string, etiqueta: string}>} */
export function obtenerHistorial() {
  try {
    const datos = JSON.parse(localStorage.getItem(CLAVE) || '[]');
    return Array.isArray(datos) ? datos : [];
  } catch {
    return [];
  }
}

/**
 * Guarda una búsqueda al frente del historial (sin duplicados, tope 8).
 * @param {{tipo: 'ingredientes'|'nombre'|'categorias', etiqueta: string}} entrada
 * @returns {Array} la lista actualizada
 */
export function guardarBusqueda(entrada) {
  const clave = `${entrada.tipo}:${entrada.etiqueta}`.trim().toLowerCase();
  const actual = obtenerHistorial();
  const lista = [{ ...entrada, clave }, ...actual.filter((e) => e.clave !== clave)].slice(0, MAX);
  try {
    localStorage.setItem(CLAVE, JSON.stringify(lista));
  } catch {
    /* almacenamiento no disponible: el historial es opcional */
  }
  return lista;
}

/** Borra todo el historial (botón «Vaciar»). */
export function vaciarHistorial() {
  try {
    localStorage.removeItem(CLAVE);
  } catch {
    /* sin efecto */
  }
  return [];
}
