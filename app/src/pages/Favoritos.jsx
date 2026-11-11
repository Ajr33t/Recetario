import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import { api, ApiError } from '../services/api.js';
import { useAuthStore } from '../store/authStore.js';

const DIFICULTADES = { facil: 'Fácil', media: 'Media', dificil: 'Difícil' };

/**
 * Favoritos (RF-09 — Fase 5): lista las recetas marcadas con el corazón
 * (propias y guardadas de TheMealDB), permite quitarlas y navegar al detalle.
 */
export default function Favoritos() {
  const usuario = useAuthStore((s) => s.usuario);
  const [favoritos, setFavoritos] = useState(null); // null = cargando
  const [error, setError] = useState('');

  useEffect(() => {
    if (!usuario) {
      setFavoritos([]);
      return undefined;
    }
    let vivo = true;
    api
      .get('/favorites')
      .then((datos) => vivo && setFavoritos(datos.favoritos))
      .catch((err) => {
        if (!vivo) return;
        setError(err instanceof ApiError ? err.message : 'No se pudieron cargar los favoritos');
        setFavoritos([]);
      });
    return () => {
      vivo = false;
    };
  }, [usuario]);

  async function quitar(receta) {
    try {
      // Las externas ya fueron importadas como receta propia: se alterna por id
      await api.post(`/favorites/${receta.id}`);
      setFavoritos((prev) => prev.filter((f) => f.id !== receta.id));
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'info',
        title: 'Quitada de favoritos',
        showConfirmButton: false,
        timer: 1400,
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo quitar la receta.');
    }
  }

  if (!usuario) {
    return (
      <div className="flex flex-col gap-6">
        <header>
          <h1>Favoritos</h1>
          <p className="mt-1 text-muted-foreground">Tus recetas guardadas, siempre a mano.</p>
        </header>
        <div className="glass-card flex flex-col items-center gap-3 py-10 text-center">
          <i className="fa-solid fa-lock text-4xl text-primary" aria-hidden="true" />
          <p className="font-medium">Inicia sesión para ver tus favoritos</p>
          <p className="max-w-md text-sm text-muted-foreground">
            Marca el corazón de cualquier receta y la encontrarás aquí desde cualquier dispositivo.
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
      <header>
        <h1>Favoritos</h1>
        <p className="mt-1 text-muted-foreground">Tus recetas guardadas, siempre a mano.</p>
      </header>

      {error && (
        <p role="alert" className="glass-card text-sm font-medium text-danger">
          <i className="fa-solid fa-circle-exclamation" aria-hidden="true" /> {error}
        </p>
      )}

      {favoritos === null && (
        <p className="text-sm text-muted-foreground" role="status">
          <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" /> Cargando favoritos…
        </p>
      )}

      {favoritos?.length === 0 && !error && (
        <div className="glass-card flex flex-col items-center gap-2 py-10 text-center">
          <i className="fa-solid fa-heart text-4xl text-primary" aria-hidden="true" />
          <p className="font-medium">Aún no tienes favoritos</p>
          <p className="max-w-md text-sm text-muted-foreground">
            Marca el corazón ❤️ de cualquier receta (propias o sugeridas) para guardarla aquí.
          </p>
          <Link to="/buscar" className="btn-primary mt-1">
            <i className="fa-solid fa-magnifying-glass" aria-hidden="true" /> Buscar recetas
          </Link>
        </div>
      )}

      {favoritos?.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" role="list">
          {favoritos.map((receta) => (
            <li key={receta.id} className="glass-card flex flex-col">
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
                <i className="fa-solid fa-heart text-danger" aria-hidden="true" /> desde{' '}
                {new Date(String(receta.favorito_desde).replace(' ', 'T') + 'Z').toLocaleDateString(
                  'es-ES',
                )}
                {receta.origen === 'sugerida' && (
                  <>
                    {' '}
                    · <i className="fa-solid fa-database" aria-hidden="true" /> TheMealDB
                  </>
                )}
              </p>
              <div className="mt-3 flex flex-wrap gap-2 border-t border-border/50 pt-3">
                <Link to={`/receta/${receta.id}`} className="btn-ghost !px-3 !text-xs">
                  <i className="fa-solid fa-eye" aria-hidden="true" /> Ver
                </Link>
                <button
                  type="button"
                  className="btn-ghost !px-3 !text-xs text-danger"
                  onClick={() => quitar(receta)}
                >
                  <i className="fa-solid fa-heart-crack" aria-hidden="true" /> Quitar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
