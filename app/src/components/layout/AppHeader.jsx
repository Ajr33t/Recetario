import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useThemeStore } from '../../store/themeStore.js';

/**
 * <header> global: logo, buscador global, selector de tema/modo,
 * notificaciones y perfil. Incluye botón de menú para móvil.
 */
export default function AppHeader({ sidebarOpen, onToggleSidebar, onOpenTheme }) {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);

  function handleSearch(event) {
    event.preventDefault();
    const q = query.trim();
    navigate(q ? `/buscar?q=${encodeURIComponent(q)}` : '/buscar');
  }

  // Alterna rápidamente entre los 3 modos (el selector completo abre el modal)
  function toggleMode() {
    const orden = ['claro', 'oscuro', 'alto-contraste'];
    setMode(orden[(orden.indexOf(mode) + 1) % orden.length]);
  }

  const iconoModo =
    mode === 'claro' ? 'fa-sun' : mode === 'oscuro' ? 'fa-moon' : 'fa-circle-half-stroke';

  return (
    <header className="glass sticky top-0 z-50 border-b border-[var(--glass-border)]">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-3 px-4">
        {/* Menú móvil */}
        <button
          type="button"
          className="btn-ghost !px-2.5 md:hidden"
          aria-expanded={sidebarOpen}
          aria-controls="sidebar-principal"
          aria-label={sidebarOpen ? 'Cerrar menú de navegación' : 'Abrir menú de navegación'}
          onClick={onToggleSidebar}
        >
          <i
            className={`fa-solid ${sidebarOpen ? 'fa-xmark' : 'fa-bars'} text-lg`}
            aria-hidden="true"
          />
        </button>

        {/* Logo */}
        <Link
          to="/"
          className="flex items-center gap-2 font-bold"
          aria-label="SazónLab, ir al inicio"
        >
          <span
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground"
            aria-hidden="true"
          >
            <i className="fa-solid fa-utensils" />
          </span>
          <span className="text-lg">
            Sazón<span className="text-primary">Lab</span>
          </span>
        </Link>

        {/* Buscador global (RF-24) */}
        <form
          role="search"
          className="ml-auto hidden max-w-md flex-1 md:flex"
          onSubmit={handleSearch}
        >
          <label htmlFor="buscador-global" className="sr-only">
            Buscar recetas, ingredientes o etiquetas
          </label>
          <div className="relative w-full">
            <i
              className="fa-solid fa-magnifying-glass pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
              aria-hidden="true"
            />
            <input
              id="buscador-global"
              type="search"
              className="field pl-9"
              placeholder="Buscar recetas, ingredientes…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </form>

        <div className="ml-auto flex items-center gap-1.5 md:ml-3">
          {/* Selector de tema/modo (12 × 3) */}
          <button
            type="button"
            className="btn-ghost !px-2.5"
            onClick={onOpenTheme}
            aria-label="Abrir selector de tema y modo"
            title="Elegir tema y modo"
          >
            <i className="fa-solid fa-palette text-lg" aria-hidden="true" />
          </button>

          {/* Modo rápido (alterna claro → oscuro → alto contraste) */}
          <button
            type="button"
            className="btn-ghost !px-2.5"
            onClick={toggleMode}
            aria-label={`Modo actual: ${mode}. Cambiar al siguiente modo`}
            title="Cambiar modo rápido"
          >
            <i className={`fa-solid ${iconoModo} text-lg`} aria-hidden="true" />
          </button>

          {/* Notificaciones (sistema toast en Fase 6) */}
          <button
            type="button"
            className="btn-ghost !px-2.5"
            disabled
            aria-label="Notificaciones (disponible en Fase 6)"
            title="Notificaciones (Fase 6)"
          >
            <i className="fa-solid fa-bell text-lg" aria-hidden="true" />
          </button>

          {/* Perfil */}
          <Link
            to="/login"
            className="btn-secondary !px-3"
            aria-label="Iniciar sesión o ver perfil"
          >
            <i className="fa-solid fa-user" aria-hidden="true" />
            <span className="hidden sm:inline">Ingresar</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
