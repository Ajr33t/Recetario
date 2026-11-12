import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { api, ApiError } from '../services/api.js';
import { exito } from '../services/toast.js';
import { useAuthStore } from '../store/authStore.js';

const DIFICULTADES = { facil: 'Fácil', media: 'Media', dificil: 'Difícil' };

/**
 * Mis recetas (RF-06/08 — Fase 5): lista real con acciones
 * (ver, editar, eliminar con SweetAlert2), papelera y selección para
 * generar el libro de cocina en PDF. Exportar/importar JSON vive en Ajustes.
 */
export default function MisRecetas() {
  const usuario = useAuthStore((s) => s.usuario);
  const navigate = useNavigate();
  const [recetas, setRecetas] = useState(null); // null = cargando
  const [error, setError] = useState('');
  const [seleccion, setSeleccion] = useState([]); // ids para el libro
  const [modoSeleccion, setModoSeleccion] = useState(false);

  // Filtros avanzados (RF-10 — Fase 9): tiempo, dificultad, texto y
  // etiqueta/dieta. Sobre recetas propias sí existen tiempo y dificultad
  // (TheMealDB no los publica; ver docs/informes/fase-9.md).
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroTiempo, setFiltroTiempo] = useState('');
  const [filtroDificultad, setFiltroDificultad] = useState('');
  const [filtroEtiqueta, setFiltroEtiqueta] = useState('');

  const etiquetasDisponibles = [
    ...new Set((recetas || []).flatMap((r) => (Array.isArray(r.etiquetas) ? r.etiquetas : []))),
  ].slice(0, 20);

  const recetasFiltradas = (recetas || []).filter((r) => {
    const texto = filtroTexto.trim().toLowerCase();
    if (texto) {
      const enTitulo = r.titulo.toLowerCase().includes(texto);
      const enEtiquetas = (Array.isArray(r.etiquetas) ? r.etiquetas : []).some((t) =>
        String(t).toLowerCase().includes(texto),
      );
      if (!enTitulo && !enEtiquetas) return false;
    }
    if (filtroTiempo && (!r.tiempo_min || r.tiempo_min > Number(filtroTiempo))) return false;
    if (filtroDificultad && r.dificultad !== filtroDificultad) return false;
    if (
      filtroEtiqueta &&
      !(Array.isArray(r.etiquetas) ? r.etiquetas : []).includes(filtroEtiqueta)
    ) {
      return false;
    }
    return true;
  });

  // Recetas que un filtro excluyó por no tener el dato (aviso transparente)
  const ocultasPorDato =
    recetas && recetas.length > 0
      ? recetas.filter((r) => {
          if (filtroTiempo && !r.tiempo_min) return true;
          if (filtroDificultad && !r.dificultad) return true;
          return false;
        }).length
      : 0;

  const hayFiltros = Boolean(filtroTexto || filtroTiempo || filtroDificultad || filtroEtiqueta);

  function limpiarFiltros() {
    setFiltroTexto('');
    setFiltroTiempo('');
    setFiltroDificultad('');
    setFiltroEtiqueta('');
  }

  function cargar() {
    api
      .get('/recipes')
      .then((datos) => setRecetas(datos.recetas))
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : 'No se pudieron cargar las recetas');
        setRecetas([]);
      });
  }

  useEffect(() => {
    if (!usuario) {
      setRecetas([]);
      return;
    }
    cargar();
  }, [usuario]);

  async function eliminar(receta) {
    const resultado = await Swal.fire({
      icon: 'warning',
      title: '¿Eliminar esta receta?',
      text: `«${receta.titulo}» pasará a la papelera (30 días de retención).`,
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
    });
    if (!resultado.isConfirmed) return;
    try {
      await api.delete(`/recipes/${receta.id}`);
      exito('Receta en la papelera');
      setSeleccion((prev) => prev.filter((x) => x !== receta.id));
      cargar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo eliminar la receta.');
    }
  }

  function alternarSeleccion(id) {
    setSeleccion((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function irAlLibro() {
    const base = hayFiltros ? recetasFiltradas : recetas;
    const ids = modoSeleccion && seleccion.length > 0 ? seleccion : base.map((r) => r.id);
    navigate('/libro', { state: { ids } });
  }

  // Invitado: invitación a iniciar sesión
  if (!usuario) {
    return (
      <div className="flex flex-col gap-6">
        <header>
          <h1>Mis recetas</h1>
          <p className="mt-1 text-muted-foreground">
            Crea, edita y organiza tu recetario personal.
          </p>
        </header>
        <div className="glass-card flex flex-col items-center gap-3 py-10 text-center">
          <i className="fa-solid fa-lock text-4xl text-primary" aria-hidden="true" />
          <p className="font-medium">Inicia sesión para ver tu recetario</p>
          <p className="max-w-md text-sm text-muted-foreground">
            Tus recetas se guardan en tu cuenta: al iniciar sesión las ves desde cualquier
            dispositivo.
          </p>
          <Link to="/login" className="btn-primary mt-1">
            <i className="fa-solid fa-right-to-bracket" aria-hidden="true" /> Iniciar sesión
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1>Mis recetas</h1>
          <p className="mt-1 text-muted-foreground">
            Tu recetario personal, sincronizado con tu cuenta.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/recetas/nueva" className="btn-primary !px-3">
            <i className="fa-solid fa-plus" aria-hidden="true" /> Nueva receta
          </Link>
          <Link to="/papelera" className="btn-ghost !px-3">
            <i className="fa-solid fa-trash-can" aria-hidden="true" /> Papelera
          </Link>
        </div>
      </header>

      {/* Filtros avanzados (RF-10): tiempo, dificultad, texto y etiqueta */}
      {recetas && recetas.length > 0 && (
        <section className="surface-section" aria-labelledby="filtros-recetas-titulo" role="group">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="filtros-recetas-titulo" className="text-base">
              <i className="fa-solid fa-filter text-primary" aria-hidden="true" /> Filtrar recetas
            </h2>
            {hayFiltros && (
              <button type="button" className="btn-ghost !px-3 !text-xs" onClick={limpiarFiltros}>
                <i className="fa-solid fa-xmark" aria-hidden="true" /> Limpiar filtros
              </button>
            )}
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="flex flex-col gap-1 text-sm">
              Texto (título o etiqueta)
              <input
                type="search"
                className="field"
                value={filtroTexto}
                onChange={(e) => setFiltroTexto(e.target.value)}
                placeholder="Ej. pollo, dulce…"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Tiempo máximo
              <select
                className="field"
                value={filtroTiempo}
                onChange={(e) => setFiltroTiempo(e.target.value)}
              >
                <option value="">Sin límite</option>
                <option value="15">Hasta 15 min</option>
                <option value="30">Hasta 30 min</option>
                <option value="45">Hasta 45 min</option>
                <option value="60">Hasta 60 min</option>
                <option value="90">Hasta 90 min</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Dificultad
              <select
                className="field"
                value={filtroDificultad}
                onChange={(e) => setFiltroDificultad(e.target.value)}
              >
                <option value="">Cualquiera</option>
                <option value="facil">Fácil</option>
                <option value="media">Media</option>
                <option value="dificil">Difícil</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Etiqueta / dieta
              <select
                className="field"
                value={filtroEtiqueta}
                onChange={(e) => setFiltroEtiqueta(e.target.value)}
              >
                <option value="">Cualquiera</option>
                {etiquetasDisponibles.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {hayFiltros && (
            <p className="mt-2 text-xs text-muted-foreground" role="status">
              Mostrando {recetasFiltradas.length} de {recetas.length} recetas
              {ocultasPorDato > 0 &&
                ` · ${ocultasPorDato} sin dato de tiempo/dificultad no pasan el filtro`}
              .
            </p>
          )}
        </section>
      )}

      {/* Acciones del recetario: selección y libro de cocina (PDF) */}
      {recetas && recetas.length > 0 && (
        <div
          className="surface-section flex flex-wrap items-center gap-2"
          role="group"
          aria-label="Acciones del recetario"
        >
          <button
            type="button"
            className={modoSeleccion ? 'btn-primary !px-3' : 'btn-ghost !px-3'}
            aria-pressed={modoSeleccion}
            onClick={() => {
              setModoSeleccion((v) => !v);
              setSeleccion([]);
            }}
          >
            <i className="fa-solid fa-square-check" aria-hidden="true" /> Elegir para el libro
          </button>
          {modoSeleccion && seleccion.length > 0 && (
            <span className="chip">{seleccion.length} seleccionada(s)</span>
          )}
          <span className="mx-1 h-6 w-px bg-border" aria-hidden="true" />
          <button type="button" className="btn-secondary !px-3" onClick={irAlLibro}>
            <i className="fa-solid fa-file-pdf" aria-hidden="true" /> Generar libro de cocina (PDF)
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className="glass-card text-sm font-medium text-danger">
          <i className="fa-solid fa-circle-exclamation" aria-hidden="true" /> {error}
        </p>
      )}

      {recetas === null && (
        <p className="text-sm text-muted-foreground" role="status">
          <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" /> Cargando tus recetas…
        </p>
      )}

      {recetas?.length === 0 && !error && (
        <div className="glass-card flex flex-col items-center gap-2 py-10 text-center">
          <i className="fa-solid fa-book-open text-4xl text-primary" aria-hidden="true" />
          <p className="font-medium">Tu recetario está vacío</p>
          <p className="max-w-md text-sm text-muted-foreground">
            Crea tu primera receta con ingredientes, pasos, fotos y etiquetas. Después podrás
            reunirlas en un libro de cocina en PDF.
          </p>
          <Link to="/recetas/nueva" className="btn-primary mt-1">
            <i className="fa-solid fa-plus" aria-hidden="true" /> Crear mi primera receta
          </Link>
        </div>
      )}

      {recetas?.length > 0 && recetasFiltradas.length === 0 && (
        <div className="glass-card flex flex-col items-center gap-2 py-10 text-center">
          <i
            className="fa-solid fa-filter-circle-xmark text-4xl text-muted-foreground"
            aria-hidden="true"
          />
          <p className="font-medium">Ninguna receta pasa los filtros</p>
          <p className="max-w-md text-sm text-muted-foreground">
            Ajusta o limpia los filtros para ver tu recetario completo.
          </p>
          <button type="button" className="btn-secondary mt-1 !px-3" onClick={limpiarFiltros}>
            <i className="fa-solid fa-xmark" aria-hidden="true" /> Limpiar filtros
          </button>
        </div>
      )}

      {recetasFiltradas.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" role="list">
          {recetasFiltradas.map((receta) => {
            const elegida = seleccion.includes(receta.id);
            return (
              <li key={receta.id} className="glass-card flex flex-col">
                {modoSeleccion && (
                  <label className="mb-2 flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={elegida}
                      onChange={() => alternarSeleccion(receta.id)}
                      aria-label={`Seleccionar ${receta.titulo} para el libro`}
                    />
                    Incluir en el libro
                  </label>
                )}
                {receta.imagen_url ? (
                  <img
                    src={receta.imagen_url}
                    alt=""
                    loading="lazy"
                    className="mb-3 h-28 w-full rounded-xl object-cover"
                  />
                ) : (
                  <span
                    className="mb-3 flex h-20 items-center justify-center rounded-xl bg-primary/10 text-2xl text-primary"
                    aria-hidden="true"
                  >
                    <i className="fa-solid fa-utensils" />
                  </span>
                )}
                <h3 className="text-base">
                  <Link to={`/receta/${receta.id}`} className="hover:text-primary">
                    {receta.titulo}
                  </Link>
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {receta.tiempo_min && (
                    <>
                      <i className="fa-solid fa-clock" aria-hidden="true" /> {receta.tiempo_min} min
                      ·{' '}
                    </>
                  )}
                  {receta.dificultad && (
                    <>
                      <i className="fa-solid fa-signal" aria-hidden="true" />{' '}
                      {DIFICULTADES[receta.dificultad] || receta.dificultad}
                    </>
                  )}
                  {!receta.tiempo_min && !receta.dificultad && (
                    <span className="italic">Sin datos de preparación</span>
                  )}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  <i
                    className={`fa-solid ${receta.visibilidad === 'publica' ? 'fa-globe' : 'fa-lock'}`}
                    aria-hidden="true"
                  />{' '}
                  {receta.visibilidad === 'publica' ? 'Pública' : 'Privada'}
                  {receta.origen === 'sugerida' && (
                    <>
                      {' '}
                      · <i className="fa-solid fa-database" aria-hidden="true" /> de TheMealDB
                    </>
                  )}
                </p>
                <div className="mt-3 flex flex-wrap gap-2 border-t border-border/50 pt-3">
                  <Link to={`/receta/${receta.id}`} className="btn-ghost !px-3 !text-xs">
                    <i className="fa-solid fa-eye" aria-hidden="true" /> Ver
                  </Link>
                  <Link to={`/recetas/${receta.id}/editar`} className="btn-ghost !px-3 !text-xs">
                    <i className="fa-solid fa-pen" aria-hidden="true" /> Editar
                  </Link>
                  <button
                    type="button"
                    className="btn-ghost !px-3 !text-xs text-danger"
                    onClick={() => eliminar(receta)}
                  >
                    <i className="fa-solid fa-trash" aria-hidden="true" /> Eliminar
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
