import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, ApiError } from '../services/api.js';
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

  const [resultados, setResultados] = useState(null); // null = sin buscar
  const [ideas, setIdeas] = useState([]);
  const [fuenteIA, setFuenteIA] = useState('ninguna');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  // Carga los filtros (categorías/áreas) una sola vez
  useEffect(() => {
    let vivo = true;
    api
      .get('/search/filtros')
      .then((datos) => {
        if (!vivo) return;
        setCategorias(datos.categorias || []);
        setAreas(datos.areas || []);
      })
      .catch(() => {}); // sin filtros la búsqueda sigue funcionando
    return () => {
      vivo = false;
    };
  }, []);

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

  async function ejecutar(event) {
    event.preventDefault();
    setError('');
    setIdeas([]);
    setCargando(true);
    try {
      if (modo === 'ingredientes') {
        if (ingredientes.length === 0) {
          setError('Agrega al menos un ingrediente para buscar.');
          setResultados(null);
          return;
        }
        const datos = await api.get(
          `/search/sugerencias?i=${encodeURIComponent(ingredientes.join(','))}`,
        );
        setResultados(datos.recetas);
        setIdeas(datos.ideas || []);
        setFuenteIA(datos.fuente || 'ninguna');
        // Guarda los ingredientes disponibles: el detalle de receta los usa
        // para marcar en rojo los ingredientes que te faltan (Fase 5)
        try {
          sessionStorage.setItem(
            'sazonlab:ingredientes',
            JSON.stringify(ingredientes.map((i) => i.toLowerCase())),
          );
        } catch {
          /* almacenamiento no disponible: se omite sin romper la búsqueda */
        }
        return;
      }

      if (modo === 'nombre') {
        const q = nombre.trim();
        if (q.length < 2) {
          setError('Escribe al menos 2 caracteres para buscar.');
          setResultados(null);
          return;
        }
        const datos = await api.get(`/search?q=${encodeURIComponent(q)}`);
        setResultados(datos.recetas);
        return;
      }

      // categorías
      if (!categoriaSel && !areaSel) {
        setError('Elige una categoría o un área para explorar.');
        setResultados(null);
        return;
      }
      const consulta = categoriaSel
        ? `c=${encodeURIComponent(categoriaSel)}`
        : `a=${encodeURIComponent(areaSel)}`;
      const datos = await api.get(`/search/categorias?${consulta}`);
      setResultados(datos.recetas);
    } catch (err) {
      setResultados(null);
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
          </fieldset>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className="btn-primary" disabled={cargando}>
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
              Prueba con otros ingredientes (pollo, tomate, arroz, cebolla…) o cambia de modo de
              búsqueda.
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
