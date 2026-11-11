import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useThemeStore } from '../../store/themeStore.js';
import { useAuthStore } from '../../store/authStore.js';

/**
 * <header> global: logo, buscador global, selector de tema/modo,
 * notificaciones y perfil. Incluye botón de menú para móvil.
 */
export default function AppHeader({ sidebarOpen, onToggleSidebar, onOpenTheme }) {
  const [query, setQuery] = useState('');
  const [perfilAbierto, setPerfilAbierto] = useState(false);
  const navigate = useNavigate();
  const mode = useThemeStore((s) => s.mode);
  const highContrast = useThemeStore((s) => s.highContrast);
  const setMode = useThemeStore((s) => s.setMode);
  const setHighContrast = useThemeStore((s) => s.setHighContrast);
  const usuario = useAuthStore((s) => s.usuario);
  const logout = useAuthStore((s) => s.logout);

  function handleSearch(event) {
    event.preventDefault();
    const q = query.trim();
    navigate(q ? `/buscar?q=${encodeURIComponent(q)}` : '/buscar');
  }

  // Toggle rápido: solo claro ↔ oscuro. Si el alto contraste (interruptor
  // aparte) está activo, el primer clic lo desactiva y muestra el modo actual.
  function toggleMode() {
    if (highContrast) {
      setHighContrast(false);
      return;
    }
    setMode(mode === 'claro' ? 'oscuro' : 'claro');
  }

  // Aspecto efectivo: el alto contraste prevalece sobre el modo
  const efectivo = highContrast ? 'alto-contraste' : mode;
  const iconoModo =
    efectivo === 'claro' ? 'fa-sun' : efectivo === 'oscuro' ? 'fa-moon' : 'fa-circle-half-stroke';

  return (
    <header className="glass no-print sticky top-0 z-50 border-b border-[var(--glass-border)]">
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

          {/* Modo rápido (claro ↔ oscuro; desactiva alto contraste si está activo) */}
          <button
            type="button"
            className="btn-ghost !px-2.5"
            onClick={toggleMode}
            aria-label={
              highContrast
                ? 'Alto contraste activo. Desactivarlo para volver al modo claro/oscuro'
                : `Modo actual: ${mode}. Cambiar a modo ${mode === 'claro' ? 'oscuro' : 'claro'}`
            }
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

          {/* Perfil: invitado → Iniciar sesión; con sesión → menú de cuenta */}
          {usuario ? (
            <div className="relative">
              <button
                type="button"
                className="btn-secondary !px-3"
                onClick={() => setPerfilAbierto((abierto) => !abierto)}
                aria-expanded={perfilAbierto}
                aria-haspopup="menu"
                aria-label={`Menú de cuenta de ${usuario.nombre}`}
              >
                <i className="fa-solid fa-circle-user" aria-hidden="true" />
                <span className="hidden sm:inline">{usuario.nombre}</span>
                <i className="fa-solid fa-chevron-down text-xs" aria-hidden="true" />
              </button>

              {perfilAbierto && (
                <>
                  {/* Cierra el menú al pulsar fuera */}
                  <button
                    type="button"
                    className="fixed inset-0 z-40 cursor-default"
                    aria-label="Cerrar menú de cuenta"
                    onClick={() => setPerfilAbierto(false)}
                  />
                  <div
                    role="menu"
                    className="glass absolute right-0 z-50 mt-2 w-56 rounded-xl p-3 text-sm"
                  >
                    <p className="font-semibold">{usuario.nombre}</p>
                    <p className="truncate text-xs text-muted-foreground">{usuario.correo}</p>
                    <hr className="my-2 border-border" />
                    <button
                      type="button"
                      role="menuitem"
                      className="nav-link w-full"
                      onClick={() => {
                        setPerfilAbierto(false);
                        navigate('/mis-recetas');
                      }}
                    >
                      <i className="fa-solid fa-book-open w-5 text-center" aria-hidden="true" />
                      Mis recetas
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      className="nav-link w-full !text-danger"
                      onClick={() => {
                        setPerfilAbierto(false);
                        logout();
                        navigate('/', { replace: true });
                      }}
                    >
                      <i
                        className="fa-solid fa-right-from-bracket w-5 text-center"
                        aria-hidden="true"
                      />
                      Cerrar sesión
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Link
              to="/login"
              className="btn-secondary !px-3"
              aria-label="Iniciar sesión o ver perfil"
            >
              <i className="fa-solid fa-user" aria-hidden="true" />
              <span className="hidden sm:inline">Ingresar</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
