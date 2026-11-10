import { NavLink } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/', label: 'Inicio', icon: 'fa-house' },
  { to: '/buscar', label: 'Buscar por ingredientes', icon: 'fa-magnifying-glass' },
  { to: '/mis-recetas', label: 'Mis recetas', icon: 'fa-book-open' },
  { to: '/favoritos', label: 'Favoritos', icon: 'fa-heart' },
  { to: '/ajustes', label: 'Ajustes', icon: 'fa-gear' },
];

/**
 * <aside> con navegación principal (<nav> con aria-label).
 * En móvil se muestra como panel superpuesto; en desktop, estático.
 */
export default function AppSidebar({ open, onClose }) {
  return (
    <>
      {/* Fondo superpuesto (solo móvil) */}
      {open && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          aria-label="Cerrar menú de navegación"
          onClick={onClose}
        />
      )}

      <aside
        id="sidebar-principal"
        aria-label="Navegación lateral"
        className={`fixed inset-y-0 left-0 z-40 w-64 transform overflow-y-auto px-4 pb-6 pt-20 transition-transform duration-200 md:static md:z-auto md:block md:w-56 md:shrink-0 md:translate-x-0 md:overflow-visible md:px-0 md:pt-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <nav aria-label="Navegación principal" className="glass-panel flex flex-col gap-1 p-3">
          <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Menú
          </p>
          {NAV_ITEMS.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={onClose}
              className={({ isActive }) => (isActive ? 'nav-link-active' : 'nav-link')}
            >
              <i className={`fa-solid ${icon} w-5 text-center`} aria-hidden="true" />
              {label}
            </NavLink>
          ))}

          <hr className="my-2 border-border" />

          <NavLink
            to="/login"
            onClick={onClose}
            className={({ isActive }) => (isActive ? 'nav-link-active' : 'nav-link')}
          >
            <i className="fa-solid fa-right-to-bracket w-5 text-center" aria-hidden="true" />
            Iniciar sesión
          </NavLink>
        </nav>
      </aside>
    </>
  );
}
