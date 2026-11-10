import { buildThemeVars, THEMES } from './palettes.js';

const STYLE_ID = 'theme-vars';

/**
 * Aplica tema + modo + alto contraste inyectando las variables CSS en
 * <style id="theme-vars"> y marcando los atributos en <html>.
 * - mode: 'claro' | 'oscuro'
 * - highContrast: interruptor independiente; si está activo prevalece
 *   sobre el modo (estado visual "alto-contraste", AAA).
 * Idempotente: reutiliza el mismo nodo <style> en cada cambio.
 */
export function applyTheme(themeId, mode, highContrast = false) {
  const efectivo = highContrast ? 'alto-contraste' : mode === 'oscuro' ? 'oscuro' : 'claro';
  const { css, colors } = buildThemeVars(themeId, efectivo);

  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement('style');
    style.id = STYLE_ID;
    document.head.appendChild(style);
  }
  style.textContent = css;

  document.documentElement.dataset.theme = themeId;
  document.documentElement.dataset.mode = efectivo;

  // Color de la barra del navegador coherente con el tema (meta theme-color)
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', colors.bg);
}

/**
 * Aplica las preferencias de accesibilidad como atributos en <html>
 * (las reglas CSS viven en styles/index.css).
 */
export function applyA11y(a11y = {}) {
  const html = document.documentElement;
  html.dataset.fontSize = a11y.fontSize || 'normal';
  html.dataset.reduceMotion = String(Boolean(a11y.reduceMotion));
  html.dataset.dyslexia = String(Boolean(a11y.dyslexia));
  html.dataset.underlineLinks = String(Boolean(a11y.underlineLinks));
}

/** Devuelve los metadatos de los 12 temas (id, nombre, icono). */
export function listThemes() {
  return THEMES;
}
