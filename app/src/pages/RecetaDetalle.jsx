import { Link, useParams } from 'react-router-dom';

/** Detalle de receta (RF-05). Contenido real: Fase 4 (sugeridas) y Fase 5 (propias). */
export default function RecetaDetalle() {
  const { id } = useParams();

  return (
    <article className="flex flex-col gap-6">
      <Link to="/buscar" className="btn-ghost w-fit !px-3">
        <i className="fa-solid fa-arrow-left" aria-hidden="true" />
        Volver
      </Link>

      <div className="glass-card">
        <span
          className="mb-4 flex h-48 items-center justify-center rounded-xl bg-primary/10 text-6xl text-primary"
          aria-hidden="true"
        >
          <i className="fa-solid fa-utensils" />
        </span>
        <h1>Receta #{id}</h1>
        <p className="mt-2 text-muted-foreground">
          La vista detallada (ingredientes con faltantes resaltados, pasos, tiempo, dificultad y
          porciones) se conecta en las Fases 4 y 5.
        </p>

        <div className="mt-4 flex flex-wrap gap-2" role="list" aria-label="Acciones de la receta">
          <span className="chip" role="listitem">
            <i className="fa-solid fa-clock" aria-hidden="true" /> Tiempo —
          </span>
          <span className="chip" role="listitem">
            <i className="fa-solid fa-signal" aria-hidden="true" /> Dificultad —
          </span>
          <span className="chip" role="listitem">
            <i className="fa-solid fa-layer-group" aria-hidden="true" /> Porciones —
          </span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="btn-secondary" disabled title="Disponible en Fase 5">
            <i className="fa-solid fa-heart" aria-hidden="true" /> Favorito
          </button>
          <button type="button" className="btn-secondary" disabled title="Disponible en Fase 5">
            <i className="fa-solid fa-share-nodes" aria-hidden="true" /> Compartir
          </button>
        </div>
      </div>
    </article>
  );
}
