import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, ApiError } from '../services/api.js';
import { ALERGENOS, iconoAlergeno, etiquetaAlergeno } from '../data/alergenos.js';
import { descargarCartaComoImagen, imprimirCarta, organizarPlatos } from '../services/exportarCarta.js';

/**
 * Carta digital pública (puntos 3, 4 y 7 del encargo): la abre el comensal
 * al escanear el QR. Permite ver precios (según la versión elegida por el
 * chef), ocultar platos por alérgeno y exportar PDF/imagen con leyenda.
 * No requiere sesión.
 */
export default function CartaPublica() {
  const { userId } = useParams();
  const [carta, setCarta] = useState(null); // null = cargando
  const [error, setError] = useState('');
  const [excluidos, setExcluidos] = useState([]);
  const [conPrecio, setConPrecio] = useState(true);

  useEffect(() => {
    if (!userId) return;
    setCarta(null);
    const params = new URLSearchParams();
    if (!conPrecio) params.set('con_precio', '0');
    if (excluidos.length) params.set('excluir_alergenos', excluidos.join(','));
    const qs = params.toString();

    api
      .get(`/carta/publica/${userId}${qs ? `?${qs}` : ''}`)
      .then(setCarta)
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : 'No se pudo cargar la carta');
        setCarta({ restaurante: '', platos: [], preferencias: {} });
      });
  }, [userId, excluidos, conPrecio]);

  function alternarAlergeno(clave) {
    setExcluidos((prev) =>
      prev.includes(clave) ? prev.filter((a) => a !== clave) : [...prev, clave],
    );
  }

  const preferencias = carta?.preferencias || {};
  const platos = organizarPlatos(carta?.platos || [], preferencias.organizacion);
  const presentes = [...new Set(platos.flatMap((p) => p.alergenos || []))];

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1>{carta?.restaurante || 'Carta digital'}</h1>
          <p className="mt-1 text-muted-foreground">Carta digital · SazónLab</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-secondary !px-3"
            onClick={() =>
              imprimirCarta({
                restaurante: carta?.restaurante,
                platos,
                preferencias: { ...preferencias, tamano: 'A4' },
              })
            }
          >
            <i className="fa-solid fa-print" aria-hidden="true" /> Imprimir / PDF
          </button>
          <button
            type="button"
            className="btn-secondary !px-3"
            onClick={() =>
              descargarCartaComoImagen(
                { restaurante: carta?.restaurante, platos, preferencias },
                'carta-digital',
              )
            }
          >
            <i className="fa-solid fa-image" aria-hidden="true" /> Imagen
          </button>
        </div>
      </header>

      <section className="surface-section" aria-labelledby="filtro-comensal-titulo">
        <h2 id="filtro-comensal-titulo" className="text-base">
          <i className="fa-solid fa-shield-halved text-primary" aria-hidden="true" /> Mis alergias
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Marca tus alérgenos: ocultaremos los platos que los contengan.
        </p>
        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Alérgenos a evitar">
          {ALERGENOS.map(({ clave, etiqueta, icono }) => {
            const marcado = excluidos.includes(clave);
            return (
              <label
                key={clave}
                className={`chip cursor-pointer !px-2 !py-1 !text-[11px] ${marcado ? '!border-primary !bg-primary/15 !text-primary' : ''}`}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={marcado}
                  onChange={() => alternarAlergeno(clave)}
                />
                <span aria-hidden="true">{icono}</span> {etiqueta}
              </label>
            );
          })}
        </div>
        {excluidos.length > 0 && (
          <button type="button" className="btn-ghost mt-3 !px-3 !text-xs" onClick={() => setExcluidos([])}>
            <i className="fa-solid fa-xmark" aria-hidden="true" /> Quitar filtro
          </button>
        )}

        {preferencias.version !== 'sin_precio' && (
          <label className="mt-4 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={conPrecio}
              onChange={(e) => setConPrecio(e.target.checked)}
            />
            Mostrar precios
          </label>
        )}
      </section>

      {error && (
        <p role="alert" className="glass-card text-sm font-medium text-danger">
          <i className="fa-solid fa-circle-exclamation" aria-hidden="true" /> {error}
        </p>
      )}

      {carta === null && (
        <p className="text-sm text-muted-foreground" role="status">
          <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" /> Cargando la carta…
        </p>
      )}

      {carta?.platos?.length === 0 && !error && (
        <div className="glass-card flex flex-col items-center gap-2 py-10 text-center">
          <i className="fa-solid fa-plate-wheat text-4xl text-primary" aria-hidden="true" />
          <p className="font-medium">
            {excluidos.length ? 'No hay platos que cumplan tu filtro' : 'Esta carta aún no tiene platos'}
          </p>
          <p className="max-w-md text-sm text-muted-foreground">
            {excluidos.length
              ? 'Prueba a desmarcar algún alérgeno para ver más opciones.'
              : 'Vuelve pronto: el chef está preparando la carta.'}
          </p>
        </div>
      )}

      {platos.length > 0 && (
        <div
          className="glass-panel flex flex-col gap-6 p-6"
          style={{
            background: preferencias.color_fondo || undefined,
            color: preferencias.color_texto || undefined,
            fontFamily: preferencias.tipografia || undefined,
          }}
        >
          <h2 className="sr-only">Platos de la carta</h2>
          {platos.map((plato, i) => {
            const cambiaCategoria =
              grupoTipo(preferencias.organizacion) &&
              plato.categoria &&
              plato.categoria !== platos[i - 1]?.categoria;
            return (
              <section key={plato.id} aria-label={plato.titulo}>
                {cambiaCategoria && (
                  <h3 className="mb-2 text-lg font-semibold" style={{ color: preferencias.color_principal }}>
                    {plato.categoria}
                  </h3>
                )}
                <article className="flex flex-col gap-1 border-b border-border/40 pb-4 last:border-0">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <h3 className="text-base font-semibold">{plato.titulo}</h3>
                    {plato.precio != null && (
                      <span className="font-semibold" style={{ color: preferencias.color_principal }}>
                        {Number(plato.precio).toFixed(2)}
                      </span>
                    )}
                  </div>
                  {plato.descripcion && (
                    <p className="text-sm opacity-80">{plato.descripcion}</p>
                  )}
                  {preferencias.mostrar_composicion && plato.composicion && (
                    <p className="text-sm opacity-70">
                      <i className="fa-solid fa-list-check" aria-hidden="true" /> {plato.composicion}
                    </p>
                  )}
                  {plato.alergenos?.length > 0 && (
                    <ul className="flex flex-wrap gap-1.5" role="list" aria-label={`Alérgenos de ${plato.titulo}`}>
                      {plato.alergenos.map((a) => (
                        <li key={a} className="chip !px-2 !py-0.5 !text-[11px]">
                          <span aria-hidden="true">{iconoAlergeno(a)}</span> {etiquetaAlergeno(a)}
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
              </section>
            );
          })}

          {/* Leyenda de alérgenos en la carta (y en los exportes) */}
          {presentes.length > 0 && (
            <section aria-labelledby="leyenda-titulo" className="rounded-xl bg-muted/50 p-4">
              <h3 id="leyenda-titulo" className="text-sm font-semibold">
                Leyenda de alérgenos
              </h3>
              <ul className="mt-2 flex flex-wrap gap-2" role="list">
                {presentes.map((a) => (
                  <li key={a} className="chip !px-2 !py-0.5 !text-[11px]">
                    <span aria-hidden="true">{iconoAlergeno(a)}</span> {etiquetaAlergeno(a)}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      <p className="text-center text-sm text-muted-foreground">
        <Link to="/" className="text-primary underline">
          Volver a SazónLab
        </Link>
      </p>
    </div>
  );
}

/** True solo cuando la carta se organiza por categorías. */
function grupoTipo(organizacion) {
  return organizacion === 'categorias' || !organizacion;
}
