import { useSyncExternalStore } from 'react';
import { suscribir, obtenerToasts, quitarToast } from '../../services/toast.js';

const ICONOS = {
  success: 'fa-circle-check',
  error: 'fa-circle-exclamation',
  info: 'fa-circle-info',
};

const COLOR_ICONO = {
  success: 'text-success',
  error: 'text-danger',
  info: 'text-primary',
};

/**
 * Contenedor de notificaciones (toasts) — Fase 6 (Sprint 8 IEEE).
 *
 * - Siempre montado: las regiones `aria-live` deben existir en el DOM
 *   ANTES de que entre el texto para que los lectores de pantalla lo anuncien.
 * - `role="status"` (polite) para éxito/info y `role="alert"` (assertive)
 *   para errores — WCAG 4.1.3 (Mensajes de estado).
 * - Cristal Liquid Glass con los tokens del tema activo (12 × 3).
 */
export default function ToastHost() {
  const toasts = useSyncExternalStore(suscribir, obtenerToasts, obtenerToasts);

  return (
    <div
      className="pointer-events-none fixed right-4 top-4 z-[70] flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2"
      role="region"
      aria-label="Notificaciones"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role={t.tipo === 'error' ? 'alert' : 'status'}
          className="glass pointer-events-auto flex items-start gap-3 rounded-xl p-3 shadow-lg"
        >
          <i
            className={`fa-solid ${ICONOS[t.tipo] || ICONOS.info} mt-0.5 text-lg ${
              COLOR_ICONO[t.tipo] || COLOR_ICONO.info
            }`}
            aria-hidden="true"
          />
          <p className="min-w-0 flex-1 text-sm leading-snug">{t.mensaje}</p>
          <button
            type="button"
            className="-m-1 rounded-lg p-1 text-muted-foreground hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            aria-label={`Cerrar notificación: ${t.mensaje}`}
            onClick={() => quitarToast(t.id)}
          >
            <i className="fa-solid fa-xmark" aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
}
