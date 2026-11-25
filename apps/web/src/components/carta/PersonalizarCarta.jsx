import { useEffect, useState } from 'react';
import { api, ApiError } from '../../services/api.js';
import { exito } from '../../services/toast.js';
import Modal from '../ui/Modal.jsx';
import { etiquetaAlergeno } from '../../data/alergenos.js';
import { descargarCartaComoImagen, imprimirCarta, organizarPlatos } from '../../services/exportarCarta.js';

/** Preferencias por defecto (la carta se ve bien sin configurar nada). */
const VALORES = {
  nombre_establecimiento: 'Mi restaurante',
  color_principal: '#0ea5e9',
  color_secundaria: '#134e4a',
  color_fondo: '#ffffff',
  color_texto: '#1f2937',
  orientacion: 'vertical',
  tamano: 'A4',
  tipografia: 'Georgia, serif',
  version: 'con_precio',
  organizacion: 'categorias',
  mostrar_alergenos: true,
  mostrar_composicion: false,
  logo: null,
};

const TIPOGRAFIAS = [
  'Georgia, serif',
  'Arial, sans-serif',
  'Verdana, sans-serif',
  'Times New Roman, serif',
  'Trebuchet MS, sans-serif',
];

/**
 * Modal de personalización de la carta (punto 6 del encargo):
 * colores, orientación, tamaño, tipografía, versión con/sin precio/ambas,
 * organización, logo + nombre, alérgenos/composición, vista previa en vivo
 * y exportación PDF (impresión) / imagen PNG.
 */
export default function PersonalizarCarta({ open, onClose }) {
  const [form, setForm] = useState(VALORES);
  const [platos, setPlatos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setCargando(true);
    Promise.all([api.get('/carta/preferencias'), api.get('/carta/platos')])
      .then(([prefs, carta]) => {
        setForm({ ...VALORES, ...(prefs.preferencias || {}) });
        setPlatos(carta.platos || []);
        setError('');
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : 'No se pudo cargar la personalización');
      })
      .finally(() => setCargando(false));
  }, [open]);

  function cambiar(clave, valor) {
    setForm((f) => ({ ...f, [clave]: valor }));
  }

  /** Sube un logo local como data URL (sin enviarlo a ningún servidor externo). */
  function subirLogo(e) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    if (archivo.size > 2 * 1024 * 1024) {
      setError('El logo debe pesar menos de 2 MB.');
      return;
    }
    const lector = new FileReader();
    lector.onload = () => cambiar('logo', String(lector.result));
    lector.onerror = () => setError('No se pudo leer la imagen del logo.');
    lector.readAsDataURL(archivo);
  }

  async function guardar() {
    setGuardando(true);
    try {
      const respuesta = await api.put('/carta/preferencias', form);
      setForm({ ...VALORES, ...respuesta.preferencias });
      exito('Carta personalizada y guardada');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo guardar la personalización');
    } finally {
      setGuardando(false);
    }
  }

  const datos = {
    restaurante: form.nombre_establecimiento || VALORES.nombre_establecimiento,
    platos,
    preferencias: form,
  };
  const vista = organizarPlatos(platos, form.organizacion).slice(0, 4);

  return (
    <Modal open={open} onClose={onClose} labelledBy="titulo-personalizar-carta" className="max-w-5xl">
      <h2 id="titulo-personalizar-carta" className="text-lg font-semibold">
        <i className="fa-solid fa-palette text-primary" aria-hidden="true" /> Personalizar carta
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Los cambios se ven al instante en la vista previa y se guardan para la carta digital y las
        exportaciones.
      </p>

      {cargando && (
        <p className="mt-4 text-sm text-muted-foreground" role="status">
          <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" /> Cargando preferencias…
        </p>
      )}

      {error && (
        <p role="alert" className="mt-4 text-sm font-medium text-danger">
          <i className="fa-solid fa-circle-exclamation" aria-hidden="true" /> {error}
        </p>
      )}

      <div className="mt-4 grid gap-5 lg:grid-cols-2">
        {/* ===== Controles ===== */}
        <div className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm sm:col-span-2">
              Nombre del establecimiento
              <input
                className="field"
                value={form.nombre_establecimiento || ''}
                onChange={(e) => cambiar('nombre_establecimiento', e.target.value)}
                placeholder="Ej. La Cocina de Ana"
              />
            </label>

            {[
              ['color_principal', 'Color principal'],
              ['color_secundaria', 'Color secundario'],
              ['color_fondo', 'Color de fondo'],
              ['color_texto', 'Color del texto'],
            ].map(([clave, etiqueta]) => (
              <label key={clave} className="flex items-center justify-between gap-2 rounded-xl border border-border px-3 py-2 text-sm">
                {etiqueta}
                <input
                  type="color"
                  value={form[clave] || VALORES[clave]}
                  onChange={(e) => cambiar(clave, e.target.value)}
                  aria-label={etiqueta}
                  className="h-9 w-12 cursor-pointer rounded-md border-0 bg-transparent"
                />
              </label>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              Orientación
              <select className="field" value={form.orientacion} onChange={(e) => cambiar('orientacion', e.target.value)}>
                <option value="vertical">Vertical</option>
                <option value="horizontal">Horizontal</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Tamaño
              <select className="field" value={form.tamano} onChange={(e) => cambiar('tamano', e.target.value)}>
                <option value="A4">A4</option>
                <option value="A5">A5</option>
                <option value="carta">Carta</option>
                <option value="personalizado">Personalizado</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Tipografía
              <select className="field" value={form.tipografia} onChange={(e) => cambiar('tipografia', e.target.value)}>
                {TIPOGRAFIAS.map((t) => (
                  <option key={t} value={t}>
                    {t.split(',')[0]}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Versión
              <select className="field" value={form.version} onChange={(e) => cambiar('version', e.target.value)}>
                <option value="con_precio">Con precio</option>
                <option value="sin_precio">Sin precio</option>
                <option value="ambas">Ambas</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm sm:col-span-2">
              Organización
              <select className="field" value={form.organizacion} onChange={(e) => cambiar('organizacion', e.target.value)}>
                <option value="categorias">Por categorías</option>
                <option value="precio">Por precio</option>
                <option value="manual">Orden manual</option>
              </select>
            </label>
          </div>

          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={Boolean(form.mostrar_alergenos)}
                onChange={(e) => cambiar('mostrar_alergenos', e.target.checked)}
              />
              Mostrar alérgenos en la carta
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={Boolean(form.mostrar_composicion)}
                onChange={(e) => cambiar('mostrar_composicion', e.target.checked)}
              />
              Mostrar composición de los platos
            </label>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" htmlFor="logo-carta">
              Logo del establecimiento
            </label>
            <input id="logo-carta" type="file" accept="image/*" className="field !py-2 text-xs" onChange={subirLogo} />
            {form.logo && (
              <div className="flex items-center gap-2">
                <img src={form.logo} alt="Logo actual de la carta" className="h-12 w-12 rounded-lg object-contain" />
                <button type="button" className="btn-ghost !px-3 !text-xs" onClick={() => cambiar('logo', null)}>
                  Quitar logo
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-primary !px-3" onClick={guardar} disabled={guardando}>
              <i className="fa-solid fa-save" aria-hidden="true" /> {guardando ? 'Guardando…' : 'Guardar carta'}
            </button>
            <button type="button" className="btn-secondary !px-3" onClick={() => imprimirCarta(datos)}>
              <i className="fa-solid fa-file-pdf" aria-hidden="true" /> Exportar PDF
            </button>
            <button
              type="button"
              className="btn-secondary !px-3"
              onClick={() =>
                descargarCartaComoImagen(datos, (form.nombre_establecimiento || 'carta').toLowerCase().replace(/\s+/g, '-'))
              }
            >
              <i className="fa-solid fa-image" aria-hidden="true" /> Exportar imagen
            </button>
          </div>
        </div>

        {/* ===== Vista previa en vivo ===== */}
        <div>
          <p className="mb-2 text-sm font-medium">Vista previa en vivo</p>
          <div
            className={`mx-auto max-h-[32rem] overflow-y-auto rounded-2xl border border-border p-6 shadow-sm ${form.orientacion === 'horizontal' ? 'max-w-full' : 'max-w-sm'}`}
            style={{ background: form.color_fondo, color: form.color_texto, fontFamily: form.tipografia }}
          >
            <div className="text-center">
              {form.logo && (
                <img src={form.logo} alt="" className="mx-auto mb-3 max-h-14 max-w-24 object-contain" />
              )}
              <h3 className="text-xl font-bold" style={{ color: form.color_principal }}>
                {form.nombre_establecimiento || VALORES.nombre_establecimiento}
              </h3>
              <p className="text-xs opacity-70">Carta · SazónLab</p>
            </div>
            <div className="mt-4 space-y-3">
              {vista.length === 0 && (
                <p className="text-center text-sm opacity-70">Agrega platos para ver la carta.</p>
              )}
              {vista.map((p) => (
                <div key={p.id} className="border-b border-current/10 pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <strong>{p.titulo}</strong>
                    {form.version !== 'sin_precio' && p.precio != null && (
                      <span style={{ color: form.color_principal }}>{Number(p.precio).toFixed(2)}</span>
                    )}
                  </div>
                  {form.mostrar_composicion && p.composicion && (
                    <p className="text-xs opacity-70">{p.composicion}</p>
                  )}
                  {form.mostrar_alergenos && p.alergenos?.length > 0 && (
                    <p className="text-[11px] opacity-70">
                      {p.alergenos.map(etiquetaAlergeno).join(' · ')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 flex justify-end">
        <button type="button" className="btn-ghost !px-3" onClick={onClose}>
          Cerrar
        </button>
      </div>
    </Modal>
  );
}
