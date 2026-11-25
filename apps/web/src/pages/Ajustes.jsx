import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import { useThemeStore } from '../store/themeStore.js';
import { useAuthStore } from '../store/authStore.js';
import { api, ApiError } from '../services/api.js';
import { exito, fracaso, informar } from '../services/toast.js';
import CampoContrasena from '../components/ui/CampoContrasena.jsx';
import { MANUAL_URL, ES_ESCRITORIO } from '../services/enlaces.js';
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

// Modos daltónicos (Fase 11): recolorean estados y acentos en CSS
const VISIONES = [
  { id: 'ninguno', label: 'Sin ajuste' },
  { id: 'rojo-verde', label: 'Rojo–verde' },
  { id: 'tritanopia', label: 'Tritanopia' },
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
          {checked && (
            <i className="fa-solid fa-check text-primary" role="img" aria-label="Activado" />
          )}
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
  // Estado del sistema: IA, correo y base de datos (Fase 10)
  const [sistema, setSistema] = useState(null);
  const [nube, setNube] = useState(null);
  const [sincronizando, setSincronizando] = useState(false);

  // Correo de recuperación: configuración única para toda la app (Fase 10)
  const [correo, setCorreo] = useState(null);
  const [formCorreo, setFormCorreo] = useState({
    proveedor: 'gmail',
    host: 'smtp.gmail.com',
    puerto: 465,
    usuario: '',
    clave: '',
    desde: '',
    seguro: true,
  });
  const [correoMsg, setCorreoMsg] = useState('');
  const [correoError, setCorreoError] = useState('');
  const [guardandoCorreo, setGuardandoCorreo] = useState(false);
  const [probandoCorreo, setProbandoCorreo] = useState(false);

  // Estado del sistema (IA, correo y base de datos) + estado de la nube
  useEffect(() => {
    api
      .get('/chat/estado')
      .then(setSistema)
      .catch(() => {});
    api
      .get('/nube/estado')
      .then(setNube)
      .catch(() => {});
    api
      .get('/correo/estado')
      .then((datos) => {
        setCorreo(datos);
        if (datos?.smtp?.host) {
          setFormCorreo((f) => ({
            ...f,
            host: datos.smtp.host,
            puerto: datos.smtp.puerto,
            usuario: datos.smtp.usuario,
            desde: datos.smtp.desde,
            seguro: datos.smtp.seguro,
          }));
        }
      })
      .catch(() => {});
  }, []);

  /** Guarda el proveedor de correo: con esto todos los usuarios reciben su correo. */
  async function guardarCorreo(event) {
    event.preventDefault();
    setCorreoError('');
    setCorreoMsg('');
    setGuardandoCorreo(true);
    try {
      const respuesta = await api.post('/correo/configurar', formCorreo);
      setCorreo(respuesta.config);
      setCorreoMsg('Configuración guardada. A partir de ahora todos los correos salen solos.');
      exito('Correo configurado');
    } catch (err) {
      setCorreoError(err instanceof ApiError ? err.message : 'No se pudo guardar');
      fracaso('No se pudo configurar el correo');
    } finally {
      setGuardandoCorreo(false);
    }
  }

  /** Envía un correo de prueba al usuario conectado. */
  async function probarCorreo() {
    setCorreoError('');
    setCorreoMsg('');
    setProbandoCorreo(true);
    try {
      const respuesta = await api.post('/correo/prueba');
      setCorreoMsg(respuesta.mensaje);
      if (respuesta.enviado) exito('Correo de prueba enviado');
      else informar(respuesta.mensaje);
    } catch (err) {
      setCorreoError(err instanceof ApiError ? err.message : 'No se pudo enviar el correo');
    } finally {
      setProbandoCorreo(false);
    }
  }

  /** Sincroniza los datos del usuario con la nube (PostgreSQL). */
  async function sincronizar() {
    setSincronizando(true);
    try {
      const resultado = await api.post('/nube/sincronizar');
      if (resultado.ok) {
        exito(
          `Sincronización completa: ${resultado.subidos} enviados, ${resultado.bajados} recibidos`,
        );
        const nuevo = await api.get('/nube/estado');
        setNube(nuevo);
      } else {
        fracaso(resultado.motivo || 'No se pudo sincronizar');
      }
    } catch (err) {
      fracaso(err instanceof ApiError ? err.message : 'No se pudo sincronizar con la nube');
    } finally {
      setSincronizando(false);
    }
  }
  const theme = useThemeStore((s) => s.theme);
  const mode = useThemeStore((s) => s.mode);
  const highContrast = useThemeStore((s) => s.highContrast);
  const liquidGlass = useThemeStore((s) => s.liquidGlass);
  const a11y = useThemeStore((s) => s.a11y);
  const setMode = useThemeStore((s) => s.setMode);
  const setHighContrast = useThemeStore((s) => s.setHighContrast);
  const setLiquidGlass = useThemeStore((s) => s.setLiquidGlass);
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
      exito(`${datos.total} receta(s) exportadas`);
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

        {/* Liquid Glass: activo por defecto, persistente y accesible al apagarlo */}
        <div className="mt-4 max-w-md">
          <Switch
            checked={liquidGlass}
            onChange={setLiquidGlass}
            icon="fa-water"
            label="Liquid Glass (efecto vidrio)"
            description="Activado por defecto. Al desactivarlo, las tarjetas y barras pasan a superficies sólidas sin desenfoque, más legibles y con el mismo contraste."
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

        <fieldset className="mt-4">
          <legend className="mb-2 text-sm font-semibold">
            <i className="fa-solid fa-eye" aria-hidden="true" /> Visión y daltonismo
          </legend>
          <p className="mb-2 text-sm text-muted-foreground">
            Recolorea los estados de error/éxito y los botones para que no dependan de distinguir
            rojo de verde ni azul de ámbar.
          </p>
          <div className="flex flex-wrap gap-3">
            {VISIONES.map(({ id, label }) => (
              <label key={id} className="glass-card flex cursor-pointer items-center gap-2 !p-3">
                <input
                  type="radio"
                  name="daltonismo"
                  value={id}
                  checked={(a11y.colorBlind || 'ninguno') === id}
                  onChange={() => setA11y({ colorBlind: id })}
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
          <span className="chip">
            <i className="fa-solid fa-eye" aria-hidden="true" /> Daltonismo:{' '}
            {VISIONES.find((v) => v.id === (a11y.colorBlind || 'ninguno'))?.label}
          </span>
        </div>

        {/* Tour de bienvenida (RF-25): se puede repetir cuando se quiera */}
        <div className="mt-4">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              try {
                localStorage.removeItem('sazonlab-onboarding');
              } catch {
                /* sin almacenamiento: el tour igual se puede ver ahora */
              }
              window.dispatchEvent(new Event('sazonlab:tour'));
            }}
          >
            <i className="fa-solid fa-route" aria-hidden="true" /> Repetir tour de bienvenida
          </button>
          <p className="mt-1 text-xs text-muted-foreground">
            El tour se muestra la primera vez que entras al inicio. Aquí puedes verlo otra vez.
          </p>
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

      {/* Sistema: IA local/nube, correo y base de datos (Fase 10) */}
      <section className="surface-section" aria-labelledby="sistema-titulo">
        <h2 id="sistema-titulo">
          <i className="fa-solid fa-cloud text-primary" aria-hidden="true" /> Sistema, IA y nube
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Estado de la inteligencia artificial, del correo de recuperación y de la base de datos.
        </p>

        <ul className="mt-3 grid gap-2 sm:grid-cols-2" role="list">
          <li className="rounded-xl bg-[rgb(var(--muted)/0.5)] p-3 text-sm">
            <p className="font-semibold">
              <i className="fa-solid fa-brain text-primary" aria-hidden="true" /> IA del asistente
            </p>
            <p className="mt-1 text-muted-foreground">
              {sistema?.ia?.activo === 'ollama'
                ? `IA local con Ollama (${sistema.ia.local.modelo}) — sin internet y sin enviar datos.`
                : sistema?.ia?.activo === 'openai'
                  ? 'IA en la nube con OpenAI.'
                  : sistema?.ia?.activo === 'gemini'
                    ? 'IA en la nube con Gemini.'
                    : 'Asistente local de SazónLab (sin IA externa). Instala Ollama para usarla.'}
            </p>
          </li>
          <li className="rounded-xl bg-[rgb(var(--muted)/0.5)] p-3 text-sm">
            <p className="font-semibold">
              <i className="fa-solid fa-envelope text-primary" aria-hidden="true" /> Correo
            </p>
            <p className="mt-1 text-muted-foreground">
              {sistema?.correo?.activo
                ? `Envío real por ${sistema.correo.transporte.toUpperCase()}: la recuperación de contraseña llega al correo.`
                : 'Aún no hay servidor de correo: configura SMTP o Resend en «Correo de recuperación» para enviar el código de verdad.'}
            </p>
          </li>
          <li className="rounded-xl bg-[rgb(var(--muted)/0.5)] p-3 text-sm">
            <p className="font-semibold">
              <i className="fa-solid fa-database text-primary" aria-hidden="true" /> Base de datos
            </p>
            <p className="mt-1 text-muted-foreground">
              {sistema?.baseDatos?.motor === 'postgresql'
                ? `PostgreSQL en la nube (${sistema.baseDatos.nube.host}) con caché local SQLite.`
                : 'SQLite local (archivo). Configura DATABASE_URL para usar PostgreSQL en la nube.'}
            </p>
          </li>
          <li className="rounded-xl bg-[rgb(var(--muted)/0.5)] p-3 text-sm">
            <p className="font-semibold">
              <i className="fa-solid fa-arrows-rotate text-primary" aria-hidden="true" /> Nube
            </p>
            <p className="mt-1 text-muted-foreground">
              {nube?.configurado
                ? `Conectado a ${nube.host}${nube.conexion.conectado ? ' ✓' : ' (sin conexión)'}${
                    nube.ultimaSync
                      ? ` · última sincronización: ${nube.ultimaSync.slice(0, 16).replace('T', ' ')}`
                      : ''
                  }`
                : 'Sin nube configurada: tus datos viven en este equipo.'}
            </p>
          </li>
        </ul>

        {usuario && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="btn-secondary !px-3 !text-sm"
              onClick={sincronizar}
              disabled={sincronizando}
            >
              <i
                className={`fa-solid ${sincronizando ? 'fa-spinner fa-spin' : 'fa-cloud-arrow-up'}`}
                aria-hidden="true"
              />
              {sincronizando ? ' Sincronizando…' : ' Sincronizar con la nube'}
            </button>
            {sistema?.ia?.activo === 'local' && (
              <Link to="/chat" className="btn-ghost !px-3 !text-sm">
                <i className="fa-solid fa-robot" aria-hidden="true" /> Probar el asistente
              </Link>
            )}
            {!ES_ESCRITORIO && (
              <a
                href={MANUAL_URL}
                download
                className="btn-ghost !px-3 !text-sm"
                title="Manual de usuario en PDF"
              >
                <i className="fa-solid fa-book-open" aria-hidden="true" /> Manual de usuario
              </a>
            )}
          </div>
        )}
      </section>

      {/* Correo de recuperación: se configura UNA vez y funciona para todos */}
      <section className="surface-section" aria-labelledby="correo-titulo">
        <h2 id="correo-titulo">
          <i className="fa-solid fa-envelope-open-text text-primary" aria-hidden="true" /> Correo de
          recuperación
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Configura el proveedor <strong>una sola vez</strong>: a partir de ese momento todos los
          usuarios reciben su código y su enlace de restablecimiento automáticamente.
        </p>

        <p className="mt-3 text-sm">
          <span className={`chip ${correo?.activo ? '!bg-emerald-500/20' : '!bg-amber-500/20'}`}>
            <i
              className={`fa-solid ${correo?.activo ? 'fa-circle-check' : 'fa-triangle-exclamation'}`}
              aria-hidden="true"
            />
            {correo?.activo
              ? `Activo (${correo.transporte.toUpperCase()})`
              : 'Sin proveedor de correo configurado todavía'}
          </span>
        </p>

        {usuario?.rol === 'admin' && (
          <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={guardarCorreo} noValidate>
            <label className="flex flex-col gap-1 text-sm">
              Proveedor
              <select
                className="field"
                value={formCorreo.proveedor}
                onChange={(e) => {
                  const p = e.target.value;
                  const base = correo?.proveedores?.[p] || { host: '', puerto: 587, seguro: false };
                  setFormCorreo({
                    ...formCorreo,
                    proveedor: p,
                    host: base.host,
                    puerto: base.puerto,
                    seguro: base.seguro,
                  });
                }}
              >
                {(correo?.proveedores
                  ? Object.entries(correo.proveedores).map(([id, p]) => [id, p.nombre])
                  : []
                ).map(([id, nombre]) => (
                  <option key={id} value={id}>
                    {nombre}
                  </option>
                ))}
              </select>
            </label>

            {formCorreo.proveedor !== 'resend' && (
              <>
                <label className="flex flex-col gap-1 text-sm">
                  Servidor SMTP
                  <input
                    type="text"
                    className="field"
                    value={formCorreo.host}
                    onChange={(e) => setFormCorreo({ ...formCorreo, host: e.target.value })}
                    placeholder="smtp.gmail.com"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  Puerto
                  <input
                    type="number"
                    className="field"
                    value={formCorreo.puerto}
                    onChange={(e) =>
                      setFormCorreo({ ...formCorreo, puerto: Number(e.target.value) })
                    }
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  Tu correo
                  <input
                    type="email"
                    className="field"
                    value={formCorreo.usuario}
                    onChange={(e) => setFormCorreo({ ...formCorreo, usuario: e.target.value })}
                    placeholder="tucorreo@gmail.com"
                    autoComplete="username"
                  />
                </label>
                <CampoContrasena
                  label="Contraseña de aplicación"
                  id="smtp-clave"
                  value={formCorreo.clave}
                  onChange={(e) => setFormCorreo({ ...formCorreo, clave: e.target.value })}
                  autoComplete="current-password"
                />
                <label className="flex items-center gap-2 text-sm sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={formCorreo.seguro}
                    onChange={(e) => setFormCorreo({ ...formCorreo, seguro: e.target.checked })}
                    className="accent-[rgb(var(--primary))]"
                  />
                  Usar conexión segura (TLS/SSL, típico en el puerto 465)
                </label>
              </>
            )}

            {formCorreo.proveedor === 'resend' && (
              <CampoContrasena
                label="Clave API de Resend"
                id="resend-clave"
                className="sm:col-span-2"
                value={formCorreo.clave}
                onChange={(e) => setFormCorreo({ ...formCorreo, clave: e.target.value })}
                placeholder="re_..."
              />
            )}

            <label className="flex flex-col gap-1 text-sm sm:col-span-2">
              Remitente (opcional)
              <input
                type="text"
                className="field"
                value={formCorreo.desde}
                onChange={(e) => setFormCorreo({ ...formCorreo, desde: e.target.value })}
                placeholder="SazónLab <tucorreo@gmail.com>"
              />
            </label>

            <p className="text-xs text-muted-foreground sm:col-span-2">
              {correo?.proveedores?.[formCorreo.proveedor]?.ayuda} En Gmail, usa una «contraseña de
              aplicación», no tu contraseña normal.
            </p>

            {correoError && (
              <p role="alert" className="text-sm font-medium text-danger sm:col-span-2">
                <i className="fa-solid fa-circle-exclamation" aria-hidden="true" /> {correoError}
              </p>
            )}

            <div className="flex flex-wrap gap-2 sm:col-span-2">
              <button
                type="submit"
                className="btn-primary !px-4 !text-sm"
                disabled={guardandoCorreo}
              >
                <i
                  className={`fa-solid ${guardandoCorreo ? 'fa-spinner fa-spin' : 'fa-floppy-disk'}`}
                  aria-hidden="true"
                />
                {guardandoCorreo ? ' Guardando…' : ' Guardar configuración'}
              </button>
              <button
                type="button"
                className="btn-secondary !px-4 !text-sm"
                onClick={probarCorreo}
                disabled={probandoCorreo}
              >
                <i
                  className={`fa-solid ${probandoCorreo ? 'fa-spinner fa-spin' : 'fa-paper-plane'}`}
                  aria-hidden="true"
                />
                {probandoCorreo ? ' Enviando…' : ' Enviar correo de prueba'}
              </button>
            </div>
          </form>
        )}

        {correoMsg && (
          <p role="status" className="mt-3 text-sm font-medium text-primary">
            <i className="fa-solid fa-circle-check" aria-hidden="true" /> {correoMsg}
          </p>
        )}

        {!usuario && (
          <p className="mt-3 text-sm text-muted-foreground">
            <i className="fa-solid fa-lock" aria-hidden="true" /> Inicia sesión para configurar el
            correo y enviar una prueba.
          </p>
        )}
      </section>
    </div>
  );
}
