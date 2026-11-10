import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { applyTheme } from '../themes/engine.js';

/**
 * Preferencias visuales del usuario.
 * - theme: id del tema (12 disponibles)
 * - mode: 'claro' | 'oscuro' | 'alto-contraste' (3 modos)
 * Persistencia: localStorage en web; en Electron se replica vía
 * archivo de configuración en la Fase 8.
 *
 * Al crear el store se aplica el tema hidratado de inmediato
 * (evita el flash de tema incorrecto antes del primer render).
 */
export const useThemeStore = create(
  persist(
    (set) => ({
      theme: 'oceano',
      mode: 'claro',
      setTheme: (theme) => {
        const { mode } = useThemeStore.getState();
        applyTheme(theme, mode);
        set({ theme });
      },
      setMode: (mode) => {
        const { theme } = useThemeStore.getState();
        applyTheme(theme, mode);
        set({ mode });
      },
    }),
    {
      name: 'sazonlab-preferencias',
      onRehydrateStorage: () => (state) => {
        // Se ejecuta tras hidratar desde localStorage: aplica sin parpadeo.
        if (state) applyTheme(state.theme, state.mode);
      },
    },
  ),
);

// Aplicación inicial (por si onRehydrateStorage no se dispara: primera visita).
const inicial = useThemeStore.getState();
applyTheme(inicial.theme, inicial.mode);
