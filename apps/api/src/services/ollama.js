/**
 * Cliente de **Ollama** — IA local (Fase 10).
 *
 * Ollama es un servidor de modelos de lenguaje que corre en el propio
 * equipo (https://ollama.com): no necesita claves, no manda los datos a
 * ningún servidor y funciona sin internet. Es la opción "IA local" de
 * SazónLab y la primera en la cadena de preferencia del chatbot.
 *
 * - Host: `OLLAMA_HOST` (por defecto http://localhost:11434)
 * - Modelo: `OLLAMA_MODELO` (por defecto el primero disponible)
 */

const HOST = () => (process.env.OLLAMA_HOST || 'http://localhost:11434').replace(/\/$/, '');
const MODELO = () => process.env.OLLAMA_MODELO || '';

/** Lista los modelos instalados en Ollama (vacío si no está corriendo). */
export async function listarModelos() {
  try {
    const respuesta = await fetch(`${HOST()}/api/tags`, { signal: AbortSignal.timeout(2500) });
    if (!respuesta.ok) return [];
    const datos = await respuesta.json();
    return (datos.models || []).map((m) => m.name).filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Estado de la IA local.
 * @returns {Promise<{disponible: boolean, host: string, modelo: string, modelos: string[]}>}
 */
export async function estadoOllama() {
  const modelos = await listarModelos();
  const modelo = MODELO() || modelos[0] || '';
  return {
    disponible: modelos.length > 0,
    host: HOST(),
    modelo,
    modelos,
  };
}

/**
 * Conversación con el modelo local.
 * @param {Array<{role: string, content: string}>} mensajes
 * @param {{modelo?: string}} [opciones]
 * @returns {Promise<{texto: string, modelo: string}|null>} null si no hay Ollama
 */
export async function chatOllama(mensajes, opciones = {}) {
  const estado = await estadoOllama();
  const modelo = opciones.modelo || estado.modelo;
  if (!estado.disponible || !modelo) return null;

  try {
    const respuesta = await fetch(`${HOST()}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: modelo, messages: mensajes, stream: false }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!respuesta.ok) throw new Error(`Ollama respondió ${respuesta.status}`);
    const datos = await respuesta.json();
    const texto = (datos.message?.content || datos.response || '').trim();
    if (!texto) return null;
    return { texto, modelo };
  } catch (err) {
    console.warn(`[SazónLab] Ollama falló (${err.message}); se usa el respaldo.`);
    return null;
  }
}
