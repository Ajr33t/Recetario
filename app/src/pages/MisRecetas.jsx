import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../services/api.js';
import { useAuthStore } from '../store/authStore.js';

const DIFICULTADES = { facil: 'Fácil', media: 'Media', dificil: 'Difícil' };

/**
 * Mis recetas (RF-06): lista las recetas del usuario desde el servidor
 * (Fase 3). Al estar en la cuenta, aparecen en cualquier dispositivo.
 * El editor completo (crear/editar/papelera) llega en la Fase 5.
 */
export default function MisRecetas() {
  const usuario = useAuthStore((s) => s.usuario);
  const [recetas, setRecetas] = useState(null); // null = cargando
  const [error, setError] = useState('');

  useEffect(() => {
    if (!usuario) {
      setRecetas([]);
      return;
    }
    let vivo = true;
    api
      .get('/recipes')
      .then((datos) => vivo && setRecetas(datos.recetas))
      .catch((err) => {
        if (!vivo) return;
        setError(err instanceof ApiError ? err.message : 'No se pudieron cargar las recetas');
        setRecetas([]);
      });
    return () => {
      vivo = false;
    };
  }, [usuario]);

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
        <span className="btn-secondary pointer-events-none !px-3 opacity-70" aria-disabled="true">
          <i className="fa-solid fa-plus" aria-hidden="true" />
          Nueva receta
          <span className="chip ml-1">Fase 5</span>
        </span>
      </header>

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
            Crea tu primera receta con ingredientes, pasos, fotos y etiquetas. El CRUD completo
            (editar, duplicar, papelera y versiones) está disponible desde la Fase 5.
          </p>
        </div>
      )}

      {recetas?.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" role="list">
          {recetas.map((receta) => (
            <li key={receta.id} className="glass-card">
              <span
                className="mb-3 flex h-20 items-center justify-center rounded-xl bg-primary/10 text-2xl text-primary"
                aria-hidden="true"
              >
                <i className={`fa-solid ${receta.imagen_url ? 'fa-image' : 'fa-utensils'}`} />
              </span>
              <h3 className="text-base">{receta.titulo}</h3>
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
                {receta.visibilidad === 'publica' ? 'Pública' : 'Privada'} ·{' '}
                <i className="fa-solid fa-cloud-arrow-up" aria-hidden="true" /> guardada en tu
                cuenta
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
