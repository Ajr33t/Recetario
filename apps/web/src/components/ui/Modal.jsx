import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

/** Selectores de elementos enfocables dentro de un diálogo. */
const ENFOCABLES =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Modal glass propio — Fase 6 (RF-16: pop-ups modales con estilo glass).
 *
 * Características de accesibilidad (WCAG 2.1 AA):
 * - `role="dialog"` + `aria-modal="true"` + `aria-labelledby`.
 * - Trampa de foco: Tab/Shift+Tab ciclan dentro del diálogo (2.4.3 / 2.1.2).
 * - Esc cierra; el foco devuelve al elemento que lo abrió (2.4.3).
 * - Fondo: se puede cerrar con clic (opcional) sin cerrar al hacer clic
 *   dentro del panel.
 * - Portal a `document.body` para que quede por encima del layout.
 *
 * Uso: `<Modal open={abierto} onClose={cerrar} labelledBy="id-titulo">…</Modal>`
 */
export default function Modal({
  open,
  onClose,
  labelledBy,
  children,
  cerrarConFondo = true,
  backdropClass = 'bg-black/50 backdrop-blur-sm',
  className = '',
  ariaLabel,
}) {
  const panelRef = useRef(null);
  const openerRef = useRef(null);

  // Al abrir: guarda el disparador, enfoca el primer control; al cerrar
  // devuelve el foco (WCAG 2.4.3 Orden de foco).
  useEffect(() => {
    if (!open) return;
    openerRef.current = document.activeElement;
    const primer = panelRef.current?.querySelector(ENFOCABLES);
    (primer || panelRef.current)?.focus();
    return () => {
      openerRef.current?.focus?.();
    };
  }, [open]);

  // Esc cierra + trampa de foco con Tab
  useEffect(() => {
    if (!open) return;
    const onKey = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const panel = panelRef.current;
      if (!panel) return;
      const foco = [...panel.querySelectorAll(ENFOCABLES)].filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );
      if (foco.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }
      const primero = foco[0];
      const ultimo = foco[foco.length - 1];
      if (event.shiftKey && document.activeElement === primero) {
        event.preventDefault();
        ultimo.focus();
      } else if (!event.shiftKey && document.activeElement === ultimo) {
        event.preventDefault();
        primero.focus();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-[65] flex items-center justify-center p-4 ${backdropClass}`}
      onClick={cerrarConFondo ? onClose : undefined}
      role="presentation"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-label={ariaLabel}
        tabIndex={-1}
        className={`glass max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl p-6 outline-none ${className}`}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
