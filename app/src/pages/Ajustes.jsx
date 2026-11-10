import { useThemeStore } from '../store/themeStore.js';

/**
 * Ajustes: tema/modo (RF-13), accesibilidad (RF-14) y datos (RF-21).
 * Los selectores completos se conectan en las Fases 2, 5 y 6.
 */
export default function Ajustes() {
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);

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
          12 temas × 3 modos con vista previa y persistencia: disponible en la Fase 2. Por ahora
          puedes alternar claro/oscuro:
        </p>

        <fieldset className="mt-3 flex flex-wrap gap-4">
          <legend className="sr-only">Modo de apariencia</legend>
          {[
            { id: 'claro', label: 'Claro', icon: 'fa-sun' },
            { id: 'oscuro', label: 'Oscuro', icon: 'fa-moon' },
          ].map(({ id, label, icon }) => (
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
      </section>

      {/* Accesibilidad */}
      <section className="surface-section" aria-labelledby="accesibilidad-titulo">
        <h2 id="accesibilidad-titulo">
          <i className="fa-solid fa-universal-access text-primary" aria-hidden="true" />{' '}
          Accesibilidad
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Tamaño de fuente, reducir movimiento y alto contraste se conectan en la Fase 6. Modo alto
          contraste (AAA) viene con la Fase 2.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="chip">
            <i className="fa-solid fa-text-height" aria-hidden="true" /> Fuente normal
          </span>
          <span className="chip">
            <i className="fa-solid fa-person-running" aria-hidden="true" /> Movimiento: normal
          </span>
          <span className="chip">
            <i className="fa-solid fa-circle-half-stroke" aria-hidden="true" /> Contraste: AA
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
