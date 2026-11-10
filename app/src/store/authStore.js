import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Sesión del usuario (Fase 3 — JWT).
 * - token: JWT guardado también en localStorage por el cliente API.
 * - usuario: { id, nombre, correo, rol } sin contraseña.
 * Persiste en 'sazonlab-auth' para que la sesión sobreviva a recargas;
 * al cerrar sesión se limpia. En otros dispositivos basta iniciar sesión:
 * las recetas viven en el servidor, no en el navegador.
 */
export const useAuthStore = create(
  persist(
    (set) => ({
      token: null,
      usuario: null,
      setAuth: ({ token, usuario }) => set({ token, usuario }),
      logout: () => set({ token: null, usuario: null }),
    }),
    { name: 'sazonlab-auth' },
  ),
);
