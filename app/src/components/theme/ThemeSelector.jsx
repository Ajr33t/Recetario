import { useEffect, useRef } from 'react';
import { THEMES, getPalette } from '../../themes/palettes.js';
import { useThemeStore } from '../../store/themeStore.js';

const MODOS = [
  { id: 'claro', label: 'Claro', icon: 'fa-sun' },
  { id: 'oscuro', label: 'Oscuro', icon: 'fa-moon' },
  { id: 'alto-contraste', label: 'Alto contraste', icon: 'fa-circle-half-stroke' },
];

/**
 * Modal de selección de tema (12) y modo (3) — 36 combinaciones.
 * - Vista previa en vivo: cada clic aplica el tema de inmediato.
 * - Cancelar (Esc / fondo / botón) restaura el tema original.
 * - Aplicar confirma y cierra. Devuelve el foco al botón que lo abrió.
 */
export default function ThemeSelector({ open, onClose }) {
  const theme = useThemeStore((s) => s.theme);
  const mode = useThemeStore((s) => s.mode);
  const setTheme = useThemeStore((s) => s.setTheme);
  const setMode = useThemeStore((s) => s.setMode);

  const dialogRef = useRef(null);
  const openerRef = useRef(null);
  const originalRef = useRef(null);

  // Al abrir: guarda el tema original, enfoca el primer control y
  // al cerrar devuelve el foco al disparador (WCAG 2.4.3).
  useEffect(() => {
    if (!open) return;
    originalRef.current = {
      theme: useThemeStore.getState().theme,
      mode: useThemeStore.getState().mode,
    };
    openerRef.current = document.activeElement;
    const first = dialogRef.current?.querySelector('input, button');
    first?.focus();
    return () => {
      openerRef.current?.focus?.();
    };
  }, [open]);

  // Esc cancela (restaura el tema original)
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
    }
    onClose();
  }

  function aplicar() {
    onClose();
  }

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
              12 temas × 3 modos = 36 combinaciones. La vista previa se aplica en vivo.
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

        {/* Modos */}
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">Modo de apariencia</legend>
          <div className="flex flex-wrap gap-3">
            {MODOS.map(({ id, label, icon }) => (
              <label
                key={id}
                className={`glass flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium peer-focus-visible:outline peer-focus-visible:outline-2 ${
                  mode === id ? 'ring-2 ring-primary' : ''
                }`}
              >
                <input
                  type="radio"
                  name="modo-apariencia"
                  value={id}
                  checked={mode === id}
                  onChange={() => setMode(id)}
                  className="sr-only"
                />
                <i className={`fa-solid ${icon}`} aria-hidden="true" /> {label}
              </label>
            ))}
          </div>
        </fieldset>

        {/* 12 temas */}
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">Tema</legend>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3" role="list">
            {THEMES.map((t) => {
              const p = getPalette(t.id, mode);
              return (
                <li key={t.id}>
                  <label
                    className={`glass flex cursor-pointer flex-col gap-2 rounded-xl p-3 peer-focus-visible:outline peer-focus-visible:outline-2 ${
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
