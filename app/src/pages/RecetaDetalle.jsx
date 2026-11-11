import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import { api, ApiError } from '../services/api.js';
import { useAuthStore } from '../store/authStore.js';
import { descargarImagenReceta, imprimirReceta, escaparHtml } from '../services/exportarReceta.js';

const DIFICULTADES = { facil: 'Fácil', media: 'Media', dificil: 'Difícil' };

/** Normaliza una receta propia (servidor) a la forma de visualización. */
function normalizarPropia(r, usuario) {
  return {
    titulo: r.titulo,
    descripcion: r.descripcion || null,
    imagen: r.imagen_url || null,
    categoria: null,
    area: null,
    etiquetas: r.etiquetas || [],
    ingredientes: (r.ingredientes || []).map((i) => ({
      nombre: i.nombre,
      cantidad: [i.cantidad, i.unidad].filter((v) => v != null && v !== '').join(' ') || null,
    })),
    pasos: (r.pasos || []).map((p) => p.descripcion),
    tiempo: r.tiempo_min,
    dificultad: r.dificultad,
    porciones: r.porciones,
    video: null,
    fuente: null,
    fuenteDatos: r.origen === 'sugerida' ? 'themealdb' : 'propia',
    esPropia: true,
    esMia: Boolean(usuario) && r.user_id === usuario.id,
    esPublica: r.visibilidad === 'publica',
    traducido: false,
  };
}

/** Normaliza una receta de TheMealDB (Fase 4) a la forma de visualización. */
function normalizarExterna(r) {
  return {
    titulo: r.titulo,
    descripcion: null,
    imagen: r.imagen || null,
    categoria: r.categoria,
    area: r.area,
    etiquetas: r.etiquetas || [],
    ingredientes: (r.ingredientes || []).map((i) => ({
      nombre: i.nombre,
      cantidad: i.cantidad || null,
    })),
    pasos: String(r.instrucciones || '')
      .split(/\r?\n+/)
      .map((p) => p.trim())
      .filter(Boolean),
    tiempo: null,
    dificultad: null,
    porciones: null,
    video: r.video,
    fuente: r.fuente,
    fuenteDatos: 'themealdb',
    esPropia: false,
    esMia: false,
    esPublica: true,
    traducido: Boolean(r.traducido),
  };
}

/**
 * Detalle de receta (RF-05/09/12 + ingredientes faltantes) — Fase 5.
 * Soporta recetas propias (públicas compartibles / privadas con sesión)
 * y externas de TheMealDB. Acciones: favorito (corazón), compartir por
 * enlace/copia de texto, editar/eliminar si es tuya, y resaltado de los
 * ingredientes que te faltan según tu última búsqueda.
 */
export default function RecetaDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const usuario = useAuthStore((s) => s.usuario);

  const [receta, setReceta] = useState(null); // null = cargando
  const [fuente, setFuente] = useState(null); // 'propia' | 'externa'
  const [error, setError] = useState('');
  const [favorito, setFavorito] = useState(false);
  const [recetaInterna, setRecetaInterna] = useState(null); // id interno (externas importadas)
  const [disponibles, setDisponibles] = useState([]); // ingredientes de la última búsqueda
  const [marcados, setMarcados] = useState({}); // checklist de ingredientes

  // Cargar receta: propia/pública primero; si no, TheMealDB
  useEffect(() => {
    let vivo = true;
    setReceta(null);
    setError('');
    setFuente(null);
    setFavorito(false);
    setRecetaInterna(null);

    (async () => {
      try {
        const datos = await api.get(`/recipes/${id}`);
        if (!vivo) return;
        setReceta(normalizarPropia(datos.receta, usuario));
        setFuente('propia');
        setFavorito(Boolean(datos.receta.favorito));
        setRecetaInterna(datos.receta.id);
      } catch (err) {
        if (!vivo) return;
        if (!(err instanceof ApiError && err.status === 404)) {
          setError('No se pudo cargar la receta. Reintenta en unos segundos.');
          return;
        }
        try {
          const ext = await api.get(`/search/receta/${id}`);
          if (!vivo) return;
          setReceta(normalizarExterna(ext.receta));
          setFuente('externa');
          if (usuario) {
            const estado = await api.get(`/favorites/estado?externo_id=${id}`).catch(() => null);
            if (vivo && estado) {
              setFavorito(estado.favorito);
              setRecetaInterna(estado.receta_id);
            }
          }
        } catch {
          if (vivo) setError('Esta receta no existe o ya no está disponible.');
        }
      }
    })();
    return () => {
      vivo = false;
    };
  }, [id, usuario]);

  // Ingredientes disponibles de la última búsqueda (ingredientes faltantes)
  useEffect(() => {
    try {
      const guardados = JSON.parse(sessionStorage.getItem('sazonlab:ingredientes') || '[]');
      setDisponibles(Array.isArray(guardados) ? guardados : []);
    } catch {
      setDisponibles([]);
    }
  }, [id]);

  function falta(ingrediente) {
    if (disponibles.length === 0) return false;
    const nombre = ingrediente.toLowerCase();
    return !disponibles.some((d) => nombre.includes(d) || d.includes(nombre));
  }

  // ── Checklist de ingredientes (persistido por receta) ──
  useEffect(() => {
    try {
      const guardado = JSON.parse(localStorage.getItem(`sazonlab:checklist:${id}`) || '{}');
      setMarcados(guardado && typeof guardado === 'object' ? guardado : {});
    } catch {
      setMarcados({});
    }
  }, [id]);

  function alternarCheck(nombre) {
    setMarcados((prev) => {
      const siguiente = { ...prev, [nombre]: !prev[nombre] };
      if (!siguiente[nombre]) delete siguiente[nombre]; // solo los marcados
      try {
        localStorage.setItem(`sazonlab:checklist:${id}`, JSON.stringify(siguiente));
      } catch {
        /* almacenamiento no disponible: el marcado vive en la sesión */
      }
      return siguiente;
    });
  }

  function vaciarCheck() {
    setMarcados({});
    try {
      localStorage.removeItem(`sazonlab:checklist:${id}`);
    } catch {
      /* almacenamiento no disponible */
    }
  }

  async function alternarFavorito() {
    if (!usuario) {
      const r = await Swal.fire({
        icon: 'info',
        title: 'Inicia sesión',
        text: 'Para guardar recetas en tus favoritos necesitas una cuenta.',
        showCancelButton: true,
        confirmButtonText: 'Iniciar sesión',
        cancelButtonText: 'Ahora no',
      });
      if (r.isConfirmed) navigate('/login');
      return;
    }
    try {
      if (fuente === 'externa') {
        if (favorito && recetaInterna) {
          const res = await api.post(`/favorites/${recetaInterna}`, {});
          setFavorito(res.favorito);
        } else {
          const res = await api.post('/favorites/externa', { externo_id: String(id) });
          setFavorito(res.favorito);
          setRecetaInterna(res.receta_id);
        }
      } else {
        const res = await api.post(`/favorites/${id}`, {});
        setFavorito(res.favorito);
      }
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: favorito ? 'info' : 'success',
        title: favorito ? 'Quitada de favoritos' : 'Guardada en favoritos',
        showConfirmButton: false,
        timer: 1400,
      });
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'No se pudo actualizar',
        text: err instanceof ApiError ? err.message : 'Reintenta en unos segundos.',
      });
    }
  }

  function enlaceReceta() {
    const base = window.location.href.split('#')[0];
    return `${base}#/receta/${id}`;
  }

  function textoReceta() {
    const lineas = [receta.titulo, ''];
    if (receta.descripcion) lineas.push(receta.descripcion, '');
    lineas.push('Ingredientes:');
    receta.ingredientes.forEach((i) =>
      lineas.push(`• ${i.nombre}${i.cantidad ? ` — ${i.cantidad}` : ''}`),
    );
    lineas.push('', 'Preparación:');
    receta.pasos.forEach((p, i) => lineas.push(`${i + 1}. ${p}`));
    lineas.push('', `Receta de SazónLab — ${enlaceReceta()}`);
    return lineas.join('\n');
  }

  async function copiar(texto, mensaje) {
    try {
      await navigator.clipboard.writeText(texto);
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: mensaje,
        showConfirmButton: false,
        timer: 1500,
      });
    } catch {
      Swal.fire({ icon: 'info', title: 'Copia manualmente', text: texto.slice(0, 300) });
    }
  }

  async function compartir() {
    const enlace = enlaceReceta();
    const privada = receta.esMia && !receta.esPublica;
    let accion = null; // qué opción eligió el usuario

    await Swal.fire({
      title: 'Compartir receta',
      html: `
        <p style="margin-bottom:.5rem">${escaparHtml(receta.titulo)}</p>
        <input id="swal-enlace" readonly value="${escaparHtml(enlace)}" class="swal2-input" style="font-size:.8rem">
        ${privada ? '<p style="font-size:.85rem;color:#f87171">Esta receta es privada: al compartirla se hará pública.</p>' : ''}
        <div style="display:flex;flex-direction:column;gap:.5rem;margin-top:.5rem;text-align:left">
          <button type="button" class="btn-secondary" data-accion="enlace">
            <i class="fa-solid ${privada ? 'fa-globe' : 'fa-link'}" aria-hidden="true"></i>
            ${privada ? 'Publicar y copiar enlace' : 'Copiar enlace'}
          </button>
          <button type="button" class="btn-ghost" data-accion="texto">
            <i class="fa-solid fa-align-left" aria-hidden="true"></i> Copiar receta como texto
          </button>
          <button type="button" class="btn-ghost" data-accion="imagen">
            <i class="fa-solid fa-image" aria-hidden="true"></i> Descargar como imagen (PNG)
          </button>
          <button type="button" class="btn-ghost" data-accion="pdf">
            <i class="fa-solid fa-file-pdf" aria-hidden="true"></i> Exportar a PDF
          </button>
        </div>
      `,
      showCancelButton: true,
      cancelButtonText: 'Cerrar',
      showConfirmButton: false,
      focusCancelButton: true,
      didRender: () => {
        Swal.getPopup()
          ?.querySelectorAll('[data-accion]')
          .forEach((boton) => {
            boton.addEventListener('click', () => {
              accion = boton.dataset.accion;
              Swal.close();
            });
          });
      },
    });

    if (!accion) return;

    if (accion === 'enlace') {
      if (privada) {
        try {
          await api.put(`/recipes/${id}`, { visibilidad: 'publica' });
          setReceta((prev) => ({ ...prev, esPublica: true }));
          await copiar(enlace, 'Receta publicada · enlace copiado');
        } catch (err) {
          Swal.fire({
            icon: 'error',
            title: 'No se pudo publicar',
            text: err instanceof ApiError ? err.message : 'Reintenta.',
          });
        }
      } else {
        await copiar(enlace, 'Enlace copiado');
      }
      return;
    }

    if (accion === 'texto') {
      await copiar(textoReceta(), 'Receta copiada como texto');
      return;
    }

    if (accion === 'imagen') {
      try {
        await descargarImagenReceta(receta);
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'Imagen descargada',
          showConfirmButton: false,
          timer: 1600,
        });
      } catch (err) {
        Swal.fire({
          icon: 'error',
          title: 'No se pudo generar la imagen',
          text: err.message || 'Reintenta en unos segundos.',
        });
      }
      return;
    }

    // accion === 'pdf': vista de impresión con la receta sola
    try {
      imprimirReceta(receta);
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'No se pudo abrir la impresión',
        text: err.message || 'Reintenta en unos segundos.',
      });
    }
  }

  async function eliminar() {
    const resultado = await Swal.fire({
      icon: 'warning',
      title: '¿Eliminar esta receta?',
      text: 'Pasará a la papelera (retención de 30 días).',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
    });
    if (!resultado.isConfirmed) return;
    try {
      await api.delete(`/recipes/${id}`);
      navigate('/mis-recetas');
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'No se pudo eliminar',
        text: err instanceof ApiError ? err.message : 'Reintenta.',
      });
    }
  }

  // ── Estados ──
  if (error) {
    return (
      <div className="flex flex-col gap-4">
        <Link to="/buscar" className="btn-ghost w-fit !px-3">
          <i className="fa-solid fa-arrow-left" aria-hidden="true" />
          Volver a buscar
        </Link>
        <div className="glass-card flex flex-col items-center gap-2 py-10 text-center">
          <i className="fa-solid fa-face-frown text-4xl text-muted-foreground" aria-hidden="true" />
          <p className="font-medium">{error}</p>
          <Link to="/buscar" className="btn-primary mt-1">
            <i className="fa-solid fa-magnifying-glass" aria-hidden="true" /> Buscar otra receta
          </Link>
        </div>
      </div>
    );
  }

  if (!receta) {
    return (
      <div className="flex flex-col gap-4">
        <Link to="/buscar" className="btn-ghost w-fit !px-3">
          <i className="fa-solid fa-arrow-left" aria-hidden="true" />
          Volver
        </Link>
        <p className="text-sm text-muted-foreground" role="status">
          <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" /> Cargando receta…
        </p>
      </div>
    );
  }

  const faltantes =
    disponibles.length > 0 ? receta.ingredientes.filter((i) => falta(i.nombre)) : [];

  return (
    <article className="flex flex-col gap-6">
      <Link to={fuente === 'propia' ? '/mis-recetas' : '/buscar'} className="btn-ghost w-fit !px-3">
        <i className="fa-solid fa-arrow-left" aria-hidden="true" />
        {fuente === 'propia' ? 'Mis recetas' : 'Volver'}
      </Link>

      <header className="glass-card">
        <div className="flex flex-wrap gap-5">
          {receta.imagen && (
            <img
              src={receta.imagen}
              alt={receta.titulo}
              className="h-44 w-44 shrink-0 rounded-2xl object-cover"
            />
          )}
          <div className="min-w-0 flex-1">
            <h1>{receta.titulo}</h1>
            {receta.descripcion && (
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{receta.descripcion}</p>
            )}
            <div className="mt-3 flex flex-wrap gap-2" role="list" aria-label="Datos de la receta">
              {receta.categoria && (
                <span className="chip" role="listitem">
                  <i className="fa-solid fa-bowl-food" aria-hidden="true" /> {receta.categoria}
                </span>
              )}
              {receta.area && (
                <span className="chip" role="listitem">
                  <i className="fa-solid fa-earth-americas" aria-hidden="true" /> {receta.area}
                </span>
              )}
              {receta.tiempo && (
                <span className="chip" role="listitem">
                  <i className="fa-solid fa-clock" aria-hidden="true" /> {receta.tiempo} min
                </span>
              )}
              {receta.dificultad && (
                <span className="chip" role="listitem">
                  <i className="fa-solid fa-signal" aria-hidden="true" />{' '}
                  {DIFICULTADES[receta.dificultad] || receta.dificultad}
                </span>
              )}
              {receta.porciones && (
                <span className="chip" role="listitem">
                  <i className="fa-solid fa-users" aria-hidden="true" /> {receta.porciones}{' '}
                  porciones
                </span>
              )}
              {receta.etiquetas.map((et) => (
                <span className="chip" role="listitem" key={et}>
                  <i className="fa-solid fa-tag" aria-hidden="true" /> {et}
                </span>
              ))}
              <span className="chip" role="listitem">
                <i
                  className={`fa-solid ${receta.fuenteDatos === 'themealdb' ? 'fa-database' : 'fa-pen'}`}
                  aria-hidden="true"
                />{' '}
                {receta.fuenteDatos === 'themealdb'
                  ? 'TheMealDB'
                  : receta.fuenteDatos === 'sugerida'
                    ? 'Guardada de TheMealDB'
                    : 'Receta propia'}
              </span>
              {receta.traducido && (
                <span className="chip" role="listitem">
                  <i className="fa-solid fa-language" aria-hidden="true" /> Traducido al español
                </span>
              )}
              {receta.esPublica && (
                <span className="chip" role="listitem">
                  <i className="fa-solid fa-globe" aria-hidden="true" /> Pública
                </span>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-2" role="list" aria-label="Acciones">
              <button
                type="button"
                className={favorito ? 'btn-primary !px-3' : 'btn-secondary !px-3'}
                aria-pressed={favorito}
                onClick={alternarFavorito}
              >
                <i
                  className={`${favorito ? 'fa-solid' : 'fa-regular'} fa-heart`}
                  aria-hidden="true"
                />
                {favorito ? ' Guardada' : ' Guardar'}
              </button>
              <button type="button" className="btn-secondary !px-3" onClick={compartir}>
                <i className="fa-solid fa-share-nodes" aria-hidden="true" /> Compartir
              </button>
              {receta.esMia && (
                <>
                  <Link to={`/recetas/${id}/editar`} className="btn-ghost !px-3">
                    <i className="fa-solid fa-pen" aria-hidden="true" /> Editar
                  </Link>
                  <button type="button" className="btn-ghost !px-3 text-danger" onClick={eliminar}>
                    <i className="fa-solid fa-trash" aria-hidden="true" /> Eliminar
                  </button>
                </>
              )}
              {receta.video && (
                <a
                  href={receta.video}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="btn-ghost !px-3"
                >
                  <i className="fa-solid fa-video" aria-hidden="true" /> Ver video
                </a>
              )}
              {receta.fuente && (
                <a
                  href={receta.fuente}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="btn-ghost !px-3"
                >
                  <i className="fa-solid fa-link" aria-hidden="true" /> Fuente original
                </a>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Ingredientes faltantes según la última búsqueda */}
      {faltantes.length > 0 && (
        <div className="glass-card border-l-4 border-l-danger" role="status">
          <h2 className="text-base">
            <i className="fa-solid fa-basket-shopping text-danger" aria-hidden="true" /> Te faltan{' '}
            {faltantes.length} de {receta.ingredientes.length} ingredientes
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Según tu última búsqueda ({disponibles.join(', ')}):{' '}
            <strong className="text-danger">{faltantes.map((f) => f.nombre).join(', ')}</strong>
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        {/* Ingredientes (checklist) */}
        <section className="surface-section h-fit" aria-labelledby="ingredientes-titulo">
          <h2 id="ingredientes-titulo" className="text-base">
            <i className="fa-solid fa-carrot text-primary" aria-hidden="true" /> Ingredientes (
            {receta.ingredientes.length})
            {Object.keys(marcados).length > 0 && (
              <span className="chip ml-2">
                <i className="fa-solid fa-check" aria-hidden="true" />{' '}
                {Object.keys(marcados).length}/{receta.ingredientes.length} listos
              </span>
            )}
          </h2>
          <ul className="mt-3 flex flex-col gap-1.5 text-sm" role="list">
            {receta.ingredientes.map((ing, i) => {
              const esFaltante = disponibles.length > 0 && falta(ing.nombre);
              const marcado = Boolean(marcados[ing.nombre]);
              return (
                <li
                  key={`${i}-${ing.nombre}`}
                  className={`flex items-center justify-between gap-2 border-b border-border/50 pb-1.5 ${
                    esFaltante ? 'text-danger' : ''
                  }`}
                >
                  <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={marcado}
                      onChange={() => alternarCheck(ing.nombre)}
                      className="h-4 w-4 shrink-0 accent-[rgb(var(--primary))]"
                      aria-label={`Marcar ${ing.nombre} como listo`}
                    />
                    <span className={marcado ? 'line-through opacity-60' : ''}>
                      {esFaltante && (
                        <i
                          className="fa-solid fa-circle-minus mr-1.5"
                          aria-hidden="true"
                          title="Te falta"
                        />
                      )}
                      {ing.nombre}
                    </span>
                  </label>
                  <span
                    className={`${
                      esFaltante ? 'font-medium' : 'text-muted-foreground'
                    } ${marcado ? 'line-through opacity-60' : ''}`}
                  >
                    {ing.cantidad || 'al gusto'}
                  </span>
                </li>
              );
            })}
          </ul>
          {Object.keys(marcados).length > 0 && (
            <button type="button" className="btn-ghost mt-2 !px-2 text-xs" onClick={vaciarCheck}>
              <i className="fa-solid fa-eraser" aria-hidden="true" /> Vaciar checklist
            </button>
          )}
          {disponibles.length > 0 && (
            <p className="mt-3 text-xs text-muted-foreground">
              <i className="fa-solid fa-circle-info" aria-hidden="true" /> Marcados en rojo los que
              no tienes de tu última búsqueda.
            </p>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            <i className="fa-solid fa-ruler-combined" aria-hidden="true" />{' '}
            <Link to="/medidas" className="underline hover:text-primary">
              ¿Dudas con las medidas? Ver tabla y conversor
            </Link>
          </p>
        </section>

        {/* Preparación */}
        <section className="surface-section" aria-labelledby="instrucciones-titulo">
          <h2 id="instrucciones-titulo" className="text-base">
            <i className="fa-solid fa-list-ol text-primary" aria-hidden="true" /> Preparación
          </h2>
          <ol className="mt-3 flex flex-col gap-3">
            {receta.pasos.map((paso, i) => (
              <li key={i} className="flex gap-3">
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground"
                  aria-hidden="true"
                >
                  {i + 1}
                </span>
                <p className="text-sm leading-relaxed text-muted-foreground">{paso}</p>
              </li>
            ))}
            {receta.pasos.length === 0 && (
              <li className="text-sm text-muted-foreground italic">
                Esta receta aún no tiene pasos de preparación.
              </li>
            )}
          </ol>
        </section>
      </div>
    </article>
  );
}
