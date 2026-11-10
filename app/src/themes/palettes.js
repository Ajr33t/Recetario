/**
 * SazónLab — Paletas de los 12 temas × 3 modos (36 combinaciones).
 *
 * - claro / oscuro: paletas explícitas verificadas por scripts/verificar-contraste.mjs
 * - alto-contraste: generado a partir del tono (hue) del tema (WCAG AAA en texto)
 *
 * Formato: todos los colores en hex de 6 dígitos. El motor (themes/engine.js)
 * los convierte a canales RGB para las variables CSS.
 */

/** Convierte #rrggbb → [r, g, b] (0-255). */
export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Convierte [r,g,b] → #rrggbb. */
export function rgbToHex([r, g, b]) {
  const to = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

/** Convierte HSL (h 0-360, s/l 0-100) → #rrggbb. */
export function hslToHex(h, s, l) {
  const sat = s / 100;
  const lig = l / 100;
  const k = (n) => (n + h / 30) % 12;
  const a = sat * Math.min(lig, 1 - lig);
  const f = (n) => lig - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return rgbToHex([f(0) * 255, f(8) * 255, f(4) * 255]);
}

/** Metadatos de los 12 temas (nombres e iconos del IEEE). */
export const THEMES = [
  { id: 'oceano', name: 'Océano', icon: 'fa-water' },
  { id: 'bosque', name: 'Bosque', icon: 'fa-leaf' },
  { id: 'atardecer', name: 'Atardecer', icon: 'fa-sunset' },
  { id: 'lavanda', name: 'Lavanda', icon: 'fa-spa' },
  { id: 'menta', name: 'Menta', icon: 'fa-mug-hot' },
  { id: 'cereza', name: 'Cereza', icon: 'fa-heart' },
  { id: 'ambar', name: 'Ámbar', icon: 'fa-fire' },
  { id: 'ciberpunk', name: 'Ciberpunk', icon: 'fa-bolt' },
  { id: 'sakura', name: 'Sakura', icon: 'fa-fan' },
  { id: 'cafe', name: 'Café', icon: 'fa-mug-saucer' },
  { id: 'aurora', name: 'Aurora', icon: 'fa-snowflake' },
  { id: 'monocromo', name: 'Monocromo', icon: 'fa-circle-half-stroke' },
];

const PALETTES = {
  oceano: {
    hue: 199,
    claro: {
      bg: '#f0f7fb',
      fg: '#0f172a',
      card: '#ffffff',
      cardFg: '#0f172a',
      primary: '#0369a1',
      primaryFg: '#ffffff',
      accent: '#0e7490',
      accentFg: '#ffffff',
      muted: '#e2e8f0',
      mutedFg: '#475569',
      border: '#64748b',
      glass: 'rgba(255,255,255,0.55)',
      glassBorder: 'rgba(255,255,255,0.75)',
      glassFallback: '#eaf3fa',
      glassHighlight: 'rgba(255,255,255,0.35)',
      shadow: '0 8px 32px rgba(15,23,42,0.12)',
      gradient: ['#dff0fb', '#f0f7fb', '#e8ecff'],
    },
    oscuro: {
      bg: '#0b1220',
      fg: '#f1f5f9',
      card: '#111a2c',
      cardFg: '#f1f5f9',
      primary: '#38bdf8',
      primaryFg: '#082f49',
      accent: '#67e8f9',
      accentFg: '#083344',
      muted: '#1e293b',
      mutedFg: '#cbd5e1',
      border: '#334155',
      glass: 'rgba(15,23,42,0.6)',
      glassBorder: 'rgba(148,163,184,0.25)',
      glassFallback: '#111a2c',
      glassHighlight: 'rgba(148,163,184,0.15)',
      shadow: '0 8px 32px rgba(0,0,0,0.45)',
      gradient: ['#0b1220', '#0f172a', '#1e1b4b'],
    },
  },
  bosque: {
    hue: 142,
    claro: {
      bg: '#f0f8f2',
      fg: '#0f1a12',
      card: '#ffffff',
      cardFg: '#0f1a12',
      primary: '#15803d',
      primaryFg: '#ffffff',
      accent: '#4d7c0f',
      accentFg: '#ffffff',
      muted: '#e3ebe4',
      mutedFg: '#475569',
      border: '#64748b',
      glass: 'rgba(255,255,255,0.55)',
      glassBorder: 'rgba(255,255,255,0.75)',
      glassFallback: '#eaf5ec',
      glassHighlight: 'rgba(255,255,255,0.35)',
      shadow: '0 8px 32px rgba(15,32,20,0.12)',
      gradient: ['#dff5e4', '#f0f8f2', '#eef7dd'],
    },
    oscuro: {
      bg: '#0a140d',
      fg: '#f1f5f9',
      card: '#102016',
      cardFg: '#f1f5f9',
      primary: '#4ade80',
      primaryFg: '#052e16',
      accent: '#86efac',
      accentFg: '#052e16',
      muted: '#17251c',
      mutedFg: '#cbd5e1',
      border: '#334155',
      glass: 'rgba(10,20,13,0.6)',
      glassBorder: 'rgba(134,239,172,0.22)',
      glassFallback: '#102016',
      glassHighlight: 'rgba(134,239,172,0.14)',
      shadow: '0 8px 32px rgba(0,0,0,0.45)',
      gradient: ['#0a140d', '#0f1a12', '#12291a'],
    },
  },
  atardecer: {
    hue: 24,
    claro: {
      bg: '#fdf3ec',
      fg: '#1c1108',
      card: '#ffffff',
      cardFg: '#1c1108',
      primary: '#c2410c',
      primaryFg: '#ffffff',
      accent: '#db2777',
      accentFg: '#ffffff',
      muted: '#f0e3d8',
      mutedFg: '#57534e',
      border: '#78716c',
      glass: 'rgba(255,255,255,0.55)',
      glassBorder: 'rgba(255,255,255,0.75)',
      glassFallback: '#fbf0e6',
      glassHighlight: 'rgba(255,255,255,0.35)',
      shadow: '0 8px 32px rgba(40,20,8,0.12)',
      gradient: ['#ffe4cc', '#fdf3ec', '#ffe1ec'],
    },
    oscuro: {
      bg: '#17100a',
      fg: '#faf3ee',
      card: '#221812',
      cardFg: '#faf3ee',
      primary: '#fb923c',
      primaryFg: '#431407',
      accent: '#f472b6',
      accentFg: '#500724',
      muted: '#2b2018',
      mutedFg: '#e7ddd4',
      border: '#4a3f36',
      glass: 'rgba(23,16,10,0.62)',
      glassBorder: 'rgba(251,146,60,0.25)',
      glassFallback: '#221812',
      glassHighlight: 'rgba(251,146,60,0.15)',
      shadow: '0 8px 32px rgba(0,0,0,0.5)',
      gradient: ['#2a1405', '#17100a', '#2b1020'],
    },
  },
  lavanda: {
    hue: 262,
    claro: {
      bg: '#f5f2fd',
      fg: '#171225',
      card: '#ffffff',
      cardFg: '#171225',
      primary: '#6d28d9',
      primaryFg: '#ffffff',
      accent: '#9333ea',
      accentFg: '#ffffff',
      muted: '#ebe7f6',
      mutedFg: '#52525b',
      border: '#64748b',
      glass: 'rgba(255,255,255,0.55)',
      glassBorder: 'rgba(255,255,255,0.75)',
      glassFallback: '#f0ecfb',
      glassHighlight: 'rgba(255,255,255,0.35)',
      shadow: '0 8px 32px rgba(30,20,60,0.12)',
      gradient: ['#e9e1fb', '#f5f2fd', '#fdeaf6'],
    },
    oscuro: {
      bg: '#12101d',
      fg: '#f4f2fa',
      card: '#1b1830',
      cardFg: '#f4f2fa',
      primary: '#a78bfa',
      primaryFg: '#2e1065',
      accent: '#d8b4fe',
      accentFg: '#3b0764',
      muted: '#252138',
      mutedFg: '#d5d0e6',
      border: '#3d3757',
      glass: 'rgba(18,16,29,0.62)',
      glassBorder: 'rgba(167,139,250,0.25)',
      glassFallback: '#1b1830',
      glassHighlight: 'rgba(167,139,250,0.15)',
      shadow: '0 8px 32px rgba(0,0,0,0.5)',
      gradient: ['#12101d', '#1b1830', '#2a1440'],
    },
  },
  menta: {
    hue: 166,
    claro: {
      bg: '#effaf7',
      fg: '#0c1a17',
      card: '#ffffff',
      cardFg: '#0c1a17',
      primary: '#0f766e',
      primaryFg: '#ffffff',
      accent: '#14b8a6',
      accentFg: '#042f2e',
      muted: '#e2f0ec',
      mutedFg: '#475569',
      border: '#64748b',
      glass: 'rgba(255,255,255,0.55)',
      glassBorder: 'rgba(255,255,255,0.75)',
      glassFallback: '#e7f6f2',
      glassHighlight: 'rgba(255,255,255,0.35)',
      shadow: '0 8px 32px rgba(8,40,34,0.12)',
      gradient: ['#d8f5ee', '#effaf7', '#e0f2fe'],
    },
    oscuro: {
      bg: '#071411',
      fg: '#eefaf6',
      card: '#0e211c',
      cardFg: '#eefaf6',
      primary: '#2dd4bf',
      primaryFg: '#042f2e',
      accent: '#5eead4',
      accentFg: '#042f2e',
      muted: '#16302a',
      mutedFg: '#cfe8e1',
      border: '#2f4a43',
      glass: 'rgba(7,20,17,0.62)',
      glassBorder: 'rgba(94,234,212,0.25)',
      glassFallback: '#0e211c',
      glassHighlight: 'rgba(94,234,212,0.15)',
      shadow: '0 8px 32px rgba(0,0,0,0.5)',
      gradient: ['#071411', '#0e211c', '#0b2a33'],
    },
  },
  cereza: {
    hue: 350,
    claro: {
      bg: '#fdf1f4',
      fg: '#1f0f14',
      card: '#ffffff',
      cardFg: '#1f0f14',
      primary: '#be123c',
      primaryFg: '#ffffff',
      accent: '#e11d48',
      accentFg: '#ffffff',
      muted: '#f6e3e8',
      mutedFg: '#57534e',
      border: '#73606a',
      glass: 'rgba(255,255,255,0.55)',
      glassBorder: 'rgba(255,255,255,0.75)',
      glassFallback: '#fbe9ee',
      glassHighlight: 'rgba(255,255,255,0.35)',
      shadow: '0 8px 32px rgba(60,10,25,0.12)',
      gradient: ['#fbdde5', '#fdf1f4', '#fce7f3'],
    },
    oscuro: {
      bg: '#170a0f',
      fg: '#faf0f3',
      card: '#25121a',
      cardFg: '#faf0f3',
      primary: '#fb7185',
      primaryFg: '#4c0519',
      accent: '#fda4af',
      accentFg: '#4c0519',
      muted: '#2e1a21',
      mutedFg: '#ecd7dd',
      border: '#4a3038',
      glass: 'rgba(23,10,15,0.62)',
      glassBorder: 'rgba(251,113,133,0.25)',
      glassFallback: '#25121a',
      glassHighlight: 'rgba(251,113,133,0.15)',
      shadow: '0 8px 32px rgba(0,0,0,0.5)',
      gradient: ['#170a0f', '#25121a', '#33101f'],
    },
  },
  // __PARTE2__
};

/** Genera la variante alto-contraste (AAA) a partir del tono del tema. */
function buildHc(themeId) {
  const hue = PALETTES[themeId].hue;
  const sat = themeId === 'monocromo' ? 0 : 45;
  const bg = hslToHex(hue, sat, 4);
  const card = hslToHex(hue, sat, 8);
  const mutedHc = hslToHex(hue, sat, 14);
  const primaryHc = hslToHex(hue, 100, 75);
  const accentHc = hslToHex(hue, 100, 85);
  return {
    bg,
    fg: '#ffffff',
    card,
    cardFg: '#ffffff',
    primary: primaryHc,
    primaryFg: '#000000',
    accent: accentHc,
    accentFg: '#000000',
    muted: mutedHc,
    mutedFg: '#ffffff',
    border: '#ffffff',
    glass: `${bg}f2`,
    glassBorder: '#ffffff',
    glassFallback: card,
    glassHighlight: 'rgba(255,255,255,0.2)',
    shadow: '0 8px 32px rgba(0,0,0,0.9)',
    gradient: [bg, card, mutedHc],
  };
}

/** Devuelve la paleta resuelta de un tema/modo (todos los valores en hex). */
export function getPalette(themeId, mode) {
  const base = PALETTES[themeId] || PALETTES.oceano;
  if (mode === 'alto-contraste') return buildHc(themeId in PALETTES ? themeId : 'oceano');
  return base[mode] || base.claro;
}

/**
 * Construye las variables CSS de un tema/modo.
 * @returns {{ css: string, colors: Record<string, string> }} css listo para
 * inyectar en <style> y los colores en hex (para verificación de contraste).
 */
export function buildThemeVars(themeId, mode) {
  const p = getPalette(themeId, mode);
  const dark = mode === 'oscuro' || mode === 'alto-contraste';
  const rgb = (hex) => hexToRgb(hex).join(' ');
  const css = `
:root {
  color-scheme: ${dark ? 'dark' : 'light'};
  --background: ${rgb(p.bg)};
  --foreground: ${rgb(p.fg)};
  --card: ${rgb(p.card)};
  --card-foreground: ${rgb(p.cardFg)};
  --primary: ${rgb(p.primary)};
  --primary-foreground: ${rgb(p.primaryFg)};
  --accent: ${rgb(p.accent)};
  --accent-foreground: ${rgb(p.accentFg)};
  --muted: ${rgb(p.muted)};
  --muted-foreground: ${rgb(p.mutedFg)};
  --border: ${rgb(p.border)};
  --danger: ${rgb(dark ? '#f87171' : '#b91c1c')};
  --danger-foreground: ${rgb(dark ? '#450a0a' : '#ffffff')};
  --success: ${rgb(dark ? '#4ade80' : '#15803d')};
  --success-foreground: ${rgb(dark ? '#052e16' : '#ffffff')};
  --glass: ${p.glass};
  --glass-border: ${p.glassBorder};
  --glass-fallback: ${rgb(p.glassFallback)};
  --glass-highlight: ${p.glassHighlight};
  --shadow-glass: ${p.shadow};
  --radius: 1rem;
  --background-gradient: linear-gradient(135deg, ${p.gradient[0]} 0%, ${p.gradient[1]} 45%, ${p.gradient[2]} 100%);
}`;

  return {
    css,
    colors: {
      bg: p.bg,
      fg: p.fg,
      card: p.card,
      cardFg: p.cardFg,
      primary: p.primary,
      primaryFg: p.primaryFg,
      accent: p.accent,
      accentFg: p.accentFg,
      muted: p.muted,
      mutedFg: p.mutedFg,
      border: p.border,
      dark: dark ? '1' : '0',
    },
  };
}
