/**
 * Sistema de notificaciones (toasts) propio — Fase 6 (Sprint 8 IEEE).
 *
 * - Sin dependencias: cola de toasts visibles + historial para la campana
 *   del header (últimos 20, con estado no leído).
 * - Totalmente testeable en Node (`node --test`): no toca `window` en el
 *   módulo; los temporizadores se disparan solo al notificar.
 * - React se suscribe con `useSyncExternalStore(suscribir, obtenerToasts)`.
 *
 * Uso: `import { exito, fracaso, informar } from '.../services/toast.js'`
 */

/** Máximo de notificaciones guardadas en el historial (campana). */
export const MAX_HISTORIAL = 20;

/** Duración por defecto de un toast en pantalla (ms). */
export const DURACION_MS = 3500;

let secuencia = 0;
let toasts = [];
let historial = [];
const oyentes = new Set();
const temporizadores = new Map();

function emitir() {
  for (const fn of oyentes) fn();
}

/** Suscripción para `useSyncExternalStore`. Devuelve la función de baja. */
export function suscribir(fn) {
  oyentes.add(fn);
  return () => oyentes.delete(fn);
}

/** Toasts visibles ahora mismo (snapshot inmutable). */
export function obtenerToasts() {
  return toasts;
}

/** Historial para la campana: más reciente primero (máx. MAX_HISTORIAL). */
export function obtenerHistorial() {
  return historial;
}

/** Cantidad de notificaciones sin leer. */
export function contarNoLeidas() {
  return historial.filter((n) => !n.visto).length;
}

/**
 * Muestra un toast y lo registra en el historial.
 * @param {string} mensaje texto (siempre en español, corto)
 * @param {{tipo?: 'success'|'error'|'info', duracion?: number}} [opciones]
 *   `duracion: 0` deja el toast hasta cerrarlo a mano.
 * @returns {number} id del toast
 */
export function notificar(mensaje, opciones = {}) {
  const { tipo = 'info', duracion = DURACION_MS } = opciones;
  const id = ++secuencia;
  const registro = { id, tipo, mensaje: String(mensaje), en: Date.now(), visto: false };

  toasts = [...toasts, registro];
  historial = [registro, ...historial].slice(0, MAX_HISTORIAL);

  if (duracion > 0) {
    temporizadores.set(
      id,
      setTimeout(() => quitarToast(id), duracion),
    );
  }
  emitir();
  return id;
}

/** Cierra un toast por id (idempotente). */
export function quitarToast(id) {
  const timer = temporizadores.get(id);
  if (timer) clearTimeout(timer);
  temporizadores.delete(id);
  const antes = toasts.length;
  toasts = toasts.filter((t) => t.id !== id);
  if (toasts.length !== antes) emitir();
}

/** Cierra todos los toasts visibles (el historial se conserva). */
export function vaciarToasts() {
  for (const id of temporizadores.keys()) {
    clearTimeout(temporizadores.get(id));
  }
  temporizadores.clear();
  if (toasts.length > 0) {
    toasts = [];
    emitir();
  }
}

/** Marca todo el historial como leído (al abrir la campana). */
export function marcarLeidos() {
  if (historial.some((n) => !n.visto)) {
    historial = historial.map((n) => ({ ...n, visto: true }));
    emitir();
  }
}

/** Vacía el historial de la campana. */
export function vaciarHistorial() {
  historial = [];
  emitir();
}

/** Acción correcta: `exito('Receta guardada')`. */
export function exito(mensaje, opciones = {}) {
  return notificar(mensaje, { ...opciones, tipo: 'success' });
}

/** Error: `fracaso('No se pudo guardar')` (anuncio assertivo). */
export function fracaso(mensaje, opciones = {}) {
  return notificar(mensaje, { ...opciones, tipo: 'error' });
}

/** Informativo: `informar('Quitada de favoritos')`. */
export function informar(mensaje, opciones = {}) {
  return notificar(mensaje, { ...opciones, tipo: 'info' });
}

/**
 * Texto relativo en español para el historial («ahora», «hace 2 min»).
 * Puro: recibe el desfase en ms para poder testearse.
 */
export function tiempoRelativo(desfaseMs) {
  const seg = Math.max(0, Math.floor(desfaseMs / 1000));
  if (seg < 15) return 'ahora';
  if (seg < 60) return `hace ${seg} s`;
  const min = Math.floor(seg / 60);
  if (min < 60) return `hace ${min} min`;
  const horas = Math.floor(min / 60);
  if (horas < 24) return `hace ${horas} h`;
  return `hace ${Math.floor(horas / 24)} d`;
}
