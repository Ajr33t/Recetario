/**
 * Sugerencias y conversación con IA (Fases 4 y 10 — RF-04).
 *
 * Orden de preferencia:
 * 1. Ollama (IA local, sin claves ni internet)   → Fase 10
 * 2. OPENAI_API_KEY  → chat completions (gpt-4o-mini)
 * 3. GEMINI_API_KEY  → generateContent (gemini-1.5-flash)
 * 4. Sin nada        → respaldo con TheMealDB (siempre funciona)
 *
 * La IA aporta una "idea del chef" en texto; las recetas concretas
 * siempre salen de TheMealDB para que el resultado sea verificable.
 */
import { chatOllama, estadoOllama } from './ollama.js';

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
 * Estado de los motores de IA disponibles (para el panel de Ajustes y el
 * badge del chatbot).
 * @returns {Promise<{local: {disponible: boolean, modelo: string, host: string},
 *   nube: {openai: boolean, gemini: boolean}, activo: string}>}
 */
export async function estadoIA() {
  const local = await estadoOllama();
  const openai = Boolean(process.env.OPENAI_API_KEY);
  const gemini = Boolean(process.env.GEMINI_API_KEY);
  const activo = local.disponible ? 'ollama' : openai ? 'openai' : gemini ? 'gemini' : 'local';
  return {
    local: { disponible: local.disponible, modelo: local.modelo, host: local.host },
    nube: { openai, gemini },
    activo,
  };
}

/**
 * Conversación con la mejor IA disponible (Ollama → OpenAI → Gemini).
 * @param {Array<{role: string, content: string}>} mensajes
 * @returns {Promise<{texto: string, fuente: 'ollama'|'openai'|'gemini'}|null>}
 */
export async function chatIA(mensajes) {
  const local = await chatOllama(mensajes);
  if (local) return { texto: local.texto, fuente: 'ollama' };

  const ultimo = mensajes[mensajes.length - 1]?.content || '';

  if (process.env.OPENAI_API_KEY) {
    try {
      const respuesta = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: MODELO_OPENAI,
          messages: mensajes,
        }),
        signal: AbortSignal.timeout(30_000),
      });
      if (!respuesta.ok) throw new Error(`OpenAI ${respuesta.status}`);
      const datos = await respuesta.json();
      const texto = (datos.choices?.[0]?.message?.content || '').trim();
      if (texto) return { texto, fuente: 'openai' };
    } catch (err) {
      console.warn(`[SazónLab] OpenAI falló en el chat (${err.message}).`);
    }
  }

  if (process.env.GEMINI_API_KEY) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODELO_GEMINI}:generateContent?key=${process.env.GEMINI_API_KEY}`;
      const respuesta = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: mensajes.map((m) => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }],
          })),
        }),
        signal: AbortSignal.timeout(30_000),
      });
      if (!respuesta.ok) throw new Error(`Gemini ${respuesta.status}`);
      const datos = await respuesta.json();
      const texto = (datos.candidates?.[0]?.content?.parts?.[0]?.text || '').trim();
      if (texto) return { texto, fuente: 'gemini' };
    } catch (err) {
      console.warn(`[SazónLab] Gemini falló en el chat (${err.message}).`);
    }
  }

  console.log(`[SazónLab] Consulta sin IA externa: ${ultimo.slice(0, 60)}`);
  return null;
}

/**
 * Devuelve las ideas del chef (puede estar vacío si no hay IA configurada).
 * @returns {Promise<{fuente: 'ollama'|'openai'|'gemini'|'ninguna', ideas: string[]}>}
 */
export async function ideasDelChef(ingredientes, restriccion = null) {
  // 1) IA local (Ollama) — sin claves y sin internet
  const mensajes = [
    { role: 'system', content: 'Eres un chef. Responde en español, de forma concisa.' },
    { role: 'user', content: PROMPT(ingredientes, restriccion) },
  ];
  const local = await chatOllama(mensajes);
  if (local) {
    const ideas = extraerIdeas(local.texto);
    if (ideas.length > 0) return { fuente: 'ollama', ideas };
  }

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
