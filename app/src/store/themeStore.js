import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { applyTheme, applyA11y } from '../themes/engine.js';

/**
 * Preferencias visuales del usuario:
 * - theme: id del tema (12 disponibles)
 * - mode: 'claro' | 'oscuro' (los 2 modos base)
 * - highContrast: interruptor INDEPENDIENTE; activo prevalece sobre el modo
 * - a11y: { fontSize, reduceMotion, dyslexia, underlineLinks }
 * Persistencia: localStorage en web; en Electron se replica vía
 * archivo de configuración en la Fase 8.
 *
 * Al crear el store se aplican tema + accesibilidad hidratados de inmediato
 * (evita el flash de tema incorrecto antes del primer render).
 */

const A11Y_POR_DEFECTO = {
  fontSize: 'normal', // 'normal' | 'grande' | 'extra'
  reduceMotion: false,
  dyslexia: false,
  underlineLinks: false,
};

/** Aplica tema + modo + alto contraste + accesibilidad juntos. */
function aplicar(preferencias) {
  const { theme, mode, highContrast, a11y } = preferencias;
  applyTheme(theme, mode, highContrast);
  applyA11y(a11y);
}

export const useThemeStore = create(
  persist(
    (set) => ({
      theme: 'oceano',
      mode: 'claro',
      highContrast: false,
      a11y: { ...A11Y_POR_DEFECTO },

      setTheme: (theme) => {
        const actual = useThemeStore.getState();
        const siguiente = { ...actual, theme };
        aplicar(siguiente);
        set({ theme });
      },

      setMode: (mode) => {
        const actual = useThemeStore.getState();
        aplicar({ ...actual, mode });
        set({ mode });
      },

      setHighContrast: (highContrast) => {
        const actual = useThemeStore.getState();
        aplicar({ ...actual, highContrast });
        set({ highContrast });
      },

      /** Actualiza una o varias claves de a11y ({ dyslexia: true }). */
      setA11y: (parcial) => {
        const actual = useThemeStore.getState();
        const a11y = { ...actual.a11y, ...parcial };
        aplicar({ ...actual, a11y });
        set({ a11y });
      },
    }),
    {
      name: 'sazonlab-preferencias',
      // Migración: antes 'alto-contraste' era un 3er modo; ahora es el
      // interruptor independiente highContrast (el modo vuelve a claro/oscuro).
      // zustand pasa a merge() el estado interno ({...}) — se tolera también
      // el formato envoltorio {state, version} por si cambia.
      merge: (persistido, actual) => {
        const p =
          (persistido && typeof persistido === 'object' && persistido.state
            ? persistido.state
            : persistido) || {};
        const s = { ...actual, ...p };
        s.mode = p.mode === 'oscuro' ? 'oscuro' : 'claro';
        s.highContrast = Boolean(p.highContrast || p.mode === 'alto-contraste');
        s.a11y = { ...A11Y_POR_DEFECTO, ...(p.a11y || {}) };
        return s;
      },
      onRehydrateStorage: () => (state) => {
        // Se ejecuta tras hidratar desde localStorage: aplica sin parpadeo.
        if (state) aplicar(state);
      },
    },
  ),
);

// Aplicación inicial (por si onRehydrateStorage no se dispara: primera visita).
aplicar(useThemeStore.getState());
