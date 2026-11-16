import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api, ApiError } from '../services/api.js';
import { useAuthStore } from '../store/authStore.js';
import { VOLUMEN, PESO, TEMPERATURA_EQUIVALENCIAS, filasEquivalencias } from '../data/medidas.js';

const DIFICULTADES = { facil: 'Fácil', media: 'Media', dificil: 'Difícil' };

// Geometría de impresión: A4 (297mm) con @page de 16mm arriba/abajo.
// Se usa para estimar cuántas páginas ocupa cada receta y numerar el índice.
const ALTO_PAGINA_PX = (297 - 16 - 16) * (96 / 25.4);
const PRIMERA_RECETA = 4; // 1 portada · 2 índice · 3 medidas

/** Alto imprimible de una sección (sin padding ni bordes de pantalla). */
function altoImprimible(seccion) {
  const cs = getComputedStyle(seccion);
  return (
    seccion.getBoundingClientRect().height -
    parseFloat(cs.paddingTop) -
    parseFloat(cs.paddingBottom) -
    parseFloat(cs.borderTopWidth) -
    parseFloat(cs.borderBottomWidth)
  );
}

/**
 * Libro de cocina (idea del cliente — Fase 5): recopila las recetas
 * seleccionadas (o todas las propias) en un documento con portada,
 * índice con número de página, página fija de medidas y equivalencias,
 * y una receta por página, listo para imprimir o "Guardar como PDF"
 * con `window.print()` (sin dependencias: el PDF lo genera el navegador).
 */
export default function LibroCocina() {
  const usuario = useAuthStore((s) => s.usuario);
  const location = useLocation();
  const ids = location.state?.ids || null; // selección desde MisRecetas

  const [recetas, setRecetas] = useState(null); // null = cargando
  const [error, setError] = useState('');
  const [paginas, setPaginas] = useState(null); // nº de página por receta

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

  // Numeración del índice: mide cada sección contra la altura imprimible
  // de A4 (las imágenes ya cargadas) para saber cuántas páginas ocupa.
  useEffect(() => {
    if (!recetas || recetas.length === 0) return undefined;
    let vivo = true;
    (async () => {
      try {
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        const imagenes = [...document.querySelectorAll('.libro-receta img')];
        await Promise.all(
          imagenes.map((img) =>
            img.complete
              ? Promise.resolve()
              : (img.decode?.() || Promise.resolve()).catch(() => {}),
          ),
        );
        if (!vivo) return;
        const indice = document.querySelector('.libro-indice-pagina');
        const paginasIndice = indice
          ? Math.max(1, Math.ceil(altoImprimible(indice) / ALTO_PAGINA_PX - 0.02))
          : 1;
        let pagina = 3 + paginasIndice; // portada + índice + medidas
        const numeracion = [];
        document.querySelectorAll('.libro-receta').forEach((seccion) => {
          const ocupadas = Math.max(1, Math.ceil(altoImprimible(seccion) / ALTO_PAGINA_PX - 0.02));
          numeracion.push(pagina);
          pagina += ocupadas;
        });
        if (vivo) setPaginas(numeracion);
      } catch {
        /* sin medición: el índice conserva la numeración provisional */
      }
    })();
    return () => {
      vivo = false;
    };
  }, [recetas]);

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
              : `${recetas.length} receta(s) — portada, índice con páginas, medidas y una receta por página.`}
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
            title="Se abrirá el diálogo de impresión: elige «Guardar como PDF»"
          >
            <i className="fa-solid fa-file-pdf" aria-hidden="true" /> Descargar libro en PDF
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
          {/* Página 1: portada */}
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
          </section>

          {/* Página 2: índice con nombre y número de página */}
          <section className="libro-pagina libro-indice-pagina" aria-label="Índice">
            <h2 className="libro-seccion-titulo">Índice</h2>
            <ol className="libro-indice-lista" role="list">
              {recetas.map((receta, i) => (
                <li key={receta.id} className="libro-indice-fila">
                  <span className="libro-indice-num">{i + 1}</span>
                  <span className="libro-indice-nombre">{receta.titulo}</span>
                  <span className="libro-indice-puntos" aria-hidden="true" />
                  <span className="libro-indice-pag">{paginas?.[i] ?? PRIMERA_RECETA + i}</span>
                </li>
              ))}
            </ol>
            <footer className="libro-pie">
              SazónLab — Recetario Inteligente · índice de {recetas.length} receta(s)
            </footer>
          </section>

          {/* Página 3: medidas y equivalencias (página fija) */}
          <section className="libro-pagina" aria-label="Medidas y equivalencias">
            <h2 className="libro-seccion-titulo">Medidas y equivalencias</h2>
            <p className="libro-desc">
              Valores fijos de referencia — español ↔ english. Convierte antes de empezar: 1 taza =
              236,59 ml · 1 cucharada = 14,79 ml · 1 onza = 28,35 g · 1 libra = 453,59 g.
            </p>
            <div className="libro-medidas-cols">
              <div>
                <h3 className="libro-medidas-titulo">Volumen</h3>
                <table className="libro-tabla">
                  <thead>
                    <tr>
                      <th scope="col">Español</th>
                      <th scope="col">English</th>
                      <th scope="col">ml</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filasEquivalencias(VOLUMEN).map((f) => (
                      <tr key={f.es}>
                        <td>{f.es}</td>
                        <td>{f.en}</td>
                        <td className="libro-valor">{f.valor}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div>
                <h3 className="libro-medidas-titulo">Peso</h3>
                <table className="libro-tabla">
                  <thead>
                    <tr>
                      <th scope="col">Español</th>
                      <th scope="col">English</th>
                      <th scope="col">g</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filasEquivalencias(PESO).map((f) => (
                      <tr key={f.es}>
                        <td>{f.es}</td>
                        <td>{f.en}</td>
                        <td className="libro-valor">{f.valor}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <h3 className="libro-medidas-titulo libro-medidas-titulo-temp">Temperatura</h3>
            <table className="libro-tabla">
              <thead>
                <tr>
                  <th scope="col">Español</th>
                  <th scope="col">English</th>
                  <th scope="col">Referencia</th>
                </tr>
              </thead>
              <tbody>
                {TEMPERATURA_EQUIVALENCIAS.map((t) => (
                  <tr key={t.es}>
                    <td>{t.es}</td>
                    <td>{t.en}</td>
                    <td>{t.nota}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <footer className="libro-pie">
              SazónLab — Recetario Inteligente · tabla de medidas de referencia
            </footer>
          </section>

          {/* Una receta por página */}
          {recetas.map((receta, indice) => (
            <section
              key={receta.id}
              className="libro-pagina libro-receta"
              aria-label={receta.titulo}
            >
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
