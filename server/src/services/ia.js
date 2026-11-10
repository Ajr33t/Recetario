/**
 * Sugerencias con IA (Fase 4 — RF-04).
 *
 * Orden de preferencia:
 * 1. OPENAI_API_KEY  → chat completions (gpt-4o-mini)
 * 2. GEMINI_API_KEY  → generateContent (gemini-1.5-flash)
 * 3. Sin claves       → respaldo con TheMealDB (siempre funciona)
 *
 * La IA aporta una "idea del chef" en texto; las recetas concretas
 * siempre salen de TheMealDB para que el resultado sea verificable.
 */

const MODELO_OPENAI = 'gpt-4o-mini';
const MODELO_GEMINI = 'gemini-1.5-flash';

const PROMPT = (ingredientes, restriccion) =>
  `Eres un chef. Con estos ingredientes: ${ingredientes.join(', ')}${
    restriccion ? ` (restricción: ${restriccion})` : ''
  }. Sugiere 3 ideas de platillo en español, cada una en una línea de máximo 20 palabras,
empieza cada una con "•". Sé concreto y apetitoso. No repitas ingredientes de más.`;

function extraerIdeas(texto) {
  return texto
    .split('\n')
    .map((l) => l.replace(/^[•\-\d.\s]+/, '').trim())
    .filter((l) => l.length > 0)
    .slice(0, 3);
}

/** Idea del chef vía OpenAI. Devuelve [] si falla o no hay clave. */
async function conOpenAI(apiKey, ingredientes, restriccion) {
  const respuesta = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODELO_OPENAI,
      max_tokens: 220,
      messages: [
        { role: 'system', content: 'Eres un asistente culinario conciso.' },
        { role: 'user', content: PROMPT(ingredientes, restriccion) },
      ],
    }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!respuesta.ok) throw new Error(`OpenAI ${respuesta.status}`);
  const datos = await respuesta.json();
  return extraerIdeas(datos.choices?.[0]?.message?.content || '');
}

/** Idea del chef vía Google Gemini. Devuelve [] si falla o no hay clave. */
async function conGemini(apiKey, ingredientes, restriccion) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODELO_GEMINI}:generateContent?key=${apiKey}`;
  const respuesta = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: PROMPT(ingredientes, restriccion) }] }],
    }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!respuesta.ok) throw new Error(`Gemini ${respuesta.status}`);
  const datos = await respuesta.json();
  return extraerIdeas(datos.candidates?.[0]?.content?.parts?.[0]?.text || '');
}

/**
 * Devuelve las ideas del chef (puede estar vacío si no hay IA configurada).
 * @returns {Promise<{fuente: 'openai'|'gemini'|'ninguna', ideas: string[]}>}
 */
export async function ideasDelChef(ingredientes, restriccion = null) {
  if (process.env.OPENAI_API_KEY) {
    try {
      const ideas = await conOpenAI(process.env.OPENAI_API_KEY, ingredientes, restriccion);
      if (ideas.length > 0) return { fuente: 'openai', ideas };
    } catch (err) {
      console.warn(`[SazónLab] OpenAI falló (${err.message}); se intenta Gemini/TheMealDB.`);
    }
  }
  if (process.env.GEMINI_API_KEY) {
    try {
      const ideas = await conGemini(process.env.GEMINI_API_KEY, ingredientes, restriccion);
      if (ideas.length > 0) return { fuente: 'gemini', ideas };
    } catch (err) {
      console.warn(`[SazónLab] Gemini falló (${err.message}); usando TheMealDB.`);
    }
  }
  return { fuente: 'ninguna', ideas: [] };
}
