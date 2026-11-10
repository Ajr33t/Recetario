import { useEffect, useRef } from 'react';
import { THEMES, getPalette } from '../../themes/palettes.js';
import { useThemeStore } from '../../store/themeStore.js';

const MODOS = [
  { id: 'claro', label: 'Claro', icon: 'fa-sun' },
  { id: 'oscuro', label: 'Oscuro', icon: 'fa-moon' },
];

/**
 * Modal de selección de tema (12) + modo (claro/oscuro) + alto contraste.
 * - El alto contraste es un interruptor INDEPENDIENTE del modo (prevalece sobre él).
 * - Vista previa en vivo: cada clic aplica de inmediato.
 * - Cancelar (Esc / fondo / botón) restaura la combinación original.
 * - Aplicar confirma y cierra. Devuelve el foco al botón que lo abrió.
 */
export default function ThemeSelector({ open, onClose }) {
  const theme = useThemeStore((s) => s.theme);
  const mode = useThemeStore((s) => s.mode);
  const highContrast = useThemeStore((s) => s.highContrast);
  const setTheme = useThemeStore((s) => s.setTheme);
  const setMode = useThemeStore((s) => s.setMode);
  const setHighContrast = useThemeStore((s) => s.setHighContrast);

  const dialogRef = useRef(null);
  const openerRef = useRef(null);
  const originalRef = useRef(null);

  // Al abrir: guarda la combinación original, enfoca el primer control y
  // al cerrar devuelve el foco al disparador (WCAG 2.4.3).
  useEffect(() => {
    if (!open) return;
    const s = useThemeStore.getState();
    originalRef.current = { theme: s.theme, mode: s.mode, highContrast: s.highContrast };
    openerRef.current = document.activeElement;
    const first = dialogRef.current?.querySelector('input, button');
    first?.focus();
    return () => {
      openerRef.current?.focus?.();
    };
  }, [open]);

  // Esc cancela (restaura la combinación original)
  useEffect(() => {
    if (!open) return;
    const onKey = (event) => {
      if (event.key === 'Escape') cancelar();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  function cancelar() {
    const original = originalRef.current;
    if (original) {
      setTheme(original.theme);
      setMode(original.mode);
      setHighContrast(original.highContrast);
    }
    onClose();
  }

  function aplicar() {
    onClose();
  }

  // Paleta efectiva para las muestras de color (prevalece el alto contraste)
  const modoEfectivo = highContrast ? 'alto-contraste' : mode;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={cancelar}
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="theme-selector-title"
        className="glass flex max-h-[90vh] w-full max-w-3xl flex-col gap-5 overflow-y-auto rounded-2xl p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="theme-selector-title">
              <i className="fa-solid fa-palette text-primary" aria-hidden="true" /> Tema y modo
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              12 temas × 2 modos + interruptor de alto contraste. La vista previa se aplica en vivo.
            </p>
          </div>
          <button
            type="button"
            className="btn-ghost !px-2.5"
            aria-label="Cancelar y cerrar selector de temas"
            onClick={cancelar}
          >
            <i className="fa-solid fa-xmark text-lg" aria-hidden="true" />
          </button>
        </div>

        {/* Modo (claro/oscuro) */}
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">Modo de apariencia</legend>
          <div className="flex flex-wrap items-center gap-3">
            {MODOS.map(({ id, label, icon }) => (
              <label
                key={id}
                className={`glass flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium ${
                  mode === id && !highContrast ? 'ring-2 ring-primary' : ''
                } ${highContrast ? 'opacity-70' : ''}`}
              >
                <input
                  type="radio"
                  name="modo-apariencia"
                  value={id}
                  checked={mode === id}
                  onChange={() => setMode(id)}
                  className="sr-only"
                  disabled={highContrast}
                />
                <i className={`fa-solid ${icon}`} aria-hidden="true" /> {label}
              </label>
            ))}

            {/* Alto contraste: interruptor independiente del modo (prevalece) */}
            <label
              className={`glass flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold ${
                highContrast ? 'ring-2 ring-primary' : ''
              }`}
            >
              <input
                type="checkbox"
                checked={highContrast}
                onChange={(event) => setHighContrast(event.target.checked)}
                className="sr-only"
              />
              <span
                aria-hidden="true"
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  highContrast ? 'bg-primary' : 'bg-muted'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    highContrast ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </span>
              <i className="fa-solid fa-circle-half-stroke" aria-hidden="true" /> Alto contraste
              (AAA)
            </label>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {highContrast
              ? 'Alto contraste ACTIVO: prevalece sobre el modo (texto ≥ 7:1). Desactívalo para volver al modo claro/oscuro.'
              : 'El alto contraste se puede activar por separado; no depende del modo claro/oscuro.'}
          </p>
        </fieldset>

        {/* 12 temas */}
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">Tema</legend>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3" role="list">
            {THEMES.map((t) => {
              const p = getPalette(t.id, modoEfectivo);
              return (
                <li key={t.id}>
                  <label
                    className={`glass flex cursor-pointer flex-col gap-2 rounded-xl p-3 ${
                      theme === t.id ? 'ring-2 ring-primary' : ''
                    }`}
                  >
                    <input
                      type="radio"
                      name="tema-apariencia"
                      value={t.id}
                      checked={theme === t.id}
                      onChange={() => setTheme(t.id)}
                      className="sr-only"
                    />
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      <i className={`fa-solid ${t.icon} text-primary`} aria-hidden="true" />
                      {t.name}
                      {theme === t.id && (
                        <i className="fa-solid fa-check text-primary" aria-label="Seleccionado" />
                      )}
                    </span>
                    <span className="flex gap-1.5" aria-hidden="true">
                      {[p.bg, p.primary, p.accent, p.fg].map((color, i) => (
                        <span
                          key={i}
                          className="h-5 w-5 rounded-full border border-[var(--glass-border)]"
                          style={{ background: color }}
                        />
                      ))}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </fieldset>

        {/* Acciones */}
        <div className="flex flex-wrap justify-end gap-3">
          <button type="button" className="btn-ghost" onClick={cancelar}>
            Cancelar
          </button>
          <button type="button" className="btn-primary" onClick={aplicar}>
            <i className="fa-solid fa-check" aria-hidden="true" /> Aplicar
          </button>
        </div>
      </div>
    </div>
  );
}
