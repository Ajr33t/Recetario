import { buildThemeVars, THEMES } from './palettes.js';

const STYLE_ID = 'theme-vars';

/**
 * Aplica tema + modo inyectando las variables CSS en <style id="theme-vars">
 * y marcando los atributos en <html> (data-theme / data-mode).
 * Idempotente: reutiliza el mismo nodo <style> en cada cambio.
 * @param {string} themeId id del tema (12 disponibles)
 * @param {'claro'|'oscuro'|'alto-contraste'} mode modo de apariencia
 */
export function applyTheme(themeId, mode) {
  const { css } = buildThemeVars(themeId, mode);

  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement('style');
    style.id = STYLE_ID;
    document.head.appendChild(style);
  }
  style.textContent = css;

  document.documentElement.dataset.theme = themeId;
  document.documentElement.dataset.mode = mode;

  // Color de la barra del navegador coherente con el tema (meta theme-color)
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    const bg = buildThemeVars(themeId, mode).colors.bg;
    meta.setAttribute('content', bg);
  }
}

/** Devuelve los metadatos de los 12 temas (id, nombre, icono). */
export function listThemes() {
  return THEMES;
}
