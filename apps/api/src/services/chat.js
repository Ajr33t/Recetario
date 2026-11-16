/**
 * Chatbot de SazónLab (Fase 10).
 *
 * Cadena de respuesta:
 * 1. IA local (Ollama) → 2. OpenAI → 3. Gemini → 4. **Asistente local**
 *    (determinista, en español y con los datos reales de la app: recetas
 *    propias, catálogo de TheMealDB, medidas, temas…). Así el chatbot
 *    **siempre responde**, aunque no haya ninguna IA instalada.
 */
import { getDb } from '../db/database.js';
import { chatIA } from './ia.js';
import { sugerenciasSinIA } from './mealdb.js';
import { aInglesConCache, traducirResumenes } from './traductor.js';

/** Quita acentos y pasa a minúsculas (para comparar sin sorpresas). */
function normalizar(texto) {
  return String(texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/** Extrae una lista de ingredientes de la frase del usuario. */
function extraerIngredientes(mensaje) {
  const texto = normalizar(mensaje);
  const coincide = texto.match(/(?:con|usando|tengo|hay|disponibles?)\s+([^?.]+)/);
  const bruto = coincide ? coincide[1] : texto;
  return bruto
    .split(/,|\sy\b|\so\b|\bcon\b/)
    .map((p) => p.trim())
    .filter((p) => p.length > 1 && p.length < 28)
    .slice(0, 6);
}

/** Contexto de la app que se le da al modelo (y al asistente local). */
function construirContexto(usuario) {
  const db = getDb();
  let recetasPropias = [];
  if (usuario) {
    recetasPropias = db
      .prepare(
        "SELECT titulo FROM recipes WHERE user_id = ? AND estado = 'activa' ORDER BY id DESC LIMIT 8",
      )
      .all(usuario.id)
      .map((r) => r.titulo);
  }
  return { recetasPropias, totalRecetas: recetasPropias.length };
}

const SYSTEM_PROMPT = (contexto) => `Eres el asistente culinary de SazónLab, una app de recetario.
Responde SIEMPRE en español, en tono cercano y práctico (máx. 120 palabras).
No inventes recetas ni ingredientes: si no sabes algo, dilo y usa lo que sí sabes.
Puedes mencionar estas recetas del usuario cuando sirvan: ${
  contexto.recetasPropias.length ? contexto.recetasPropias.join(', ') : '(todavía no tiene recetas)'
}.`;

/** Búsqueda real en el catálogo para el asistente local. */
async function buscarRecetas(ingredientes) {
  const nombres = await Promise.all(ingredientes.map((i) => aInglesConCache(i)));
  const crudas = await sugerenciasSinIA(nombres);
  return traducirResumenes(crudas);
}

/**
 * Asistente local determinista: funciona sin ninguna IA externa.
 * @param {string} mensaje
 * @param {{usuario: object|null, contexto: object}} ctx
 * @returns {Promise<{respuesta: string, sugerencias: Array}>}
 */
async function respuestaLocal(mensaje, ctx) {
  const texto = normalizar(mensaje);
  const sugerencias = [];

  if (/(hola|buenas|holi|hey|que tal|saludo)/.test(texto) && texto.length < 40) {
    return {
      respuesta:
        '¡Hola! 🍳 Soy el asistente de SazónLab. Te puedo ayudar con:\n' +
        '• Recetas con lo que tienes en casa (prueba: «¿qué puedo cocinar con pollo y arroz?»)\n' +
        '• Tus recetas guardadas («muéstrame mis recetas»)\n' +
        '• Equivalencias y medidas («convierte 2 tazas a mililitros»)\n' +
        '• Temas y accesibilidad («¿cómo cambio al modo oscuro?»)',
      sugerencias,
    };
  }

  if (/(que puedes hacer|ayuda|funciones|como funciona)/.test(texto)) {
    return {
      respuesta:
        'Puedo buscarte recetas por ingredientes, recordarte tus recetas guardadas, orientarte ' +
        'con las medidas de la app y explicarte los temas, el modo oscuro y el alto contraste. ' +
        'Dime qué tienes en la nevera y te propongo qué cocinar.',
      sugerencias,
    };
  }

  if (/(medida|convertir|equivalen|taza|cucharada|ml|mililitro|gramo)/.test(texto)) {
    return {
      respuesta:
        'Para equivalencias exactas tienes la página «Medidas»: convierte tazas, cucharadas, ' +
        'mililitros, gramos y Fahrenheit, y trae tablas en español e inglés. Ábrela desde el ' +
        'menú lateral (icono de regla) y el resultado se ve al instante.',
      sugerencias,
    };
  }

  if (/(tema|oscuro|contraste|accesib|fuente|letra)/.test(texto)) {
    return {
      respuesta:
        'En «Ajustes» puedes cambiar el tema (12 paletas), el modo claro/oscuro, activar el ' +
        'alto contraste y ajustar el tamaño de fuente. Atajos: Ctrl/Cmd + +/− cambia el ' +
        'tamaño de letra y Esc cierra los menús abiertos.',
      sugerencias,
    };
  }

  if (/(mis recetas|mis recetas guardadas|creadas|guardadas|recetario)/.test(texto)) {
    if (!ctx.contexto.recetasPropias.length) {
      return {
        respuesta:
          'Todavía no tienes recetas guardadas. Cuando crees una, aparecerá aquí y podrás ' +
          'editarla, compartirla o generar tu libro de cocina en PDF.',
        sugerencias,
      };
    }
    return {
      respuesta: `Tienes ${ctx.contexto.totalRecetas} recetas recientes:\n${ctx.contexto.recetasPropias
        .map((t) => `• ${t}`)
        .join('\n')}\n¿Quieres alguna en detalle o que te sugiera una variación?`,
      sugerencias,
    };
  }

  if (/(favorit)/.test(texto)) {
    return {
      respuesta:
        'Tus favoritos están en el menú lateral, en «Favoritos»: guardas recetas del catálogo ' +
        'o las tuyas propias y las encuentras en un clic.',
      sugerencias,
    };
  }

  // Búsqueda por ingredientes (último recurso, cubre la mayoría de preguntas)
  const ingredientes = extraerIngredientes(mensaje);
  if (ingredientes.length) {
    try {
      const recetas = await buscarRecetas(ingredientes);
      if (recetas.length) {
        for (const r of recetas.slice(0, 5)) {
          sugerencias.push({ id: r.id, titulo: r.titulo, imagen: r.imagen, origen: 'catalogo' });
        }
        const lista = recetas
          .slice(0, 5)
          .map((r) => `• ${r.titulo}`)
          .join('\n');
        return {
          respuesta: `Con ${ingredientes.join(', ')} puedes preparar:\n${lista}\n\n¿Abro alguna?`,
          sugerencias,
        };
      }
    } catch (err) {
      console.warn(`[SazónLab] Búsqueda local falló (${err.message}).`);
    }
  }

  return {
    respuesta:
      'Puedo buscarte recetas por ingredientes, listar tus recetas guardadas o ayudarte con las ' +
      'medidas y los temas. Prueba con «¿qué puedo cocinar con pollo, arroz y limón?».',
    sugerencias,
  };
}

/**
 * Responde un mensaje del usuario.
 * @param {string} mensaje
 * @param {{usuario?: object|null, historial?: Array}} [opciones]
 * @returns {Promise<{respuesta: string, fuente: string, sugerencias: Array}>}
 */
export async function responderChat(mensaje, opciones = {}) {
  const usuario = opciones.usuario || null;
  const contexto = construirContexto(usuario);
  const historial = (opciones.historial || []).slice(-8);

  const mensajes = [
    { role: 'system', content: SYSTEM_PROMPT(contexto) },
    ...historial,
    { role: 'user', content: mensaje },
  ];

  const ia = await chatIA(mensajes);
  if (ia) {
    return { respuesta: ia.texto, fuente: ia.fuente, sugerencias: [] };
  }

  const local = await respuestaLocal(mensaje, { usuario, contexto });
  return { respuesta: local.respuesta, fuente: 'local', sugerencias: local.sugerencias };
}
