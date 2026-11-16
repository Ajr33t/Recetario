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
  const to = (v) =>
    Math.max(0, Math.min(255, Math.round(v)))
      .toString(16)
      .padStart(2, '0');
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
  ambar: {
    hue: 38,
    claro: {
      bg: '#fdf8ee',
      fg: '#1e1506',
      card: '#ffffff',
      cardFg: '#1e1506',
      primary: '#b45309',
      primaryFg: '#ffffff',
      accent: '#a16207',
      accentFg: '#ffffff',
      muted: '#f3ead6',
      mutedFg: '#57534e',
      border: '#6f6250',
      glass: 'rgba(255,255,255,0.55)',
      glassBorder: 'rgba(255,255,255,0.75)',
      glassFallback: '#fbf3e2',
      glassHighlight: 'rgba(255,255,255,0.35)',
      shadow: '0 8px 32px rgba(50,35,8,0.12)',
      gradient: ['#fdeecb', '#fdf8ee', '#fbe7d2'],
    },
    oscuro: {
      bg: '#161005',
      fg: '#f9f4e9',
      card: '#241a0b',
      cardFg: '#f9f4e9',
      primary: '#fbbf24',
      primaryFg: '#451a03',
      accent: '#fcd34d',
      accentFg: '#451a03',
      muted: '#2c2413',
      mutedFg: '#e9dfc5',
      border: '#4d4021',
      glass: 'rgba(22,16,5,0.62)',
      glassBorder: 'rgba(251,191,36,0.25)',
      glassFallback: '#241a0b',
      glassHighlight: 'rgba(251,191,36,0.15)',
      shadow: '0 8px 32px rgba(0,0,0,0.5)',
      gradient: ['#161005', '#241a0b', '#2e2008'],
    },
  },
  ciberpunk: {
    hue: 300,
    claro: {
      bg: '#f4f0fa',
      fg: '#14101f',
      card: '#ffffff',
      cardFg: '#14101f',
      primary: '#a21caf',
      primaryFg: '#ffffff',
      accent: '#0e7490',
      accentFg: '#ffffff',
      muted: '#e9e4f2',
      mutedFg: '#4a4458',
      border: '#625a75',
      glass: 'rgba(255,255,255,0.55)',
      glassBorder: 'rgba(255,255,255,0.75)',
      glassFallback: '#efeaf7',
      glassHighlight: 'rgba(255,255,255,0.35)',
      shadow: '0 8px 32px rgba(30,10,60,0.14)',
      gradient: ['#efe4fb', '#f4f0fa', '#e0f4ff'],
    },
    oscuro: {
      bg: '#0a0a14',
      fg: '#f2f0ff',
      card: '#14142a',
      cardFg: '#f2f0ff',
      primary: '#22d3ee',
      primaryFg: '#083344',
      accent: '#e879f9',
      accentFg: '#4a044e',
      muted: '#1d1d38',
      mutedFg: '#cdc9e6',
      border: '#38385c',
      glass: 'rgba(10,10,20,0.65)',
      glassBorder: 'rgba(34,211,238,0.3)',
      glassFallback: '#14142a',
      glassHighlight: 'rgba(34,211,238,0.16)',
      shadow: '0 8px 32px rgba(0,0,0,0.55)',
      gradient: ['#0a0a14', '#14142a', '#20103a'],
    },
  },
  sakura: {
    hue: 340,
    claro: {
      bg: '#fdf3f7',
      fg: '#1f1017',
      card: '#ffffff',
      cardFg: '#1f1017',
      primary: '#be185d',
      primaryFg: '#ffffff',
      accent: '#db2777',
      accentFg: '#ffffff',
      muted: '#f7e5ed',
      mutedFg: '#57534e',
      border: '#7a5c69',
      glass: 'rgba(255,255,255,0.55)',
      glassBorder: 'rgba(255,255,255,0.75)',
      glassFallback: '#fbeaf1',
      glassHighlight: 'rgba(255,255,255,0.35)',
      shadow: '0 8px 32px rgba(60,15,40,0.12)',
      gradient: ['#fbdce9', '#fdf3f7', '#ffe4ef'],
    },
    oscuro: {
      bg: '#170d13',
      fg: '#faf1f5',
      card: '#25151f',
      cardFg: '#faf1f5',
      primary: '#f9a8d4',
      primaryFg: '#500724',
      accent: '#fbcfe8',
      accentFg: '#500724',
      muted: '#2f1c27',
      mutedFg: '#ead3de',
      border: '#4d3342',
      glass: 'rgba(23,13,19,0.62)',
      glassBorder: 'rgba(249,168,212,0.25)',
      glassFallback: '#25151f',
      glassHighlight: 'rgba(249,168,212,0.15)',
      shadow: '0 8px 32px rgba(0,0,0,0.5)',
      gradient: ['#170d13', '#25151f', '#3a1030'],
    },
  },
  cafe: {
    hue: 26,
    claro: {
      bg: '#f7f2ec',
      fg: '#1c140c',
      card: '#ffffff',
      cardFg: '#1c140c',
      primary: '#78350f',
      primaryFg: '#ffffff',
      accent: '#92400e',
      accentFg: '#ffffff',
      muted: '#ece2d6',
      mutedFg: '#57534e',
      border: '#6b5d4f',
      glass: 'rgba(255,255,255,0.55)',
      glassBorder: 'rgba(255,255,255,0.75)',
      glassFallback: '#f3ebe1',
      glassHighlight: 'rgba(255,255,255,0.35)',
      shadow: '0 8px 32px rgba(45,30,15,0.12)',
      gradient: ['#efe1d0', '#f7f2ec', '#f3e8d8'],
    },
    oscuro: {
      bg: '#14100b',
      fg: '#f6f1ea',
      card: '#201912',
      cardFg: '#f6f1ea',
      primary: '#e6b98a',
      primaryFg: '#3b1f0b',
      accent: '#d9a066',
      accentFg: '#3b1f0b',
      muted: '#2a2118',
      mutedFg: '#e3d8c8',
      border: '#463a2c',
      glass: 'rgba(20,16,11,0.62)',
      glassBorder: 'rgba(230,185,138,0.25)',
      glassFallback: '#201912',
      glassHighlight: 'rgba(230,185,138,0.15)',
      shadow: '0 8px 32px rgba(0,0,0,0.5)',
      gradient: ['#14100b', '#201912', '#2b2014'],
    },
  },
  aurora: {
    hue: 175,
    claro: {
      bg: '#eff9fb',
      fg: '#0c1a1f',
      card: '#ffffff',
      cardFg: '#0c1a1f',
      primary: '#0e7490',
      primaryFg: '#ffffff',
      accent: '#7c3aed',
      accentFg: '#ffffff',
      muted: '#e1eff3',
      mutedFg: '#475569',
      border: '#64748b',
      glass: 'rgba(255,255,255,0.55)',
      glassBorder: 'rgba(255,255,255,0.75)',
      glassFallback: '#e7f5f8',
      glassHighlight: 'rgba(255,255,255,0.35)',
      shadow: '0 8px 32px rgba(8,40,50,0.12)',
      gradient: ['#d9f3f7', '#eff9fb', '#e7e0ff'],
    },
    oscuro: {
      bg: '#08131a',
      fg: '#eef9fc',
      card: '#0f2029',
      cardFg: '#eef9fc',
      primary: '#67e8f9',
      primaryFg: '#164e63',
      accent: '#a78bfa',
      accentFg: '#2e1065',
      muted: '#172b33',
      mutedFg: '#cfe6ee',
      border: '#2c4650',
      glass: 'rgba(8,19,26,0.62)',
      glassBorder: 'rgba(103,232,249,0.25)',
      glassFallback: '#0f2029',
      glassHighlight: 'rgba(103,232,249,0.15)',
      shadow: '0 8px 32px rgba(0,0,0,0.5)',
      gradient: ['#08131a', '#0f2029', '#161440'],
    },
  },
  monocromo: {
    hue: 0,
    claro: {
      bg: '#f4f4f5',
      fg: '#18181b',
      card: '#ffffff',
      cardFg: '#18181b',
      primary: '#3f3f46',
      primaryFg: '#ffffff',
      accent: '#52525b',
      accentFg: '#ffffff',
      muted: '#e4e4e7',
      mutedFg: '#52525b',
      border: '#71717a',
      glass: 'rgba(255,255,255,0.55)',
      glassBorder: 'rgba(255,255,255,0.75)',
      glassFallback: '#ececee',
      glassHighlight: 'rgba(255,255,255,0.35)',
      shadow: '0 8px 32px rgba(24,24,27,0.12)',
      gradient: ['#e9e9ec', '#f4f4f5', '#e4e4e7'],
    },
    oscuro: {
      bg: '#101012',
      fg: '#f4f4f5',
      card: '#1a1a1d',
      cardFg: '#f4f4f5',
      primary: '#e4e4e7',
      primaryFg: '#18181b',
      accent: '#a1a1aa',
      accentFg: '#18181b',
      muted: '#27272a',
      mutedFg: '#d4d4d8',
      border: '#3f3f46',
      glass: 'rgba(16,16,18,0.65)',
      glassBorder: 'rgba(228,228,231,0.25)',
      glassFallback: '#1a1a1d',
      glassHighlight: 'rgba(228,228,231,0.15)',
      shadow: '0 8px 32px rgba(0,0,0,0.55)',
      gradient: ['#101012', '#1a1a1d', '#232326'],
    },
  },
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
  // Selector con especificidad 0-1-2: gana siempre a :root y [data-mode]
  // de index.css, sin importar el orden de inyección del CSS (dev vs prod).
  const css = `
html[data-theme][data-mode] {
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
