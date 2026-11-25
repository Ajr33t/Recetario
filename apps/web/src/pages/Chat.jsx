import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../services/api.js';
import { exito, fracaso, informar } from '../services/toast.js';
import { useAuthStore } from '../store/authStore.js';

const EJEMPLOS = [
  '¿Qué puedo cocinar con pollo y arroz?',
  'Muéstrame mis recetas',
  'Convierte 2 tazas a mililitros',
  '¿Cómo cambio al modo oscuro?',
];

/**
 * Chatbot de SazónLab (Fase 10): IA local (Ollama) si está instalada,
 * si no OpenAI/Gemini, y como respaldo un asistente local que usa los
 * datos reales de la app. Pensado para funcionar también en el celular.
 */
export default function Chat() {
  const usuario = useAuthStore((s) => s.usuario);
  const [mensajes, setMensajes] = useState([]);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [estado, setEstado] = useState(null);
  const finRef = useRef(null);

  // Estado de los motores (badge de la cabecera del chat)
  useEffect(() => {
    api
      .get('/chat/estado')
      .then(setEstado)
      .catch(() => setEstado(null));
  }, []);

  // Historial guardado (si hay sesión)
  useEffect(() => {
    if (!usuario) {
      setMensajes([]);
      return;
    }
    api
      .get('/chat/historial')
      .then((datos) => setMensajes(datos.mensajes || []))
      .catch(() => {});
  }, [usuario]);

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [mensajes]);

  async function enviar(event, mensajeDirecto) {
    event?.preventDefault();
    const mensaje = (mensajeDirecto ?? texto).trim();
    if (!mensaje || enviando) return;

    setTexto('');
    setEnviando(true);
    setMensajes((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, rol: 'usuario', contenido: mensaje, fuente: 'usuario' },
    ]);

    try {
      const respuesta = await api.post('/chat', { mensaje });
      setMensajes((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          rol: 'asistente',
          contenido: respuesta.respuesta,
          fuente: respuesta.fuente,
          sugerencias: respuesta.sugerencias || [],
        },
      ]);
    } catch (err) {
      setMensajes((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          rol: 'asistente',
          contenido:
            err instanceof ApiError ? err.message : 'No pude responder ahora. Intenta de nuevo.',
          fuente: 'error',
        },
      ]);
      fracaso('No se pudo completar la consulta');
    } finally {
      setEnviando(false);
    }
  }

  async function limpiar() {
    setMensajes([]);
    if (usuario) {
      try {
        await api.delete('/chat/historial');
        exito('Conversación borrada');
      } catch {
        informar('No se pudo borrar el historial');
      }
    }
  }

  const motor = estado?.ia?.activo || 'local';
  const etiquetaMotor =
    motor === 'ollama'
      ? 'IA local (Ollama)'
      : motor === 'openai'
        ? 'IA en la nube (OpenAI)'
        : motor === 'gemini'
          ? 'IA en la nube (Gemini)'
          : 'Asistente local de SazónLab';

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1>
            <i className="fa-solid fa-robot text-primary" aria-hidden="true" /> Asistente
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pregúntame por recetas, ingredientes, medidas o cómo usar la app.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="chip" title="Motor de inteligencia artificial en uso">
            <i
              className={`fa-solid ${
                motor === 'local' ? 'fa-plug-circle-xmark' : 'fa-brain'
              } text-primary`}
              aria-hidden="true"
            />
            {etiquetaMotor}
          </span>
          {mensajes.length > 0 && (
            <button type="button" className="btn-ghost !px-3 !text-xs" onClick={limpiar}>
              <i className="fa-solid fa-trash" aria-hidden="true" /> Borrar chat
            </button>
          )}
        </div>
      </header>

      {/* Conversación */}
      <div
        className="glass-card flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4"
        role="log"
        aria-live="polite"
        aria-label="Conversación con el asistente"
      >
        {mensajes.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <i className="fa-solid fa-mortarboard text-4xl text-primary" aria-hidden="true" />
            <p className="font-medium">¿En qué te ayudo?</p>
            <p className="max-w-md text-sm text-muted-foreground">
              Dime qué ingredientes tienes y te propongo recetas. Si instalas Ollama, la respuesta
              llega con IA 100% local (sin internet y sin enviar tus datos a nadie).
            </p>
            <ul className="mt-2 flex flex-wrap justify-center gap-2" role="list">
              {EJEMPLOS.map((e) => (
                <li key={e}>
                  <button type="button" className="chip" onClick={(ev) => enviar(ev, e)}>
                    <i className="fa-solid fa-wand-magic-sparkles" aria-hidden="true" /> {e}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {mensajes.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.rol === 'usuario' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm shadow-sm sm:max-w-[75%] ${
                m.rol === 'usuario'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-[rgb(var(--muted)/0.6)] text-foreground'
              }`}
            >
              <p className="whitespace-pre-line">{m.contenido}</p>
              {m.sugerencias?.length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-2" role="list">
                  {m.sugerencias.map((s) => (
                    <li key={s.id}>
                      <Link
                        to={`/receta/${s.id}`}
                        className="chip !bg-white/25 !text-inherit hover:opacity-90"
                      >
                        {s.titulo}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ))}
        {enviando && (
          <p className="text-sm text-muted-foreground" role="status">
            <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" /> Pensando…
          </p>
        )}
        <div ref={finRef} />
      </div>

      {/* Entrada */}
      <form className="glass-card flex items-end gap-2 p-2" onSubmit={enviar}>
        <label htmlFor="chat-mensaje" className="sr-only">
          Escribe tu pregunta al asistente
        </label>
        <textarea
          id="chat-mensaje"
          className="field max-h-32 min-h-[2.75rem] flex-1 resize-y py-2 !min-h-11"
          rows={1}
          placeholder="Escribe tu pregunta…"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              enviar(e);
            }
          }}
        />
        <button type="submit" className="btn-primary !px-4 !min-h-10" disabled={enviando || !texto.trim()}>
          <i
            className={`fa-solid ${enviando ? 'fa-spinner fa-spin' : 'fa-paper-plane'}`}
            aria-hidden="true"
          />
          <span className="hidden sm:inline"> Enviar</span>
        </button>
      </form>

      {!usuario && (
        <p className="text-xs text-muted-foreground">
          <i className="fa-solid fa-circle-info" aria-hidden="true" /> Inicia sesión para guardar tu
          conversación y consultarla desde cualquier dispositivo.{' '}
          <Link to="/login" className="underline hover:text-foreground">
            Iniciar sesión
          </Link>
        </p>
      )}
    </div>
  );
}
