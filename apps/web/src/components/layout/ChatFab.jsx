import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { api, ApiError } from '../../services/api.js';
import { fracaso } from '../../services/toast.js';

const EJEMPLOS = [
  '¿Qué cocino con pollo y arroz?',
  'Dame una receta rápida',
  'Convierte 2 tazas a ml',
];

/**
 * Chat flotante separado del Asistente (petición del cliente).
 * El FAB ya NO navega a /chat: abre su propia conversación en una ventana
 * pequeña con historial propio (sessionStorage) y la misma API de IA local.
 * La página /chat sigue siendo el «Asistente» completo del menú lateral.
 * Se oculta en /chat para no duplicar la experiencia en esa pantalla.
 */
export default function ChatFab() {
  const { pathname } = useLocation();
  const [abierto, setAbierto] = useState(false);
  const [mensajes, setMensajes] = useState([]);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const finRef = useRef(null);

  // Historial propio del chat flotante (no comparte el del Asistente).
  useEffect(() => {
    try {
      const guardados = JSON.parse(sessionStorage.getItem('sazonlab:chat-flotante') || '[]');
      if (Array.isArray(guardados)) setMensajes(guardados.slice(-30));
    } catch {
      sessionStorage.removeItem('sazonlab:chat-flotante');
    }
  }, []);

  useEffect(() => {
    if (mensajes.length) {
      sessionStorage.setItem('sazonlab:chat-flotante', JSON.stringify(mensajes.slice(-30)));
    }
    finRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [mensajes]);

  // Cerrar con Escape
  useEffect(() => {
    if (!abierto) return;
    const alTecla = (e) => {
      if (e.key === 'Escape') setAbierto(false);
    };
    document.addEventListener('keydown', alTecla);
    return () => document.removeEventListener('keydown', alTecla);
  }, [abierto]);

  async function enviar(event, directo) {
    event?.preventDefault();
    const mensaje = (directo ?? texto).trim();
    if (!mensaje || enviando) return;

    setTexto('');
    setEnviando(true);
    setMensajes((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, rol: 'usuario', contenido: mensaje },
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
        },
      ]);
    } catch (err) {
      setMensajes((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          rol: 'asistente',
          contenido: err instanceof ApiError ? err.message : 'No pude responder ahora.',
        },
      ]);
      fracaso('No se pudo completar la consulta');
    } finally {
      setEnviando(false);
    }
  }

  function limpiar() {
    setMensajes([]);
    sessionStorage.removeItem('sazonlab:chat-flotante');
  }

  if (pathname === '/chat') return null;

  return (
    <>
      {abierto && (
        <section
          aria-label="Chat flotante de SazónLab"
          className="glass-panel no-print fixed bottom-20 right-4 z-50 flex h-[26rem] w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden sm:right-6"
        >
          <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-robot text-primary" aria-hidden="true" />
              <div>
                <h2 className="text-sm font-semibold leading-none">Chat de cocina</h2>
                <p className="mt-0.5 text-[11px] text-muted-foreground">Conversación independiente</p>
              </div>
            </div>
            <div className="flex gap-1">
              <button
                type="button"
                className="btn-ghost !px-2 !py-1 !text-xs"
                onClick={limpiar}
                aria-label="Borrar conversación del chat flotante"
                title="Borrar conversación"
              >
                <i className="fa-solid fa-trash-can" aria-hidden="true" />
              </button>
              <button
                type="button"
                className="btn-ghost !px-2 !py-1 !text-xs"
                onClick={() => setAbierto(false)}
                aria-label="Cerrar chat flotante"
              >
                <i className="fa-solid fa-xmark" aria-hidden="true" />
              </button>
            </div>
          </header>

          <div className="flex-1 space-y-2 overflow-y-auto px-3 py-3" role="log" aria-live="polite">
            {mensajes.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                <i className="fa-solid fa-comments text-3xl text-primary" aria-hidden="true" />
                <p className="text-sm font-medium">¿Qué vamos a cocinar?</p>
                <div className="flex flex-wrap justify-center gap-1.5">
                  {EJEMPLOS.map((ejemplo) => (
                    <button
                      key={ejemplo}
                      type="button"
                      className="chip !px-2 !py-1 !text-[11px]"
                      onClick={() => enviar(null, ejemplo)}
                    >
                      {ejemplo}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {mensajes.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.rol === 'usuario' ? 'justify-end' : 'justify-start'}`}
              >
                <p
                  className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${
                    m.rol === 'usuario'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground'
                  }`}
                >
                  {m.contenido}
                </p>
              </div>
            ))}
            {enviando && (
              <p className="text-xs text-muted-foreground" role="status">
                <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" /> Pensando…
              </p>
            )}
            <div ref={finRef} />
          </div>

          <form onSubmit={enviar} className="flex items-center gap-2 border-t border-border p-3">
            <label htmlFor="chat-flotante-input" className="sr-only">
              Escribe tu mensaje
            </label>
            <input
              id="chat-flotante-input"
              className="field !py-2 text-sm"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Pregunta sobre recetas…"
              autoComplete="off"
            />
            <button
              type="submit"
              className="btn-primary !px-3"
              disabled={enviando || !texto.trim()}
              aria-label="Enviar mensaje al chat flotante"
            >
              <i className="fa-solid fa-paper-plane" aria-hidden="true" />
            </button>
          </form>
        </section>
      )}

      <button
        type="button"
        aria-label={abierto ? 'Cerrar chat de cocina' : 'Abrir chat de cocina'}
        aria-expanded={abierto}
        title="Chat de cocina"
        onClick={() => setAbierto((v) => !v)}
        className="glass no-print fixed bottom-5 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full border border-[var(--glass-border)] text-primary shadow-glass transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--primary))] sm:right-6"
      >
        <i className={`fa-solid ${abierto ? 'fa-xmark' : 'fa-comments'} text-xl`} aria-hidden="true" />
      </button>
    </>
  );
}
