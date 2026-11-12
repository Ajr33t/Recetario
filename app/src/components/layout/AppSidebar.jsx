import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore.js';

// Menú completo: disponible cuando hay sesión iniciada
const NAV_ITEMS_SESION = [
  { to: '/', label: 'Inicio', icon: 'fa-house' },
  { to: '/buscar', label: 'Buscar por ingredientes', icon: 'fa-magnifying-glass' },
  { to: '/mis-recetas', label: 'Mis recetas', icon: 'fa-book-open' },
  { to: '/favoritos', label: 'Favoritos', icon: 'fa-heart' },
  { to: '/perfil', label: 'Mi perfil', icon: 'fa-user-pen' },
  { to: '/ajustes', label: 'Ajustes', icon: 'fa-gear' },
];

// Menú de invitado: solo lo esencial (inicio, ajustes y acceso)
const NAV_ITEMS_INVITADO = [
  { to: '/', label: 'Inicio', icon: 'fa-house' },
  { to: '/ajustes', label: 'Ajustes', icon: 'fa-gear' },
];

// Extra del administrador (RF-22): solo se muestra con rol 'admin'
const NAV_ITEM_ADMIN = { to: '/admin', label: 'Administración', icon: 'fa-user-shield' };

/**
 * <aside> con navegación principal (<nav> con aria-label).
 * - Sin sesión: solo Inicio, Ajustes e Iniciar sesión.
 * - Con sesión: se desbloquean Buscar, Mis recetas y Favoritos.
 * En móvil se muestra como panel superpuesto; en desktop, estático.
 */
export default function AppSidebar({ open, onClose }) {
  const usuario = useAuthStore((s) => s.usuario);
  const items = usuario
    ? usuario.rol === 'admin'
      ? [...NAV_ITEMS_SESION, NAV_ITEM_ADMIN]
      : NAV_ITEMS_SESION
    : NAV_ITEMS_INVITADO;

  return (
    <>
      {/* Fondo superpuesto (solo móvil) */}
      {open && (
        <button
          type="button"
          className="no-print fixed inset-0 z-30 bg-black/40 md:hidden"
          aria-label="Cerrar menú de navegación"
          onClick={onClose}
        />
      )}

      <aside
        id="sidebar-principal"
        aria-label="Navegación lateral"
        className={`no-print fixed inset-y-0 left-0 z-40 w-64 transform overflow-y-auto px-4 pb-6 pt-20 transition-transform duration-200 md:static md:z-auto md:block md:w-56 md:shrink-0 md:translate-x-0 md:overflow-visible md:px-0 md:pt-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <nav aria-label="Navegación principal" className="glass-panel flex flex-col gap-1 p-3">
          <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {usuario ? 'Menú' : 'Invitado'}
          </p>
          {items.map(({ to, label, icon }) => (
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

          {!usuario && (
            <>
              <hr className="my-2 border-border" />
              <NavLink
                to="/login"
                onClick={onClose}
                className={({ isActive }) => (isActive ? 'nav-link-active' : 'nav-link')}
              >
                <i className="fa-solid fa-right-to-bracket w-5 text-center" aria-hidden="true" />
                Iniciar sesión
              </NavLink>
            </>
          )}

          {usuario && (
            <p className="mt-2 px-3 text-xs text-muted-foreground">
              <i className="fa-solid fa-cloud-arrow-up text-primary" aria-hidden="true" />{' '}
              Sincronizado con tu cuenta
            </p>
          )}
        </nav>
      </aside>
    </>
  );
}
