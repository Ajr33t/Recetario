import { useState } from 'react';
import { useThemeStore } from '../store/themeStore.js';
import { THEMES } from '../themes/palettes.js';
import ThemeSelector from '../components/theme/ThemeSelector.jsx';

const MODOS = [
  { id: 'claro', label: 'Claro', icon: 'fa-sun' },
  { id: 'oscuro', label: 'Oscuro', icon: 'fa-moon' },
  { id: 'alto-contraste', label: 'Alto contraste', icon: 'fa-circle-half-stroke' },
];

/**
 * Ajustes: tema/modo (RF-13), accesibilidad (RF-14) y datos (RF-21).
 * Los selectores completos se conectan en las Fases 2, 5 y 6.
 */
export default function Ajustes() {
  const [selectorOpen, setSelectorOpen] = useState(false);
  const theme = useThemeStore((s) => s.theme);
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);
  const temaActual = THEMES.find((t) => t.id === theme) || THEMES[0];

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1>Ajustes</h1>
        <p className="mt-1 text-muted-foreground">
          Personaliza la apariencia y la accesibilidad de SazónLab.
        </p>
      </header>

      {/* Tema y modo */}
      <section className="surface-section" aria-labelledby="tema-titulo">
        <h2 id="tema-titulo">
          <i className="fa-solid fa-palette text-primary" aria-hidden="true" /> Tema y modo
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Tema actual:{' '}
          <strong>
            <i className={`fa-solid ${temaActual.icon}`} aria-hidden="true" /> {temaActual.name}
          </strong>{' '}
          · Modo: <strong>{MODOS.find((m) => m.id === mode)?.label || mode}</strong> — 12 temas × 3
          modos con vista previa en vivo y persistencia.
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button type="button" className="btn-primary" onClick={() => setSelectorOpen(true)}>
            <i className="fa-solid fa-palette" aria-hidden="true" /> Elegir tema y modo
          </button>
        </div>

        <fieldset className="mt-4 flex flex-wrap gap-4">
          <legend className="mb-1 text-sm font-semibold">Modo de apariencia</legend>
          {MODOS.map(({ id, label, icon }) => (
            <label key={id} className="glass-card flex cursor-pointer items-center gap-2 !p-3">
              <input
                type="radio"
                name="modo"
                value={id}
                checked={mode === id}
                onChange={() => setMode(id)}
                className="accent-[rgb(var(--primary))] text-sm"
              />
              <i className={`fa-solid ${icon}`} aria-hidden="true" /> {label}
            </label>
          ))}
        </fieldset>

        <ThemeSelector open={selectorOpen} onClose={() => setSelectorOpen(false)} />
      </section>

      {/* Accesibilidad */}
      <section className="surface-section" aria-labelledby="accesibilidad-titulo">
        <h2 id="accesibilidad-titulo">
          <i className="fa-solid fa-universal-access text-primary" aria-hidden="true" />{' '}
          Accesibilidad
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Tamaño de fuente y reducir movimiento se conectan en la Fase 6. El modo alto contraste
          (AAA en texto) ya está disponible en «Tema y modo».
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="chip">
            <i className="fa-solid fa-text-height" aria-hidden="true" /> Fuente normal
          </span>
          <span className="chip">
            <i className="fa-solid fa-person-running" aria-hidden="true" /> Movimiento: normal
          </span>
          <span className="chip">
            <i className="fa-solid fa-circle-half-stroke" aria-hidden="true" /> Contraste:{' '}
            {mode === 'alto-contraste' ? 'AAA' : 'AA'}
          </span>
        </div>
      </section>

      {/* Datos */}
      <section className="surface-section" aria-labelledby="datos-titulo">
        <h2 id="datos-titulo">
          <i className="fa-solid fa-file-export text-primary" aria-hidden="true" /> Datos
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Exportar e importar recetas en JSON (RF-21): disponible desde la Fase 5.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className="btn-secondary" disabled>
            <i className="fa-solid fa-download" aria-hidden="true" /> Exportar JSON
          </button>
          <button type="button" className="btn-secondary" disabled>
            <i className="fa-solid fa-upload" aria-hidden="true" /> Importar JSON
          </button>
        </div>
      </section>
    </div>
  );
}
