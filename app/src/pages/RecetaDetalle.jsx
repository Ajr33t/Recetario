import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, ApiError } from '../services/api.js';

/**
 * Detalle de receta (RF-05) — Fase 4: recetas de TheMealDB vía la API
 * (imagen, categoría, área, ingredientes con medidas, instrucciones,
 * video y fuente). Favoritos y recetas propias se conectan en la Fase 5.
 */
export default function RecetaDetalle() {
  const { id } = useParams();
  const [receta, setReceta] = useState(null); // null = cargando
  const [error, setError] = useState('');

  useEffect(() => {
    let vivo = true;
    setReceta(null);
    setError('');
    api
      .get(`/search/receta/${id}`)
      .then((datos) => vivo && setReceta(datos.receta))
      .catch((err) => {
        if (!vivo) return;
        setError(
          err instanceof ApiError && err.status === 404
            ? 'Esta receta no existe o ya no está disponible.'
            : 'No se pudo cargar la receta. Reintenta en unos segundos.',
        );
      });
    return () => {
      vivo = false;
    };
  }, [id]);

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

  // Instrucciones en pasos (TheMealDB usa saltos de línea)
  const pasos = receta.instrucciones
    .split(/\r?\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <article className="flex flex-col gap-6">
      <Link to="/buscar" className="btn-ghost w-fit !px-3">
        <i className="fa-solid fa-arrow-left" aria-hidden="true" />
        Volver
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
            <div className="mt-2 flex flex-wrap gap-2" role="list" aria-label="Datos de la receta">
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
              {receta.etiquetas.map((etiqueta) => (
                <span className="chip" role="listitem" key={etiqueta}>
                  <i className="fa-solid fa-tag" aria-hidden="true" /> {etiqueta}
                </span>
              ))}
              <span className="chip" role="listitem">
                <i className="fa-solid fa-database" aria-hidden="true" /> TheMealDB
              </span>
              {receta.traducido && (
                <span className="chip" role="listitem">
                  <i className="fa-solid fa-language" aria-hidden="true" /> Traducido al español
                </span>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="chip !opacity-100" title="Favoritos: Fase 5">
                <i className="fa-solid fa-heart" aria-hidden="true" /> Favorito (Fase 5)
              </span>
              {receta.video && (
                <a
                  href={receta.video}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="btn-secondary !px-3"
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

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        {/* Ingredientes */}
        <section className="surface-section h-fit" aria-labelledby="ingredientes-titulo">
          <h2 id="ingredientes-titulo" className="text-base">
            <i className="fa-solid fa-carrot text-primary" aria-hidden="true" /> Ingredientes (
            {receta.ingredientes.length})
          </h2>
          <ul className="mt-3 flex flex-col gap-1.5 text-sm" role="list">
            {receta.ingredientes.map((ing) => (
              <li
                key={ing.nombre}
                className="flex items-center justify-between gap-2 border-b border-border/50 pb-1.5"
              >
                <span>{ing.nombre}</span>
                <span className="text-muted-foreground">{ing.cantidad || 'al gusto'}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Instrucciones */}
        <section className="surface-section" aria-labelledby="instrucciones-titulo">
          <h2 id="instrucciones-titulo" className="text-base">
            <i className="fa-solid fa-list-ol text-primary" aria-hidden="true" /> Preparación
          </h2>
          <ol className="mt-3 flex flex-col gap-3">
            {pasos.map((paso, i) => (
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
          </ol>
        </section>
      </div>
    </article>
  );
}
