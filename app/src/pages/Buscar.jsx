import { useState } from 'react';

/**
 * Búsqueda por ingredientes (RF-03/RF-04).
 * Fase 1: formulario e interfaz base. La consulta a TheMealDB/IA
 * y los filtros avanzados se conectan en la Fase 4.
 */
export default function Buscar() {
  const [ingredientes, setIngredientes] = useState([]);
  const [texto, setTexto] = useState('');
  const [aviso, setAviso] = useState('');

  function agregarIngrediente(event) {
    event.preventDefault();
    const valor = texto.trim().toLowerCase();
    if (!valor) return;
    if (!ingredientes.includes(valor)) {
      setIngredientes((prev) => [...prev, valor]);
    }
    setTexto('');
    setAviso('');
  }

  function quitarIngrediente(ing) {
    setIngredientes((prev) => prev.filter((i) => i !== ing));
  }

  function buscar(event) {
    event.preventDefault();
    setAviso(
      ingredientes.length === 0
        ? 'Agrega al menos un ingrediente para buscar.'
        : `La búsqueda con ${ingredientes.length} ingrediente(s) se conectará a TheMealDB/IA en la Fase 4.`,
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1>Buscar por ingredientes</h1>
        <p className="mt-1 text-muted-foreground">
          Escribe lo que tienes en tu cocina y recibe recetas ordenadas por ingredientes faltantes.
        </p>
      </header>

      <form
        className="surface-section flex flex-col gap-4"
        onSubmit={buscar}
        aria-label="Formulario de búsqueda"
      >
        {/* Chips de ingredientes */}
        <div>
          <label htmlFor="ingredientes-input" className="mb-1 block text-sm font-medium">
            Tus ingredientes
          </label>
          <div className="flex gap-2">
            <input
              id="ingredientes-input"
              className="field"
              type="text"
              placeholder="Ej. tomate, cebolla, arroz…"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              autoComplete="off"
            />
            <button type="submit" className="btn-secondary" onClick={agregarIngrediente}>
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

        {/* Filtros avanzados (RF-10 — se activan en Fase 4) */}
        <fieldset className="grid gap-3 sm:grid-cols-3">
          <legend className="mb-1 text-sm font-medium">Filtros opcionales</legend>
          <select className="field" disabled defaultValue="" aria-label="Tiempo máximo (Fase 4)">
            <option value="">Tiempo: cualquiera</option>
          </select>
          <select className="field" disabled defaultValue="" aria-label="Dificultad (Fase 4)">
            <option value="">Dificultad: cualquier</option>
          </select>
          <select className="field" disabled defaultValue="" aria-label="Tipo de dieta (Fase 4)">
            <option value="">Dieta: cualquiera</option>
          </select>
        </fieldset>

        <div>
          <button type="submit" className="btn-primary">
            <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
            Buscar recetas
          </button>
          {aviso && (
            <p role="status" className="mt-3 text-sm text-muted-foreground">
              <i className="fa-solid fa-circle-info text-primary" aria-hidden="true" /> {aviso}
            </p>
          )}
        </div>
      </form>

      <section aria-labelledby="resultados-titulo">
        <h2 id="resultados-titulo">Resultados</h2>
        <div className="glass-card mt-3 flex flex-col items-center gap-2 py-10 text-center">
          <i className="fa-solid fa-bowl-food text-4xl text-primary" aria-hidden="true" />
          <p className="font-medium">Todavía no hay resultados</p>
          <p className="text-sm text-muted-foreground">
            Agrega ingredientes y pulsa <strong>Buscar recetas</strong> para ver sugerencias.
          </p>
        </div>
      </section>
    </div>
  );
}
