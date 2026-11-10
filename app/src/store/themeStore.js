import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Preferencias visuales del usuario.
 * - theme: id del tema (12 disponibles desde la Fase 2)
 * - mode: 'claro' | 'oscuro' | 'alto-contraste' (3 modos)
 * Persistencia: localStorage en web; en Electron se replica vía
 * archivo de configuración en la Fase 8.
 */
export const useThemeStore = create(
  persist(
    (set) => ({
      theme: 'oceano',
      mode: 'claro',
      setTheme: (theme) => set({ theme }),
      setMode: (mode) => set({ mode }),
    }),
    { name: 'sazonlab-preferencias' },
  ),
);
