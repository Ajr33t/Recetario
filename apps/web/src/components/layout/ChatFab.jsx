import { Link, useLocation } from 'react-router-dom';

/**
 * Botón flotante (FAB) del asistente — Fase 11.
 * Hace visible el chatbot desde cualquier pantalla del navegador:
 * al pulsarlo abre /chat. Se oculta cuando ya estás en el chat.
 */
export default function ChatFab() {
  const { pathname } = useLocation();
  if (pathname === '/chat') return null;

  return (
    <Link
      to="/chat"
      aria-label="Abrir el asistente de cocina"
      title="Asistente de cocina"
      className="glass fixed bottom-5 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full border border-[var(--glass-border)] text-primary shadow-glass transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--primary))] sm:right-6"
    >
      <i className="fa-solid fa-comments text-xl" aria-hidden="true" />
    </Link>
  );
}
