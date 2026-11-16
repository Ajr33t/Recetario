import { useEffect, useRef, useState } from 'react';
import { api } from '../../services/api.js';

/**
 * Campo con autocompletado accesible (Fase 4).
 * - tipo='ingrediente': sugiere ingredientes de TheMealDB (clic → se agrega).
 * - tipo='receta': sugiere recetas (clic → abre el detalle).
 * Patrón ARIA combobox: aria-expanded/activedescendant, flechas ↑↓,
 * Enter elige, Escape cierra. Debounce de 250 ms + caché del servidor.
 */
export default function CampoAutocomplete({
  id,
  tipo = 'receta',
  valor,
  onValor,
  onElegir,
  placeholder,
  etiqueta,
}) {
  const [sugerencias, setSugerencias] = useState([]);
  const [abierta, setAbierta] = useState(false);
  const [activa, setActiva] = useState(-1);
  const cajaRef = useRef(null);
  const idLista = `${id}-sugerencias`;

  // Debounce: busca cuando el texto tiene ≥ 2 caracteres
  useEffect(() => {
    const texto = valor.trim();
    if (texto.length < 2) {
      setSugerencias([]);
      setAbierta(false);
      return undefined;
    }
    let vivo = true; // invalidado si el texto cambia antes de responder
    const temporizador = setTimeout(() => {
      api
        .get(`/search/autocomplete?t=${encodeURIComponent(texto)}&tipo=${tipo}`)
        .then((datos) => {
          if (!vivo) return;
          setSugerencias(datos.sugerencias || []);
          setAbierta((datos.sugerencias || []).length > 0);
          setActiva(-1);
        })
        .catch(() => {
          if (vivo) setAbierta(false);
        });
    }, 250);
    return () => {
      vivo = false;
      clearTimeout(temporizador);
    };
  }, [valor, tipo]);

  // Cierra al hacer clic fuera
  useEffect(() => {
    function alClicar(event) {
      if (!cajaRef.current?.contains(event.target)) setAbierta(false);
    }
    document.addEventListener('mousedown', alClicar);
    return () => document.removeEventListener('mousedown', alClicar);
  }, []);

  function elegir(dato) {
    setAbierta(false);
    setSugerencias([]);
    onElegir(dato);
  }

  function alTeclear(event) {
    if (!abierta || sugerencias.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiva((a) => (a + 1) % sugerencias.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiva((a) => (a <= 0 ? sugerencias.length - 1 : a - 1));
    } else if (event.key === 'Enter' && activa >= 0) {
      event.preventDefault();
      elegir(sugerencias[activa]);
    } else if (event.key === 'Escape') {
      setAbierta(false);
    }
  }

  return (
    <div ref={cajaRef} className="relative">
      {etiqueta && (
        <label htmlFor={id} className="mb-1 block text-sm font-medium">
          {etiqueta}
        </label>
      )}
      <input
        id={id}
        className="field"
        type="text"
        role="combobox"
        aria-expanded={abierta}
        aria-controls={idLista}
        aria-autocomplete="list"
        aria-activedescendant={activa >= 0 ? `${id}-op-${activa}` : undefined}
        autoComplete="off"
        placeholder={placeholder}
        value={valor}
        onChange={(e) => onValor(e.target.value)}
        onKeyDown={alTeclear}
        onFocus={() => sugerencias.length > 0 && setAbierta(true)}
      />

      {abierta && sugerencias.length > 0 && (
        <ul
          id={idLista}
          role="listbox"
          aria-label={`Sugerencias de ${tipo}`}
          className="glass absolute left-0 right-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-xl p-1"
        >
          {sugerencias.map((dato, i) => {
            const esIngrediente = tipo === 'ingrediente';
            return (
              <li
                key={esIngrediente ? dato : dato.id}
                id={`${id}-op-${i}`}
                role="option"
                aria-selected={activa === i}
                className={`cursor-pointer rounded-lg px-3 py-2 text-sm ${
                  activa === i ? 'bg-primary/15' : ''
                }`}
                onMouseEnter={() => setActiva(i)}
                onMouseDown={(e) => {
                  e.preventDefault(); // evita que el input pierda el foco antes del clic
                  elegir(dato);
                }}
              >
                {esIngrediente ? (
                  <span>
                    <i className="fa-solid fa-carrot mr-2 text-primary" aria-hidden="true" />
                    {dato}
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    {dato.imagen ? (
                      <img src={dato.imagen} alt="" className="h-7 w-7 rounded object-cover" />
                    ) : (
                      <i className="fa-solid fa-utensils text-primary" aria-hidden="true" />
                    )}
                    <span className="line-clamp-1">{dato.titulo}</span>
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
