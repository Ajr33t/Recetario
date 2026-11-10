import { Link } from 'react-router-dom';

const DESTACADAS = [
  { id: 'd1', titulo: 'Pasta al ajillo', tiempo: 25, dificultad: 'Fácil', icon: 'fa-fire' },
  { id: 'd2', titulo: 'Ensalada César', tiempo: 15, dificultad: 'Fácil', icon: 'fa-leaf' },
  {
    id: 'd3',
    titulo: 'Postre de chocolate',
    tiempo: 40,
    dificultad: 'Media',
    icon: 'fa-cake-candles',
  },
];

/** Página de inicio: destacadas y recientes (contenido real desde Fase 4/5). */
export default function Home() {
  return (
    <div className="flex flex-col gap-6">
      <section className="glass-card" aria-labelledby="bienvenida-titulo">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">
          Bienvenido a SazónLab
        </p>
        <h1 id="bienvenida-titulo" className="mt-1">
          ¿Qué vas a cocinar hoy?
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Ingresa los ingredientes que tienes en casa y descubre recetas que puedes preparar.
          También puedes crear tu propio recetario y guardarlo en favoritos.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link to="/buscar" className="btn-primary">
            <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
            Buscar por ingredientes
          </Link>
          <Link to="/mis-recetas" className="btn-secondary">
            <i className="fa-solid fa-plus" aria-hidden="true" />
            Crear receta
          </Link>
        </div>
      </section>

      <section aria-labelledby="destacadas-titulo">
        <div className="mb-3 flex items-center gap-2">
          <i className="fa-solid fa-star text-primary" aria-hidden="true" />
          <h2 id="destacadas-titulo">Recetas destacadas</h2>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" role="list">
          {DESTACADAS.map((receta) => (
            <li key={receta.id}>
              <Link
                to={`/receta/${receta.id}`}
                className="glass-card-hover block"
                aria-label={`Ver detalle de ${receta.titulo}`}
              >
                <span
                  className="mb-3 flex h-28 items-center justify-center rounded-xl bg-primary/10 text-3xl text-primary"
                  aria-hidden="true"
                >
                  <i className={`fa-solid ${receta.icon}`} />
                </span>
                <h3>{receta.titulo}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  <i className="fa-solid fa-clock" aria-hidden="true" /> {receta.tiempo} min ·{' '}
                  <i className="fa-solid fa-signal" aria-hidden="true" /> {receta.dificultad}
                </p>
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-muted-foreground">
          * Contenido de demostración: la sugerencia real (API/IA) se habilita en la Fase 4.
        </p>
      </section>
    </div>
  );
}
