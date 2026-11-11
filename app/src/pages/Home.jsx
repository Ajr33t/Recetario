import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';
import { api } from '../services/api.js';

/** Respaldo estático si la API de recetas destacadas no responde. */
const DESTACADAS_RESPALDO = [
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

const PASOS = [
  {
    icon: 'fa-carrot',
    titulo: '1. Registra tus ingredientes',
    texto: 'Dile a SazónLab lo que tienes en la nevera: frutas, verduras, carbohidratos, especias.',
  },
  {
    icon: 'fa-wand-magic-sparkles',
    titulo: '2. Descubre qué cocinar',
    texto:
      'Recibes recetas que puedes preparar ahora mismo, con tiempos, dificultad y pasos claros.',
  },
  {
    icon: 'fa-book-bookmark',
    titulo: '3. Guarda tu recetario',
    texto: 'Crea tus recetas propias, márcalas como favoritas y vélas desde cualquier dispositivo.',
  },
];

const VENTAJAS = [
  {
    icon: 'fa-cloud-arrow-up',
    titulo: 'En la nube',
    texto: 'Tus recetas se guardan en tu cuenta, no en el navegador.',
  },
  {
    icon: 'fa-mobile-screen',
    titulo: 'Cualquier dispositivo',
    texto: 'Entra desde el celular o la PC y está todo igual.',
  },
  {
    icon: 'fa-shield-halved',
    titulo: 'Seguro',
    texto: 'Contraseña cifrada con bcrypt y sesión con JWT.',
  },
];

/**
 * Página de inicio (Fase 3): bienvenida + cómo funciona + destacadas.
 * El contenido cambia según haya sesión (invitado ve la invitación a registrarse).
 */
export default function Home() {
  const usuario = useAuthStore((s) => s.usuario);
  const [destacadas, setDestacadas] = useState(DESTACADAS_RESPALDO);

  // Recetas destacadas reales de TheMealDB (Fase 4); respaldo si falla
  useEffect(() => {
    let vivo = true;
    api
      .get('/search/destacadas?n=3')
      .then((datos) => vivo && datos.recetas?.length > 0 && setDestacadas(datos.recetas))
      .catch(() => {
        /* sin conexión se mantienen las de respaldo */
      });
    return () => {
      vivo = false;
    };
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <section className="glass-card" aria-labelledby="bienvenida-titulo">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">
          {usuario ? `Hola de nuevo, ${usuario.nombre}` : 'Bienvenido a SazónLab'}
        </p>
        <h1 id="bienvenida-titulo" className="mt-1">
          {usuario ? '¿Qué vas a cocinar hoy?' : 'Tu recetario inteligente, en la nube'}
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          {usuario
            ? 'Ingresa los ingredientes que tienes en casa y descubre recetas que puedes preparar. También puedes crear tu propio recetario y guardarlo en favoritos.'
            : 'Ingresa los ingredientes que tienes en casa y descubre recetas al instante. Crea una cuenta gratis y tu recetario te sigue a cualquier dispositivo.'}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link to="/buscar" className="btn-primary">
            <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
            Buscar por ingredientes
          </Link>
          {usuario ? (
            <Link to="/recetas/nueva" className="btn-secondary">
              <i className="fa-solid fa-plus" aria-hidden="true" />
              Crear receta
            </Link>
          ) : (
            <Link to="/login" className="btn-secondary">
              <i className="fa-solid fa-user-plus" aria-hidden="true" />
              Crear cuenta gratis
            </Link>
          )}
        </div>
      </section>

      {/* Cómo funciona */}
      <section aria-labelledby="como-funciona-titulo">
        <div className="mb-3 flex items-center gap-2">
          <i className="fa-solid fa-list-check text-primary" aria-hidden="true" />
          <h2 id="como-funciona-titulo">¿Cómo funciona?</h2>
        </div>
        <ul className="grid gap-4 sm:grid-cols-3" role="list">
          {PASOS.map((paso) => (
            <li key={paso.titulo} className="glass-card">
              <span
                className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-xl text-primary"
                aria-hidden="true"
              >
                <i className={`fa-solid ${paso.icon}`} />
              </span>
              <h3 className="text-base">{paso.titulo}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{paso.texto}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Invitación a cuenta (solo invitados) */}
      {!usuario && (
        <section className="glass-card" aria-labelledby="cuenta-titulo">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 id="cuenta-titulo" className="flex items-center gap-2">
                <i className="fa-solid fa-user-plus text-primary" aria-hidden="true" /> Crea tu
                cuenta gratis
              </h2>
              <ul className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
                {VENTAJAS.map((v) => (
                  <li key={v.titulo}>
                    <i className={`fa-solid ${v.icon} text-primary`} aria-hidden="true" />{' '}
                    <strong className="text-foreground">{v.titulo}:</strong> {v.texto}
                  </li>
                ))}
              </ul>
            </div>
            <Link to="/login" className="btn-primary">
              <i className="fa-solid fa-right-to-bracket" aria-hidden="true" />
              Empezar
            </Link>
          </div>
        </section>
      )}

      <section aria-labelledby="destacadas-titulo">
        <div className="mb-3 flex items-center gap-2">
          <i className="fa-solid fa-star text-primary" aria-hidden="true" />
          <h2 id="destacadas-titulo">Recetas destacadas</h2>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" role="list">
          {destacadas.map((receta) => (
            <li key={receta.id}>
              <Link
                to={`/receta/${receta.id}`}
                className="glass-card-hover block"
                aria-label={`Ver detalle de ${receta.titulo}`}
              >
                {receta.imagen ? (
                  <img
                    src={receta.imagen}
                    alt=""
                    loading="lazy"
                    className="mb-3 h-28 w-full rounded-xl object-cover"
                  />
                ) : (
                  <span
                    className="mb-3 flex h-28 items-center justify-center rounded-xl bg-primary/10 text-3xl text-primary"
                    aria-hidden="true"
                  >
                    <i className={`fa-solid ${receta.icon || 'fa-utensils'}`} />
                  </span>
                )}
                <h3 className="line-clamp-2">{receta.titulo}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {receta.tiempo ? (
                    <>
                      <i className="fa-solid fa-clock" aria-hidden="true" /> {receta.tiempo} min ·{' '}
                      <i className="fa-solid fa-signal" aria-hidden="true" /> {receta.dificultad}
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-database" aria-hidden="true" /> TheMealDB
                      {receta.categoria ? ` · ${receta.categoria}` : ''}
                    </>
                  )}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
