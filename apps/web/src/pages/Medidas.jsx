import { useState } from 'react';
import {
  VOLUMEN,
  PESO,
  TEMPERATURA,
  MEDIDAS,
  TEMPERATURA_EQUIVALENCIAS,
  convertir,
  formatear,
  filasEquivalencias,
} from '../data/medidas.js';

const GRUPOS = [
  { id: 'volumen', label: 'Volumen', unidades: VOLUMEN },
  { id: 'peso', label: 'Peso', unidades: PESO },
  { id: 'temperatura', label: 'Temperatura', unidades: TEMPERATURA },
];

function Tabla({ titulo, filas, cabecera }) {
  return (
    <section className="surface-section" aria-labelledby={`tabla-${filas[0].es}`}>
      <h2 id={`tabla-${filas[0].es}`} className="text-base">
        <i className="fa-solid fa-ruler-combined text-primary" aria-hidden="true" /> {titulo}
      </h2>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              {cabecera.map((c) => (
                <th key={c} scope="col" className="py-2 pr-4 font-semibold">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.es} className="border-b border-border/40 last:border-0">
                <td className="py-2 pr-4 font-medium">{f.texto1}</td>
                <td className="py-2 pr-4 text-muted-foreground">{f.texto2}</td>
                <td className="py-2 pr-4 text-primary">{f.texto3}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/**
 * Medidas y conversor (idea del cliente — Fase 5): tabla de equivalencias
 * fijas español ↔ inglés (cucharadas, tazas, onzas…) + conversor de
 * unidades de volumen, peso y temperatura. Página pública (sin sesión).
 */
export default function Medidas() {
  const [valor, setValor] = useState('1');
  const [de, setDe] = useState('taza');
  const [a, setA] = useState('ml');

  const deMedida = MEDIDAS.find((m) => m.id === de);
  const aMedida = MEDIDAS.find((m) => m.id === a);
  const numero = Number(String(valor).replace(',', '.'));
  const resultado = Number.isNaN(numero) ? null : convertir(numero, de, a);

  /** Nombre en minúsculas con plural correcto (la temperatura no se pluraliza). */
  const nombreUnidad = (m, cantidad) =>
    m.grupo === 'temperatura'
      ? m.es.toLowerCase()
      : `${m.es.toLowerCase()}${cantidad === 1 ? '' : 's'}`;

  /** Al cambiar la unidad de origen se ajusta el destino a su grupo. */
  function cambiarOrigen(id) {
    setDe(id);
    const grupo = MEDIDAS.find((m) => m.id === id)?.grupo;
    if (MEDIDAS.find((m) => m.id === a)?.grupo !== grupo) {
      setA(MEDIDAS.find((m) => m.grupo === grupo).id);
    }
  }

  function invertir() {
    setDe(a);
    setA(de);
  }

  const filasVolumen = filasEquivalencias(VOLUMEN).map((f) => ({
    texto1: f.es,
    texto2: f.en,
    texto3: `1 ${f.es.toLowerCase()} = ${f.valor} ${f.base}${
      Number(String(f.valor).replace(',', '.')) === 1 ? '' : 's'
    }`,
  }));
  const filasPeso = filasEquivalencias(PESO).map((f) => ({
    texto1: f.es,
    texto2: f.en,
    texto3: `1 ${f.es.toLowerCase()} = ${f.valor} ${f.base}${
      Number(String(f.valor).replace(',', '.')) === 1 ? '' : 's'
    }`,
  }));
  const filasTemperatura = TEMPERATURA_EQUIVALENCIAS.map((t) => ({
    texto1: t.es,
    texto2: t.en,
    texto3: t.nota,
  }));

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1>Medidas y conversor</h1>
        <p className="mt-1 text-muted-foreground">
          Equivalencias fijas entre medidas en español y inglés (cucharadas, tazas, onzas…) y un
          conversor rápido para adaptar cualquier receta a tu cocina.
        </p>
      </header>

      {/* Conversor */}
      <section className="surface-section" aria-labelledby="conversor-titulo">
        <h2 id="conversor-titulo" className="text-base">
          <i className="fa-solid fa-arrow-right-arrow-left text-primary" aria-hidden="true" />{' '}
          Conversor de medidas
        </h2>

        <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,140px)_minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-end">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Cantidad</span>
            <input
              type="number"
              inputMode="decimal"
              className="field"
              value={valor}
              min="0"
              step="any"
              onChange={(e) => setValor(e.target.value)}
              aria-label="Cantidad a convertir"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">De</span>
            <select
              className="field"
              value={de}
              onChange={(e) => cambiarOrigen(e.target.value)}
              aria-label="Unidad de origen"
            >
              {GRUPOS.map((g) => (
                <optgroup key={g.id} label={g.label}>
                  {g.unidades.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.es} ({u.en})
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>

          <button
            type="button"
            className="btn-ghost !px-3 sm:mb-0.5"
            onClick={invertir}
            aria-label="Invertir unidades"
            title="Invertir unidades"
          >
            <i className="fa-solid fa-right-left" aria-hidden="true" />
          </button>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">A</span>
            <select
              className="field"
              value={a}
              onChange={(e) => setA(e.target.value)}
              aria-label="Unidad de destino"
            >
              {GRUPOS.map((g) => (
                <optgroup key={g.id} label={g.label}>
                  {g.unidades.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.es} ({u.en})
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
        </div>

        <p
          className="glass-card mt-4 text-center text-lg font-semibold"
          role="status"
          aria-live="polite"
        >
          {resultado == null ? (
            <span className="text-muted-foreground">
              Elige unidades del mismo tipo (volumen con volumen, peso con peso…)
            </span>
          ) : (
            <>
              {formatear(numero)} {nombreUnidad(deMedida, numero)} ={' '}
              <span className="text-primary">{formatear(resultado)}</span>{' '}
              {nombreUnidad(aMedida, resultado)}
            </>
          )}
        </p>
      </section>

      <Tabla
        titulo="Volumen — español ↔ inglés"
        cabecera={['Medida (español)', 'Measure (english)', 'Equivalencia']}
        filas={filasVolumen}
      />
      <Tabla
        titulo="Peso — español ↔ inglés"
        cabecera={['Medida (español)', 'Measure (english)', 'Equivalencia']}
        filas={filasPeso}
      />
      <Tabla
        titulo="Temperatura — equivalencias frecuentes"
        cabecera={['Español', 'English', 'Referencia']}
        filas={filasTemperatura}
      />
    </div>
  );
}
