import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, ApiError } from '../services/api.js';
import {
  obtenerHistorial,
  guardarBusqueda,
  vaciarHistorial,
} from '../services/historialBusquedas.js';
import CampoAutocomplete from '../components/search/CampoAutocomplete.jsx';

const MODOS = [
  { id: 'ingredientes', label: 'Por ingredientes', icon: 'fa-carrot' },
  { id: 'nombre', label: 'Por nombre', icon: 'fa-font' },
  { id: 'categorias', label: 'Explorar', icon: 'fa-layer-group' },
];

/**
 * Búsqueda de recetas (RF-03/RF-04/RF-10) — Fase 4 conectada a TheMealDB:
 * - Por ingredientes: chips + recetas ordenadas por coincidencias + idea del chef (IA si hay clave).
 * - Por nombre: búsqueda de texto.
 * - Explorar: categorías y áreas de TheMealDB.
 */
export default function Buscar() {
  const navigate = useNavigate();
  const [modo, setModo] = useState('ingredientes');
  const [ingredientes, setIngredientes] = useState([]);
  const [texto, setTexto] = useState('');
  const [nombre, setNombre] = useState('');
  const [categorias, setCategorias] = useState([]);
  const [areas, setAreas] = useState([]);
  const [categoriaSel, setCategoriaSel] = useState('');
  const [areaSel, setAreaSel] = useState('');
  const [filtrosCargando, setFiltrosCargando] = useState(false);
  const [filtrosError, setFiltrosError] = useState(false);

  // Filtros avanzados (RF-10 — Fase 9): se envían al servidor
  const [excluidos, setExcluidos] = useState([]);
  const [textoExcluido, setTextoExcluido] = useState('');
  const [dieta, setDieta] = useState('');
  const [sinDato, setSinDato] = useState(0);

  // Historial de búsquedas (RF-11 — Fase 9): repetir con un clic
  const [historial, setHistorial] = useState(() => obtenerHistorial());

  const [resultados, setResultados] = useState(null); // null = sin buscar
  const [ideas, setIdeas] = useState([]);
  const [fuenteIA, setFuenteIA] = useState('ninguna');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  // Carga los filtros (categorías/áreas) al entrar en «Explorar»: el
  // servidor devuelve solo áreas con recetas reales y sin duplicados.
  const cargarFiltros = useCallback(async () => {
    setFiltrosCargando(true);
    setFiltrosError(false);
    try {
      const datos = await api.get('/search/filtros');
      setCategorias([...new Set(datos.categorias || [])]);
      setAreas([...new Set(datos.areas || [])]);
    } catch {
      setFiltrosError(true);
    } finally {
      setFiltrosCargando(false);
    }
  }, []);

  useEffect(() => {
    if (modo === 'categorias') cargarFiltros();
  }, [modo, cargarFiltros]);

  function agregarIngrediente(event) {
    event.preventDefault();
    const valor = texto.trim().toLowerCase();
    if (!valor) return;
    if (!ingredientes.includes(valor)) {
      setIngredientes((prev) => [...prev, valor].slice(0, 12));
    }
    setTexto('');
  }

  /** Al elegir un ingrediente del autocompletado: se agrega como chip. */
  function agregarSugerido(nombre) {
    const valor = nombre.trim().toLowerCase();
    if (valor && !ingredientes.includes(valor)) {
      setIngredientes((prev) => [...prev, valor].slice(0, 12));
    }
    setTexto('');
  }

  function quitarIngrediente(ing) {
    setIngredientes((prev) => prev.filter((i) => i !== ing));
  }

  /** Repite una búsqueda del historial con un clic (RF-11). */
  async function repetir(h) {
    setModo(h.tipo);
    setError('');
    if (h.tipo === 'ingredientes') {
      setIngredientes(h.ingredientes);
      await ejecutar(null, { modo: 'ingredientes', ingredientes: h.ingredientes });
    } else if (h.tipo === 'nombre') {
      setNombre(h.nombre);
      await ejecutar(null, { modo: 'nombre', nombre: h.nombre });
    } else {
      setCategoriaSel(h.categoria || '');
      setAreaSel(h.area || '');
      await ejecutar(null, { modo: 'categorias', categoria: h.categoria, area: h.area });
    }
  }

  /** Agrega/quita ingredientes excluidos (RF-10) y re-filtra si ya hay resultados. */
  function agregarExcluido() {
    const valor = textoExcluido.trim().toLowerCase();
    if (!valor || excluidos.includes(valor)) {
      setTextoExcluido('');
      return;
    }
    const nuevos = [...excluidos, valor].slice(0, 8);
    setExcluidos(nuevos);
    setTextoExcluido('');
    if (resultados !== null) ejecutar(null, { excluir: nuevos });
  }

  function quitarExcluido(valor) {
    const nuevos = excluidos.filter((e) => e !== valor);
    setExcluidos(nuevos);
    if (resultados !== null) ejecutar(null, { excluir: nuevos });
  }

  function cambiarDieta(valor) {
    setDieta(valor);
    if (resultados !== null) ejecutar(null, { dieta: valor });
  }

  /**
   * Ejecuta la búsqueda. `extras` permite re-ejecutar con valores que
   * aún no llegaron al estado (historial, filtros avanzados) sin leer
   * valores obsoletos del cierre.
   */
  async function ejecutar(event, extras = {}) {
    event?.preventDefault?.();
    const modoActivo = extras.modo ?? modo;
    const ingActuales = extras.ingredientes ?? ingredientes;
    const nombreActivo = extras.nombre ?? nombre;
    const categoriaActiva = extras.categoria ?? categoriaSel;
    const areaActiva = extras.area ?? areaSel;
    const excluidosActuales = extras.excluir ?? excluidos;
    const dietaActual = extras.dieta ?? dieta;

    setError('');
    setIdeas([]);
    setCargando(true);

    /** Monta los parámetros de los filtros avanzados (RF-10). */
    const conFiltros = (params) => {
      if (excluidosActuales.length) params.set('excluir', excluidosActuales.join(','));
      if (dietaActual) params.set('dieta', dietaActual);
      return params;
    };

    /** Guarda la búsqueda exitosa en el historial (RF-11). */
    const enHistorial = (entrada) => setHistorial(guardarBusqueda(entrada));

    try {
      if (modoActivo === 'ingredientes') {
        if (ingActuales.length === 0) {
          setError('Agrega al menos un ingrediente para buscar.');
          setResultados(null);
          return;
        }
        const datos = await api.get(
          `/search/sugerencias?${conFiltros(new URLSearchParams({ i: ingActuales.join(',') }))}`,
        );
        setResultados(datos.recetas);
        setIdeas(datos.ideas || []);
        setFuenteIA(datos.fuente || 'ninguna');
        setSinDato(datos.sin_dato || 0);
        enHistorial({
          tipo: 'ingredientes',
          etiqueta: ingActuales.join(', '),
          ingredientes: ingActuales,
        });
        // Guarda los ingredientes disponibles: el detalle de receta los usa
        // para marcar en rojo los ingredientes que te faltan (Fase 5)
        try {
          sessionStorage.setItem(
            'sazonlab:ingredientes',
            JSON.stringify(ingActuales.map((i) => i.toLowerCase())),
          );
        } catch {
          /* almacenamiento no disponible: se omite sin romper la búsqueda */
        }
        return;
      }

      if (modoActivo === 'nombre') {
        const q = nombreActivo.trim();
        if (q.length < 2) {
          setError('Escribe al menos 2 caracteres para buscar.');
          setResultados(null);
          return;
        }
        const datos = await api.get(`/search?${conFiltros(new URLSearchParams({ q }))}`);
        setResultados(datos.recetas);
        setSinDato(datos.sin_dato || 0);
        enHistorial({ tipo: 'nombre', etiqueta: q, nombre: q });
        return;
      }

      // categorías
      if (!categoriaActiva && !areaActiva) {
        setError('Elige una categoría o un área para explorar.');
        setResultados(null);
        return;
      }
      const consulta = categoriaActiva
        ? `c=${encodeURIComponent(categoriaActiva)}`
        : `a=${encodeURIComponent(areaActiva)}`;
      const datos = await api.get(
        `/search/categorias?${conFiltros(new URLSearchParams(consulta))}`,
      );
      setResultados(datos.recetas);
      setSinDato(datos.sin_dato || 0);
      enHistorial({
        tipo: 'categorias',
        etiqueta: categoriaActiva || areaActiva,
        categoria: categoriaActiva,
        area: areaActiva,
      });
    } catch (err) {
      setResultados(null);
      setSinDato(0);
      setError(
        err instanceof ApiError
          ? err.message
          : 'No se pudo completar la búsqueda. Reintenta en unos segundos.',
      );
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1>Buscar recetas</h1>
        <p className="mt-1 text-muted-foreground">
          Dile qué tienes en tu cocina y descubre recetas al instante. Escribe en español (pollo,
          tomate, arroz…) — los resultados llegan traducidos.
        </p>
      </header>

      {/* Modos de búsqueda */}
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Modo de búsqueda">
        {MODOS.map((m) => (
          <button
            key={m.id}
            type="button"
            role="tab"
            aria-selected={modo === m.id}
            className={modo === m.id ? 'btn-primary' : 'btn-ghost'}
            onClick={() => {
              setModo(m.id);
              setError('');
            }}
          >
            <i className={`fa-solid ${m.icon}`} aria-hidden="true" /> {m.label}
          </button>
        ))}
      </div>

      <form
        className="surface-section flex flex-col gap-4"
        onSubmit={ejecutar}
        aria-label="Formulario de búsqueda"
      >
        {modo === 'ingredientes' && (
          <div className="flex flex-col gap-2">
            <CampoAutocomplete
              id="ingredientes-input"
              tipo="ingrediente"
              etiqueta="Tus ingredientes"
              placeholder="Ej. pollo, tomate, arroz… (escribe y elige de la lista)"
              valor={texto}
              onValor={setTexto}
              onElegir={agregarSugerido}
            />
            <div>
              <button type="button" className="btn-secondary" onClick={agregarIngrediente}>
                <i className="fa-solid fa-plus" aria-hidden="true" />
                Agregar
              </button>
            </div>

            {ingredientes.length > 0 && (
              <ul
                className="mt-3 flex flex-wrap gap-2"
                role="list"
                aria-label="Ingredientes agregados"
              >
                {ingredientes.map((ing) => (
                  <li key={ing}>
                    <span className="chip">
                      {ing}
                      <button
                        type="button"
                        className="ml-1 rounded-full px-1 hover:text-danger"
                        aria-label={`Quitar ingrediente ${ing}`}
                        onClick={() => quitarIngrediente(ing)}
                      >
                        <i className="fa-solid fa-xmark" aria-hidden="true" />
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {modo === 'nombre' && (
          <CampoAutocomplete
            id="nombre-input"
            tipo="receta"
            etiqueta="Nombre de la receta"
            placeholder="Ej. chicken, pasta, cake… (elige de la lista para abrir el detalle)"
            valor={nombre}
            onValor={setNombre}
            onElegir={(dato) => navigate(`/receta/${dato.id}`)}
          />
        )}

        {modo === 'categorias' && (
          <fieldset className="grid gap-3 sm:grid-cols-2">
            <legend className="mb-1 text-sm font-medium">Explorar por filtro</legend>
            {filtrosCargando && (
              <p className="text-sm text-muted-foreground sm:col-span-2" role="status">
                <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" /> Cargando categorías
                y áreas…
              </p>
            )}
            {filtrosError && (
              <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
                <p role="alert" className="text-sm font-medium text-danger">
                  <i className="fa-solid fa-circle-exclamation" aria-hidden="true" /> No se pudieron
                  cargar los filtros.
                </p>
                <button type="button" className="btn-ghost !px-3" onClick={cargarFiltros}>
                  <i className="fa-solid fa-rotate-right" aria-hidden="true" /> Reintentar
                </button>
              </div>
            )}
            {!filtrosCargando && !filtrosError && (
              <>
                <select
                  className="field"
                  value={categoriaSel}
                  onChange={(e) => {
                    setCategoriaSel(e.target.value);
                    if (e.target.value) setAreaSel('');
                  }}
                  aria-label="Categoría"
                >
                  <option value="">Categoría: cualquiera</option>
                  {categorias.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <select
                  className="field"
                  value={areaSel}
                  onChange={(e) => {
                    setAreaSel(e.target.value);
                    if (e.target.value) setCategoriaSel('');
                  }}
                  aria-label="Área o región"
                >
                  <option value="">Área: cualquier</option>
                  {areas.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </>
            )}
          </fieldset>
        )}

        {/* Filtros avanzados (RF-10): excluidos + dieta */}
        <div
          className="grid gap-3 sm:grid-cols-2"
          role="group"
          aria-labelledby="filtros-avanzados-titulo"
        >
          <p id="filtros-avanzados-titulo" className="text-sm font-medium sm:col-span-2">
            <i className="fa-solid fa-filter text-primary" aria-hidden="true" /> Filtros avanzados
          </p>
          <div>
            <label htmlFor="excluir-input" className="mb-1 block text-sm">
              Ingredientes excluidos
            </label>
            <div className="flex gap-2">
              <input
                id="excluir-input"
                type="text"
                className="field"
                value={textoExcluido}
                onChange={(e) => setTextoExcluido(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    agregarExcluido();
                  }
                }}
                placeholder="Ej. camarón, huevo…"
                autoComplete="off"
              />
              <button type="button" className="btn-secondary !px-3" onClick={agregarExcluido}>
                <i className="fa-solid fa-plus" aria-hidden="true" /> Agregar
              </button>
            </div>
            {excluidos.length > 0 && (
              <ul className="mt-2 flex flex-wrap gap-2" role="list" aria-label="Excluidos">
                {excluidos.map((e) => (
                  <li key={e}>
                    <span className="chip">
                      {e}
                      <button
                        type="button"
                        className="ml-1 rounded-full px-1 hover:text-danger"
                        aria-label={`Quitar excluido ${e}`}
                        onClick={() => quitarExcluido(e)}
                      >
                        <i className="fa-solid fa-xmark" aria-hidden="true" />
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <label htmlFor="dieta-select" className="mb-1 block text-sm">
              Dieta
            </label>
            <select
              id="dieta-select"
              className="field"
              value={dieta}
              onChange={(e) => cambiarDieta(e.target.value)}
            >
              <option value="">Cualquiera</option>
              <option value="vegetariana">Vegetariana</option>
              <option value="vegana">Vegana</option>
            </select>
            <p className="mt-1 text-xs text-muted-foreground">
              Filtra por la categoría/etiquetas que informa TheMealDB.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            className="btn-primary"
            disabled={cargando || (modo === 'categorias' && filtrosCargando)}
          >
            <i
              className={`fa-solid ${cargando ? 'fa-spinner fa-spin' : 'fa-magnifying-glass'}`}
              aria-hidden="true"
            />
            {cargando ? 'Buscando…' : 'Buscar recetas'}
          </button>
          {error && (
            <p role="alert" className="text-sm font-medium text-danger">
              <i className="fa-solid fa-circle-exclamation" aria-hidden="true" /> {error}
            </p>
          )}
        </div>
      </form>

      {/* Historial de búsquedas (RF-11) — repetir con un clic */}
      {historial.length > 0 && (
        <section className="surface-section" aria-labelledby="historial-titulo">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="historial-titulo" className="text-base">
              <i className="fa-solid fa-clock-rotate-left text-primary" aria-hidden="true" />{' '}
              Búsquedas recientes
            </h2>
            <button
              type="button"
              className="btn-ghost !px-3 !text-xs"
              onClick={() => {
                setHistorial(vaciarHistorial());
              }}
            >
              <i className="fa-solid fa-trash" aria-hidden="true" /> Vaciar historial
            </button>
          </div>
          <ul className="mt-3 flex flex-wrap gap-2" role="list">
            {historial.map((h) => (
              <li key={h.clave}>
                <button type="button" className="chip" onClick={() => repetir(h)}>
                  <i className="fa-solid fa-magnifying-glass" aria-hidden="true" /> {h.etiqueta}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Idea del chef (IA cuando hay clave; si no, aviso discreto) */}
      {ideas.length > 0 && (
        <section className="glass-card" aria-labelledby="ideas-titulo">
          <h2 id="ideas-titulo" className="text-base">
            <i className="fa-solid fa-wand-magic-sparkles text-primary" aria-hidden="true" /> Idea
            del chef
            {fuenteIA !== 'ninguna' && (
              <span className="chip ml-2">IA: {fuenteIA === 'openai' ? 'OpenAI' : 'Gemini'}</span>
            )}
          </h2>
          <ul className="mt-2 flex flex-col gap-1 text-sm text-muted-foreground" role="list">
            {ideas.map((idea) => (
              <li key={idea}>
                <i className="fa-solid fa-utensils text-primary" aria-hidden="true" /> {idea}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="resultados-titulo">
        <h2 id="resultados-titulo">Resultados{resultados ? ` (${resultados.length})` : ''}</h2>

        {/* Aviso de datos no evaluables (RF-10): nunca se filtra en silencio */}
        {resultados && sinDato > 0 && (
          <p className="mt-2 text-sm text-muted-foreground" role="status">
            <i className="fa-solid fa-circle-info text-primary" aria-hidden="true" /> {sinDato}{' '}
            receta{sinDato === 1 ? '' : 's'} sin detalle para evaluar los filtros avanzados (cap de
            40 por consulta): quita los filtros si quieres verlas.
          </p>
        )}

        {resultados === null && !cargando && (
          <div className="glass-card mt-3 flex flex-col items-center gap-2 py-10 text-center">
            <i className="fa-solid fa-bowl-food text-4xl text-primary" aria-hidden="true" />
            <p className="font-medium">Todavía no hay resultados</p>
            <p className="text-sm text-muted-foreground">
              Elige un modo de búsqueda y pulsa <strong>Buscar recetas</strong>.
            </p>
          </div>
        )}

        {resultados?.length === 0 && (
          <div className="glass-card mt-3 flex flex-col items-center gap-2 py-10 text-center">
            <i className="fa-solid fa-face-meh text-4xl text-muted-foreground" aria-hidden="true" />
            <p className="font-medium">Sin coincidencias</p>
            <p className="max-w-md text-sm text-muted-foreground">
              {modo === 'categorias'
                ? 'TheMealDB no tiene recetas de esa categoría o área todavía. Prueba con otra opción del filtro.'
                : 'Prueba con otros ingredientes (pollo, tomate, arroz, cebolla…) o cambia de modo de búsqueda.'}
            </p>
          </div>
        )}

        {resultados?.length > 0 && (
          <ul className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" role="list">
            {resultados.map((receta) => (
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
                      className="mb-3 h-32 w-full rounded-xl object-cover"
                    />
                  ) : (
                    <span
                      className="mb-3 flex h-28 items-center justify-center rounded-xl bg-primary/10 text-3xl text-primary"
                      aria-hidden="true"
                    >
                      <i className="fa-solid fa-utensils" />
                    </span>
                  )}
                  <h3 className="line-clamp-2 text-base">{receta.titulo}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {receta.coincidencias || receta.coincidencias ? (
                      <span className="chip">
                        <i className="fa-solid fa-check" aria-hidden="true" /> coincide con{' '}
                        {receta.coincidencias} de tus ingredientes
                      </span>
                    ) : (
                      <>
                        <i className="fa-solid fa-database" aria-hidden="true" /> TheMealDB
                      </>
                    )}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
