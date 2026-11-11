import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api, ApiError } from '../services/api.js';
import { useAuthStore } from '../store/authStore.js';

const DIFICULTADES = { facil: 'Fácil', media: 'Media', dificil: 'Difícil' };

/**
 * Libro de cocina (idea del cliente — Fase 5): recopila las recetas
 * seleccionadas (o todas las propias) en un documento con portada y una
 * receta por página, listo para imprimir o "Guardar como PDF" con
 * `window.print()` (sin dependencias: el PDF lo genera el navegador).
 */
export default function LibroCocina() {
  const usuario = useAuthStore((s) => s.usuario);
  const location = useLocation();
  const ids = location.state?.ids || null; // selección desde MisRecetas

  const [recetas, setRecetas] = useState(null); // null = cargando
  const [error, setError] = useState('');

  useEffect(() => {
    if (!usuario) {
      setRecetas([]);
      return undefined;
    }
    let vivo = true;
    (async () => {
      try {
        let listaIds = ids;
        if (!Array.isArray(listaIds) || listaIds.length === 0) {
          const datos = await api.get('/recipes');
          listaIds = datos.recetas.map((r) => r.id);
        }
        const detalles = await Promise.all(
          listaIds.map((rid) =>
            api
              .get(`/recipes/${rid}`)
              .then((d) => d.receta)
              .catch(() => null),
          ),
        );
        if (vivo) setRecetas(detalles.filter(Boolean));
      } catch (err) {
        if (!vivo) return;
        setError(err instanceof ApiError ? err.message : 'No se pudo generar el libro.');
        setRecetas([]);
      }
    })();
    return () => {
      vivo = false;
    };
  }, [usuario, ids]);

  if (!usuario) {
    return (
      <div className="glass-card flex flex-col items-center gap-3 py-10 text-center">
        <i className="fa-solid fa-lock text-4xl text-primary" aria-hidden="true" />
        <p className="font-medium">Inicia sesión para generar tu libro</p>
        <Link to="/login" className="btn-primary mt-1">
          <i className="fa-solid fa-right-to-bracket" aria-hidden="true" /> Iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Barra de herramientas: no se imprime (clase no-print) */}
      <header className="no-print flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1>Libro de cocina</h1>
          <p className="mt-1 text-muted-foreground">
            {recetas === null
              ? 'Preparando tu recetario…'
              : `${recetas.length} receta(s) — imprímelo o guárdalo como PDF desde el diálogo de impresión.`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/mis-recetas" className="btn-ghost !px-3">
            <i className="fa-solid fa-arrow-left" aria-hidden="true" /> Mis recetas
          </Link>
          <button
            type="button"
            className="btn-primary !px-3"
            onClick={() => window.print()}
            disabled={!recetas || recetas.length === 0}
          >
            <i className="fa-solid fa-print" aria-hidden="true" /> Imprimir / Guardar como PDF
          </button>
        </div>
      </header>

      {error && (
        <p role="alert" className="glass-card no-print text-sm font-medium text-danger">
          <i className="fa-solid fa-circle-exclamation" aria-hidden="true" /> {error}
        </p>
      )}

      {recetas === null && (
        <p className="text-sm text-muted-foreground" role="status">
          <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" /> Cargando recetas…
        </p>
      )}

      {recetas?.length === 0 && !error && (
        <div className="glass-card no-print flex flex-col items-center gap-2 py-10 text-center">
          <i className="fa-solid fa-book-open text-4xl text-primary" aria-hidden="true" />
          <p className="font-medium">No hay recetas para incluir</p>
          <p className="max-w-md text-sm text-muted-foreground">
            Crea o selecciona recetas en «Mis recetas» para formar tu libro de cocina.
          </p>
          <Link to="/recetas/nueva" className="btn-primary mt-1">
            <i className="fa-solid fa-plus" aria-hidden="true" /> Crear receta
          </Link>
        </div>
      )}

      {/* Documento imprimible */}
      {recetas && recetas.length > 0 && (
        <article className="libro" aria-label="Libro de cocina">
          {/* Portada */}
          <section className="libro-portada">
            <i className="fa-solid fa-book-bookmark" aria-hidden="true" />
            <p className="libro-sello">SazónLab</p>
            <h2 className="libro-titulo">Mi libro de cocina</h2>
            <p className="libro-subtitulo">
              {recetas.length} receta(s) seleccionadas ·{' '}
              {new Date().toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
            <ul className="libro-indice" role="list">
              {recetas.map((r, i) => (
                <li key={r.id}>
                  {i + 1}. {r.titulo}
                </li>
              ))}
            </ul>
          </section>

          {/* Una receta por página */}
          {recetas.map((receta, indice) => (
            <section key={receta.id} className="libro-pagina" aria-label={receta.titulo}>
              <header className="libro-cabecera">
                <span className="libro-numero">{indice + 1}</span>
                <h2>{receta.titulo}</h2>
              </header>

              {receta.imagen_url && <img className="libro-imagen" src={receta.imagen_url} alt="" />}

              {receta.descripcion && <p className="libro-desc">{receta.descripcion}</p>}

              <p className="libro-meta">
                {receta.tiempo_min && (
                  <>
                    <i className="fa-solid fa-clock" aria-hidden="true" /> {receta.tiempo_min} min
                    ·{' '}
                  </>
                )}
                {receta.dificultad && (
                  <>
                    <i className="fa-solid fa-signal" aria-hidden="true" />{' '}
                    {DIFICULTADES[receta.dificultad] || receta.dificultad} ·{' '}
                  </>
                )}
                {receta.porciones && (
                  <>
                    <i className="fa-solid fa-users" aria-hidden="true" /> {receta.porciones}{' '}
                    porciones
                  </>
                )}
                {!receta.tiempo_min && !receta.dificultad && !receta.porciones && (
                  <span className="italic">Sin datos de preparación</span>
                )}
              </p>

              <div className="libro-cols">
                <div>
                  <h3>Ingredientes</h3>
                  <ul role="list">
                    {receta.ingredientes.map((ing) => (
                      <li key={ing.nombre}>
                        {ing.nombre}
                        {ing.cantidad || ing.unidad
                          ? ` — ${[ing.cantidad, ing.unidad].filter(Boolean).join(' ')}`
                          : ''}
                      </li>
                    ))}
                    {receta.ingredientes.length === 0 && (
                      <li className="italic">Sin ingredientes registrados</li>
                    )}
                  </ul>
                </div>
                <div>
                  <h3>Preparación</h3>
                  <ol>
                    {receta.pasos.map((paso) => (
                      <li key={paso.orden}>{paso.descripcion}</li>
                    ))}
                    {receta.pasos.length === 0 && <li className="italic">Sin pasos registrados</li>}
                  </ol>
                </div>
              </div>

              <footer className="libro-pie">
                SazónLab — Recetario Inteligente · receta {indice + 1} de {recetas.length}
              </footer>
            </section>
          ))}
        </article>
      )}
    </div>
  );
}
