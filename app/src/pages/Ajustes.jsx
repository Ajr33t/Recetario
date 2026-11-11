import { useRef, useState } from 'react';
import Swal from 'sweetalert2';
import { useThemeStore } from '../store/themeStore.js';
import { useAuthStore } from '../store/authStore.js';
import { api, ApiError } from '../services/api.js';
import { THEMES } from '../themes/palettes.js';
import ThemeSelector from '../components/theme/ThemeSelector.jsx';

const MODOS = [
  { id: 'claro', label: 'Claro', icon: 'fa-sun' },
  { id: 'oscuro', label: 'Oscuro', icon: 'fa-moon' },
];

const TAMANOS = [
  { id: 'normal', label: 'Normal (16px)' },
  { id: 'grande', label: 'Grande (18px)' },
  { id: 'extra', label: 'Extra grande (20px)' },
];

/** Interruptor accesible (checkbox nativo + visual). */
function Switch({ checked, onChange, label, icon, description }) {
  return (
    <label
      className={`glass flex cursor-pointer items-start gap-3 rounded-xl p-3.5 ${
        checked ? 'ring-2 ring-primary' : ''
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 accent-[rgb(var(--primary))]"
      />
      <span className="flex-1">
        <span className="flex items-center gap-2 text-sm font-semibold">
          <i className={`fa-solid ${icon} text-primary`} aria-hidden="true" /> {label}
          {checked && <i className="fa-solid fa-check text-primary" aria-label="Activado" />}
        </span>
        <span className="mt-0.5 block text-xs text-muted-foreground">{description}</span>
      </span>
    </label>
  );
}

/**
 * Ajustes: tema/modo (RF-13), accesibilidad (RF-14) y datos (RF-21).
 * - Modo claro/oscuro + interruptor de alto contraste INDEPENDIENTE (prevalece).
 * - Panel de accesibilidad: tamaño de fuente, dislexia, reducir movimiento,
 *   subrayar enlaces. Los datos llegan en la Fase 5.
 */
export default function Ajustes() {
  const [selectorOpen, setSelectorOpen] = useState(false);
  const theme = useThemeStore((s) => s.theme);
  const mode = useThemeStore((s) => s.mode);
  const highContrast = useThemeStore((s) => s.highContrast);
  const a11y = useThemeStore((s) => s.a11y);
  const setMode = useThemeStore((s) => s.setMode);
  const setHighContrast = useThemeStore((s) => s.setHighContrast);
  const setA11y = useThemeStore((s) => s.setA11y);
  const temaActual = THEMES.find((t) => t.id === theme) || THEMES[0];
  const usuario = useAuthStore((s) => s.usuario);
  const archivoRef = useRef(null);

  // ── Exportar recetas a JSON (RF-21) ──
  async function exportarJson() {
    try {
      const datos = await api.get('/recipes/exportar');
      const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = `sazonlab-recetas-${new Date().toISOString().slice(0, 10)}.json`;
      enlace.click();
      URL.revokeObjectURL(url);
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: `${datos.total} receta(s) exportadas`,
        showConfirmButton: false,
        timer: 1800,
      });
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'No se pudo exportar',
        text: err instanceof ApiError ? err.message : 'Reintenta en unos segundos.',
      });
    }
  }

  // ── Importar recetas desde JSON (RF-21) ──
  async function importarJson(evento) {
    const archivo = evento.target.files?.[0];
    evento.target.value = ''; // permite volver a elegir el mismo archivo
    if (!archivo) return;
    try {
      const texto = await archivo.text();
      let datos;
      try {
        datos = JSON.parse(texto);
      } catch {
        throw new Error('El archivo no es JSON válido');
      }
      const recetas = Array.isArray(datos) ? datos : datos.recetas;
      if (!Array.isArray(recetas)) throw new Error('El archivo no contiene recetas');
      const respuesta = await api.post('/recipes/importar', { recetas });
      await Swal.fire({
        icon: respuesta.importadas > 0 ? 'success' : 'warning',
        title: 'Importación completada',
        text:
          respuesta.errores.length > 0
            ? `${respuesta.importadas} importadas, ${respuesta.errores.length} omitidas`
            : `${respuesta.importadas} receta(s) importadas`,
      });
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'No se pudo importar',
        text: err.message || 'Archivo no válido',
      });
    }
  }

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
          · Modo: <strong>{MODOS.find((m) => m.id === mode)?.label}</strong> · Alto contraste:{' '}
          <strong>{highContrast ? 'AAA (activo)' : 'desactivado'}</strong> — 12 temas con vista
          previa en vivo y persistencia.
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button type="button" className="btn-primary" onClick={() => setSelectorOpen(true)}>
            <i className="fa-solid fa-palette" aria-hidden="true" /> Elegir tema y modo
          </button>
        </div>

        <fieldset className="mt-4 flex flex-wrap items-center gap-4">
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

        {/* Alto contraste: interruptor aparte del modo claro/oscuro (prevalece) */}
        <div className="mt-4 max-w-md">
          <Switch
            checked={highContrast}
            onChange={setHighContrast}
            icon="fa-circle-half-stroke"
            label="Alto contraste (AAA)"
            description="Se activa por separado del modo claro/oscuro y prevalece sobre él: texto ≥ 7:1, bordes gruesos y foco amarillo."
          />
        </div>

        <ThemeSelector open={selectorOpen} onClose={() => setSelectorOpen(false)} />
      </section>

      {/* Accesibilidad */}
      <section className="surface-section" aria-labelledby="accesibilidad-titulo">
        <h2 id="accesibilidad-titulo">
          <i className="fa-solid fa-universal-access text-primary" aria-hidden="true" />{' '}
          Accesibilidad
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Opciones para adaptar la lectura y el movimiento. Se guardan al instante y persisten en
          este dispositivo.
        </p>

        <fieldset className="mt-4">
          <legend className="mb-2 text-sm font-semibold">
            <i className="fa-solid fa-text-height" aria-hidden="true" /> Tamaño de fuente
          </legend>
          <div className="flex flex-wrap gap-3">
            {TAMANOS.map(({ id, label }) => (
              <label key={id} className="glass-card flex cursor-pointer items-center gap-2 !p-3">
                <input
                  type="radio"
                  name="tamano-fuente"
                  value={id}
                  checked={a11y.fontSize === id}
                  onChange={() => setA11y({ fontSize: id })}
                  className="accent-[rgb(var(--primary))] text-sm"
                />
                <span className="text-sm">{label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Switch
            checked={a11y.dyslexia}
            onChange={(v) => setA11y({ dyslexia: v })}
            icon="fa-brain"
            label="Tipografía para dislexia"
            description="Fuente sans-serif ancha (Verdana/Trebuchet), espaciado amplio y líneas más separadas para facilitar la lectura."
          />
          <Switch
            checked={a11y.reduceMotion}
            onChange={(v) => setA11y({ reduceMotion: v })}
            icon="fa-person-running"
            label="Reducir movimiento"
            description="Desactiva animaciones y transiciones (también respeta la preferencia del sistema)."
          />
          <Switch
            checked={a11y.underlineLinks}
            onChange={(v) => setA11y({ underlineLinks: v })}
            icon="fa-link"
            label="Subrayar enlaces"
            description="Mantiene los enlaces siempre subrayados, no solo al pasar el cursor."
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="chip">
            <i className="fa-solid fa-circle-half-stroke" aria-hidden="true" /> Contraste:{' '}
            {highContrast ? 'AAA' : 'AA'}
          </span>
          <span className="chip">
            <i className="fa-solid fa-font" aria-hidden="true" /> Fuente: {a11y.fontSize}
          </span>
          <span className="chip">
            <i className="fa-solid fa-brain" aria-hidden="true" /> Dislexia:{' '}
            {a11y.dyslexia ? 'activada' : 'desactivada'}
          </span>
        </div>
      </section>

      {/* Datos */}
      <section className="surface-section" aria-labelledby="datos-titulo">
        <h2 id="datos-titulo">
          <i className="fa-solid fa-file-export text-primary" aria-hidden="true" /> Datos
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Exporta todas tus recetas a un archivo JSON o recupéralas desde una copia (RF-21).
        </p>
        {usuario ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="btn-secondary" onClick={exportarJson}>
              <i className="fa-solid fa-download" aria-hidden="true" /> Exportar JSON
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => archivoRef.current?.click()}
            >
              <i className="fa-solid fa-upload" aria-hidden="true" /> Importar JSON
            </button>
            <input
              ref={archivoRef}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              onChange={importarJson}
              aria-label="Seleccionar archivo JSON para importar"
            />
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            <i className="fa-solid fa-lock" aria-hidden="true" /> Inicia sesión para exportar o
            importar tus recetas.
          </p>
        )}
      </section>
    </div>
  );
}
