import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import { api, ApiError } from '../services/api.js';
import { useAuthStore } from '../store/authStore.js';

const DIFICULTADES = [
  { valor: 'facil', texto: 'Fácil' },
  { valor: 'media', texto: 'Media' },
  { valor: 'dificil', texto: 'Difícil' },
];

const VACIO = {
  titulo: '',
  descripcion: '',
  tiempo_min: '',
  dificultad: '',
  porciones: '',
  imagen_url: '',
  visibilidad: 'privada',
  etiquetas: [],
};

/** Convierte un archivo de imagen en data URL redimensionado (canvas, sin librerías). */
function archivoADataURL(file, maxAncho = 800) {
  return new Promise((resolver, rechazar) => {
    if (!file) return resolver(null);
    if (file.size > 5_000_000) return rechazar(new Error('La imagen no puede superar 5 MB'));
    const lector = new FileReader();
    lector.onload = () => {
      const img = new Image();
      img.onload = () => {
        const escala = Math.min(1, maxAncho / img.width);
        const lienzo = document.createElement('canvas');
        lienzo.width = Math.round(img.width * escala);
        lienzo.height = Math.round(img.height * escala);
        lienzo.getContext('2d').drawImage(img, 0, 0, lienzo.width, lienzo.height);
        const data = lienzo.toDataURL('image/jpeg', 0.85);
        if (data.length > 900_000) return rechazar(new Error('Imagen demasiado pesada'));
        resolver(data);
      };
      img.onerror = () => rechazar(new Error('No se pudo leer la imagen'));
      img.src = String(lector.result);
    };
    lector.onerror = () => rechazar(new Error('No se pudo leer la imagen'));
    lector.readAsDataURL(file);
  });
}

/**
 * Formulario de recetas (RF-06 crear / RF-07 editar con historial de
 * versiones / RF-08 eliminar con confirmación SweetAlert2 / RF-12
 * visibilidad para compartir) — Fase 5.
 */
export default function RecetaForm() {
  const { id } = useParams(); // undefined = nueva
  const esEdicion = Boolean(id);
  const navigate = useNavigate();
  const usuario = useAuthStore((s) => s.usuario);

  const [f, setF] = useState(VACIO);
  const [ingredientes, setIngredientes] = useState([{ nombre: '', cantidad: '', unidad: '' }]);
  const [pasos, setPasos] = useState(['']);
  const [nuevaEtiqueta, setNuevaEtiqueta] = useState('');
  const [cargando, setCargando] = useState(esEdicion);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [versiones, setVersiones] = useState([]);

  const set = (campo, valor) => setF((prev) => ({ ...prev, [campo]: valor }));

  // Carga para edición + historial de versiones
  useEffect(() => {
    if (!usuario) return undefined;
    let vivo = true;
    if (esEdicion) {
      api
        .get(`/recipes/${id}`)
        .then((datos) => {
          if (!vivo) return;
          const r = datos.receta;
          setF({
            titulo: r.titulo || '',
            descripcion: r.descripcion || '',
            tiempo_min: r.tiempo_min ?? '',
            dificultad: r.dificultad || '',
            porciones: r.porciones ?? '',
            imagen_url: r.imagen_url || '',
            visibilidad: r.visibilidad || 'privada',
            etiquetas: r.etiquetas || [],
          });
          setIngredientes(
            r.ingredientes?.length
              ? r.ingredientes.map((i) => ({
                  nombre: i.nombre || '',
                  cantidad: i.cantidad ?? '',
                  unidad: i.unidad ?? '',
                }))
              : [{ nombre: '', cantidad: '', unidad: '' }],
          );
          setPasos(r.pasos?.length ? r.pasos.map((p) => p.descripcion) : ['']);
          setCargando(false);
        })
        .catch((err) => {
          if (!vivo) return;
          setError(
            err instanceof ApiError && err.status === 404
              ? 'Receta no encontrada (¿no es tuya o está en la papelera?).'
              : 'No se pudo cargar la receta.',
          );
          setCargando(false);
        });
      api
        .get(`/recipes/${id}/versiones`)
        .then((datos) => vivo && setVersiones(datos.versiones || []))
        .catch(() => {});
    }
    return () => {
      vivo = false;
    };
  }, [id, esEdicion, usuario]);

  if (!usuario) {
    return (
      <div className="glass-card flex flex-col items-center gap-3 py-10 text-center">
        <i className="fa-solid fa-lock text-4xl text-primary" aria-hidden="true" />
        <p className="font-medium">Inicia sesión para crear recetas</p>
        <Link to="/login" className="btn-primary mt-1">
          <i className="fa-solid fa-right-to-bracket" aria-hidden="true" /> Iniciar sesión
        </Link>
      </div>
    );
  }

  // ── Ingredientes y pasos dinámicos ──
  const setIngrediente = (i, campo, valor) =>
    setIngredientes((prev) => prev.map((ing, j) => (j === i ? { ...ing, [campo]: valor } : ing)));
  const agregarIngrediente = () =>
    setIngredientes((prev) => [...prev, { nombre: '', cantidad: '', unidad: '' }]);
  const quitarIngrediente = (i) =>
    setIngredientes((prev) => (prev.length > 1 ? prev.filter((_, j) => j !== i) : prev));
  const setPaso = (i, valor) => setPasos((prev) => prev.map((p, j) => (j === i ? valor : p)));
  const agregarPaso = () => setPasos((prev) => [...prev, '']);
  const quitarPaso = (i) =>
    setPasos((prev) => (prev.length > 1 ? prev.filter((_, j) => j !== i) : prev));

  function agregarEtiqueta() {
    const valor = nuevaEtiqueta.trim();
    if (!valor) return;
    setF((prev) =>
      prev.etiquetas.includes(valor) || prev.etiquetas.length >= 10
        ? prev
        : { ...prev, etiquetas: [...prev.etiquetas, valor] },
    );
    setNuevaEtiqueta('');
  }

  async function subirImagen(evento) {
    const archivo = evento.target.files?.[0];
    if (!archivo) return;
    try {
      const data = await archivoADataURL(archivo);
      set('imagen_url', data);
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Imagen no válida', text: err.message });
    }
  }

  async function guardar(evento) {
    evento.preventDefault();
    setError('');
    if (f.titulo.trim().length < 3) {
      setError('El título debe tener al menos 3 caracteres.');
      return;
    }
    const ingValidos = ingredientes.filter((i) => i.nombre.trim());
    const pasosValidos = pasos.filter((p) => p.trim());
    const cuerpo = {
      titulo: f.titulo.trim(),
      descripcion: f.descripcion.trim() || null,
      tiempo_min: f.tiempo_min === '' ? null : Number(f.tiempo_min),
      dificultad: f.dificultad || null,
      porciones: f.porciones === '' ? null : Number(f.porciones),
      imagen_url: f.imagen_url || null,
      visibilidad: f.visibilidad,
      etiquetas: f.etiquetas,
      ingredientes: ingValidos.map((i) => ({
        nombre: i.nombre.trim(),
        cantidad: i.cantidad === '' ? null : i.cantidad,
        unidad: i.unidad.trim() || null,
      })),
      pasos: pasosValidos.map((p) => ({ descripcion: p.trim() })),
    };

    setGuardando(true);
    try {
      const datos = esEdicion
        ? await api.put(`/recipes/${id}`, cuerpo)
        : await api.post('/recipes', cuerpo);
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: esEdicion ? 'Receta actualizada' : 'Receta creada',
        showConfirmButton: false,
        timer: 1800,
      });
      navigate(`/receta/${datos.receta.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo guardar la receta.');
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar() {
    const resultado = await Swal.fire({
      icon: 'warning',
      title: '¿Eliminar esta receta?',
      text: 'Pasará a la papelera y podrás restaurarla desde ahí.',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
    });
    if (!resultado.isConfirmed) return;
    try {
      await api.delete(`/recipes/${id}`);
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Receta en la papelera',
        showConfirmButton: false,
        timer: 1800,
      });
      navigate('/mis-recetas');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo eliminar.');
    }
  }

  async function restaurarVersion(version) {
    const resultado = await Swal.fire({
      icon: 'question',
      title: `¿Restaurar la versión ${version}?`,
      text: 'Se conservará el estado actual como una versión nueva.',
      showCancelButton: true,
      confirmButtonText: 'Restaurar',
      cancelButtonText: 'Cancelar',
    });
    if (!resultado.isConfirmed) return;
    try {
      const datos = await api.post(`/recipes/${id}/versiones/${version}/restaurar`, {});
      setF((prev) => ({
        ...prev,
        titulo: datos.receta.titulo,
        descripcion: datos.receta.descripcion || '',
        tiempo_min: datos.receta.tiempo_min ?? '',
        dificultad: datos.receta.dificultad || '',
        porciones: datos.receta.porciones ?? '',
        imagen_url: datos.receta.imagen_url || '',
        visibilidad: datos.receta.visibilidad,
        etiquetas: datos.receta.etiquetas || [],
      }));
      setIngredientes(
        datos.receta.ingredientes?.length
          ? datos.receta.ingredientes.map((i) => ({
              nombre: i.nombre || '',
              cantidad: i.cantidad ?? '',
              unidad: i.unidad ?? '',
            }))
          : [{ nombre: '', cantidad: '', unidad: '' }],
      );
      setPasos(datos.receta.pasos?.length ? datos.receta.pasos.map((p) => p.descripcion) : ['']);
      const hist = await api.get(`/recipes/${id}/versiones`);
      setVersiones(hist.versiones || []);
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Versión restaurada',
        showConfirmButton: false,
        timer: 1800,
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo restaurar la versión.');
    }
  }

  if (cargando) {
    return (
      <p className="text-sm text-muted-foreground" role="status">
        <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" /> Cargando receta…
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1>{esEdicion ? 'Editar receta' : 'Nueva receta'}</h1>
          <p className="mt-1 text-muted-foreground">
            {esEdicion
              ? 'Cada guardado crea una versión que puedes restaurar.'
              : 'Título, ingredientes, pasos y lo que quieras contar.'}
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/mis-recetas" className="btn-ghost !px-3">
            <i className="fa-solid fa-arrow-left" aria-hidden="true" /> Volver
          </Link>
          {esEdicion && (
            <button type="button" className="btn-ghost !px-3 text-danger" onClick={eliminar}>
              <i className="fa-solid fa-trash" aria-hidden="true" /> Eliminar
            </button>
          )}
        </div>
      </header>

      {error && (
        <p role="alert" className="glass-card text-sm font-medium text-danger">
          <i className="fa-solid fa-circle-exclamation" aria-hidden="true" /> {error}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <form
          className="surface-section flex flex-col gap-5"
          onSubmit={guardar}
          aria-label="Formulario de receta"
        >
          {/* Datos básicos */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="rf-titulo" className="mb-1 block text-sm font-medium">
                Título *
              </label>
              <input
                id="rf-titulo"
                className="field"
                value={f.titulo}
                onChange={(e) => set('titulo', e.target.value)}
                placeholder="Ej. Arroz con pollo de la abuela"
                required
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="rf-descripcion" className="mb-1 block text-sm font-medium">
                Descripción
              </label>
              <textarea
                id="rf-descripcion"
                className="field min-h-20"
                value={f.descripcion}
                onChange={(e) => set('descripcion', e.target.value)}
                placeholder="Cuenta de qué se trata…"
                maxLength={500}
              />
            </div>
            <div>
              <label htmlFor="rf-tiempo" className="mb-1 block text-sm font-medium">
                Tiempo (minutos)
              </label>
              <input
                id="rf-tiempo"
                className="field"
                type="number"
                min="0"
                max="9999"
                value={f.tiempo_min}
                onChange={(e) => set('tiempo_min', e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="rf-porciones" className="mb-1 block text-sm font-medium">
                Porciones
              </label>
              <input
                id="rf-porciones"
                className="field"
                type="number"
                min="1"
                max="99"
                value={f.porciones}
                onChange={(e) => set('porciones', e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="rf-dificultad" className="mb-1 block text-sm font-medium">
                Dificultad
              </label>
              <select
                id="rf-dificultad"
                className="field"
                value={f.dificultad}
                onChange={(e) => set('dificultad', e.target.value)}
              >
                <option value="">Sin especificar</option>
                {DIFICULTADES.map((d) => (
                  <option key={d.valor} value={d.valor}>
                    {d.texto}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <span className="mb-1 block text-sm font-medium">Foto</span>
              <div className="flex items-center gap-2">
                <label className="btn-secondary cursor-pointer !px-3">
                  <i className="fa-solid fa-camera" aria-hidden="true" /> Subir
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={subirImagen}
                    aria-label="Subir imagen de la receta"
                  />
                </label>
                {f.imagen_url && (
                  <button
                    type="button"
                    className="btn-ghost !px-3"
                    onClick={() => set('imagen_url', '')}
                  >
                    <i className="fa-solid fa-xmark" aria-hidden="true" /> Quitar
                  </button>
                )}
              </div>
            </div>
          </div>

          {f.imagen_url && (
            <img
              src={f.imagen_url}
              alt="Vista previa de la receta"
              className="h-40 w-full rounded-xl object-cover"
            />
          )}

          {/* Ingredientes */}
          <fieldset>
            <legend className="mb-2 text-sm font-medium">
              <i className="fa-solid fa-carrot text-primary" aria-hidden="true" /> Ingredientes
            </legend>
            <div className="flex flex-col gap-2">
              {ingredientes.map((ing, i) => (
                <div key={i} className="grid grid-cols-[1fr_90px_110px_40px] gap-2">
                  <input
                    className="field"
                    value={ing.nombre}
                    onChange={(e) => setIngrediente(i, 'nombre', e.target.value)}
                    placeholder="Ingrediente"
                    aria-label={`Ingrediente ${i + 1}`}
                  />
                  <input
                    className="field"
                    value={ing.cantidad}
                    onChange={(e) => setIngrediente(i, 'cantidad', e.target.value)}
                    placeholder="Cant."
                    aria-label={`Cantidad del ingrediente ${i + 1}`}
                  />
                  <input
                    className="field"
                    value={ing.unidad}
                    onChange={(e) => setIngrediente(i, 'unidad', e.target.value)}
                    placeholder="Unidad"
                    aria-label={`Unidad del ingrediente ${i + 1}`}
                  />
                  <button
                    type="button"
                    className="btn-ghost !px-2"
                    onClick={() => quitarIngrediente(i)}
                    aria-label={`Quitar ingrediente ${i + 1}`}
                  >
                    <i className="fa-solid fa-xmark" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
            <button type="button" className="btn-ghost mt-2 !px-3" onClick={agregarIngrediente}>
              <i className="fa-solid fa-plus" aria-hidden="true" /> Agregar ingrediente
            </button>
          </fieldset>

          {/* Pasos */}
          <fieldset>
            <legend className="mb-2 text-sm font-medium">
              <i className="fa-solid fa-list-ol text-primary" aria-hidden="true" /> Preparación
            </legend>
            <div className="flex flex-col gap-2">
              {pasos.map((paso, i) => (
                <div key={i} className="flex gap-2">
                  <span
                    className="flex h-10 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary"
                    aria-hidden="true"
                  >
                    {i + 1}
                  </span>
                  <textarea
                    className="field min-h-14"
                    value={paso}
                    onChange={(e) => setPaso(i, e.target.value)}
                    placeholder={`Paso ${i + 1}`}
                    aria-label={`Paso ${i + 1}`}
                  />
                  <button
                    type="button"
                    className="btn-ghost !px-2"
                    onClick={() => quitarPaso(i)}
                    aria-label={`Quitar paso ${i + 1}`}
                  >
                    <i className="fa-solid fa-xmark" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
            <button type="button" className="btn-ghost mt-2 !px-3" onClick={agregarPaso}>
              <i className="fa-solid fa-plus" aria-hidden="true" /> Agregar paso
            </button>
          </fieldset>

          {/* Etiquetas */}
          <div>
            <label htmlFor="rf-etiqueta" className="mb-1 block text-sm font-medium">
              Etiquetas
            </label>
            <div className="flex gap-2">
              <input
                id="rf-etiqueta"
                className="field"
                value={nuevaEtiqueta}
                onChange={(e) => setNuevaEtiqueta(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    agregarEtiqueta();
                  }
                }}
                placeholder="Ej. vegano, rapido…"
                maxLength={30}
              />
              <button type="button" className="btn-secondary" onClick={agregarEtiqueta}>
                <i className="fa-solid fa-plus" aria-hidden="true" /> Añadir
              </button>
            </div>
            {f.etiquetas.length > 0 && (
              <ul
                className="mt-2 flex flex-wrap gap-2"
                role="list"
                aria-label="Etiquetas agregadas"
              >
                {f.etiquetas.map((et) => (
                  <li key={et}>
                    <span className="chip">
                      {et}
                      <button
                        type="button"
                        className="ml-1 rounded-full px-1 hover:text-danger"
                        aria-label={`Quitar etiqueta ${et}`}
                        onClick={() =>
                          setF((prev) => ({
                            ...prev,
                            etiquetas: prev.etiquetas.filter((x) => x !== et),
                          }))
                        }
                      >
                        <i className="fa-solid fa-xmark" aria-hidden="true" />
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Visibilidad (RF-12 compartir) */}
          <fieldset>
            <legend className="mb-2 text-sm font-medium">
              <i className="fa-solid fa-earth-americas text-primary" aria-hidden="true" />{' '}
              Visibilidad
            </legend>
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="visibilidad"
                  checked={f.visibilidad === 'privada'}
                  onChange={() => set('visibilidad', 'privada')}
                />
                <i className="fa-solid fa-lock" aria-hidden="true" /> Privada (solo tú)
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="visibilidad"
                  checked={f.visibilidad === 'publica'}
                  onChange={() => set('visibilidad', 'publica')}
                />
                <i className="fa-solid fa-globe" aria-hidden="true" /> Pública (compartible por
                enlace)
              </label>
            </div>
          </fieldset>

          <div className="flex flex-wrap gap-3">
            <button type="submit" className="btn-primary" disabled={guardando}>
              <i
                className={`fa-solid ${guardando ? 'fa-spinner fa-spin' : 'fa-floppy-disk'}`}
                aria-hidden="true"
              />
              {guardando ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Crear receta'}
            </button>
            <Link to={esEdicion ? `/receta/${id}` : '/mis-recetas'} className="btn-ghost">
              Cancelar
            </Link>
          </div>
        </form>

        {/* Panel lateral: imagen + historial */}
        <aside className="flex h-fit flex-col gap-4" aria-label="Información adicional">
          <section className="surface-section">
            <h2 className="text-base">
              <i className="fa-solid fa-circle-info text-primary" aria-hidden="true" /> Consejo
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Usa ingredientes concretos («250 g de arroz») y pasos cortos: así tu receta se lee
              bien en el libro de cocina y al compartirla.
            </p>
          </section>

          {esEdicion && (
            <section className="surface-section" aria-labelledby="versiones-titulo">
              <h2 id="versiones-titulo" className="text-base">
                <i className="fa-solid fa-clock-rotate-left text-primary" aria-hidden="true" />{' '}
                Historial
              </h2>
              {versiones.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  Aún no hay versiones: se crearán al editar.
                </p>
              ) : (
                <ul className="mt-2 flex flex-col gap-2 text-sm" role="list">
                  {versiones.slice(0, 8).map((v) => (
                    <li
                      key={v.version}
                      className="flex items-center justify-between gap-2 border-b border-border/50 pb-2"
                    >
                      <span className="min-w-0">
                        <strong>v{v.version}</strong>{' '}
                        <span className="text-muted-foreground">
                          {new Date(String(v.creado_en).replace(' ', 'T') + 'Z').toLocaleDateString(
                            'es-ES',
                          )}
                        </span>
                      </span>
                      <button
                        type="button"
                        className="btn-ghost !px-2 !text-xs"
                        onClick={() => restaurarVersion(v.version)}
                      >
                        Restaurar
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
