/**
 * Verificación de temas + accesibilidad en vivo: comprueba en el servidor DEV
 * (localhost:5173) que se aplican de verdad (computed style / atributos):
 *  - tema + modo claro/oscuro
 *  - interruptor INDEPENDIENTE de alto contraste (prevalece sobre el modo)
 *  - panel de accesibilidad (dislexia, subrayar enlaces, tamaño de fuente…)
 * Requisito: `npm run dev:app` corriendo. Uso: npm run verificar:temas
 */
const { app, BrowserWindow } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');

app.disableHardwareAcceleration();
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

// Cada combo guarda el estado tal cual lo haría la app en localStorage.
const COMBOS = [
  { label: 'cereza/oscuro', state: { theme: 'cereza', mode: 'oscuro' } },
  {
    label: 'bosque/alto-contraste (interruptor aparte)',
    state: { theme: 'bosque', mode: 'oscuro', highContrast: true },
  },
  { label: 'monocromo/claro', state: { theme: 'monocromo', mode: 'claro' } },
  { label: 'oceano/claro + dislexia + fuentes', state: { theme: 'oceano', mode: 'claro' } },
];

const hexToRgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
};

app.whenReady().then(async () => {
  const { getPalette } = await import(
    pathToFileURL(path.join(__dirname, '../app/src/themes/palettes.js')).href
  );
  const win = new BrowserWindow({
    width: 1100,
    height: 700,
    show: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });

  let fallos = 0;

  const cargar = async (state, extra = '') => {
    await win.loadURL('http://localhost:5173/');
    await dormir(800);
    await win.webContents.executeJavaScript(`
      localStorage.setItem('sazonlab-preferencias',
        JSON.stringify({ state: ${JSON.stringify({ ...state, ...extra })}, version: 0 }));
      location.reload(); true;`);
    await dormir(1500);
  };

  const leer = () =>
    win.webContents.executeJavaScript(`(() => ({
      bg: getComputedStyle(document.body).backgroundColor,
      fg: getComputedStyle(document.body).color,
      theme: document.documentElement.dataset.theme,
      mode: document.documentElement.dataset.mode,
      fontSize: document.documentElement.dataset.fontSize,
      dyslexia: document.documentElement.dataset.dyslexia,
      underline: document.documentElement.dataset.underlineLinks,
      vars: (document.getElementById('theme-vars') || {}).textContent?.length || 0,
      glassBlur: getComputedStyle(document.querySelector('.glass') || document.body).backdropFilter,
      bodyFont: getComputedStyle(document.body).fontFamily,
      linkUnderline: (() => {
        const a = document.querySelector('main a, a');
        return a ? getComputedStyle(a).textDecorationLine : 'ninguno';
      })(),
    }))()`);

  for (const combo of COMBOS) {
    const esAltoContraste = Boolean(combo.state.highContrast);
    const modoEfectivo = esAltoContraste
      ? 'alto-contraste'
      : combo.state.mode === 'oscuro'
        ? 'oscuro'
        : 'claro';
    const esAccesibilidad = combo.label.includes('dislexia');

    await cargar(
      combo.state,
      esAccesibilidad ? { a11y: { dyslexia: true, underlineLinks: true, fontSize: 'grande' } } : {},
    );
    const res = await leer();

    const esperadoBg = hexToRgb(getPalette(combo.state.theme, modoEfectivo).bg);
    const esperadoFg = hexToRgb(getPalette(combo.state.theme, modoEfectivo).fg);

    let ok =
      res.bg === esperadoBg &&
      res.fg === esperadoFg &&
      res.theme === combo.state.theme &&
      res.mode === modoEfectivo &&
      res.vars > 100;

    const detalles = [
      `bg=${res.bg} (esp. ${esperadoBg})`,
      `fg=${res.fg} (esp. ${esperadoFg})`,
      `vars=${res.vars}`,
      `glass=${res.glassBlur}`,
    ];

    if (esAccesibilidad) {
      const okA11y =
        res.dyslexia === 'true' &&
        res.underline === 'true' &&
        res.fontSize === 'grande' &&
        /Verdana|Trebuchet/i.test(res.bodyFont) &&
        res.linkUnderline.includes('underline');
      ok = ok && okA11y;
      detalles.push(
        `a11y: dislexia=${res.dyslexia} underline=${res.underline} fontSize=${res.fontSize}`,
        `fuente=${res.bodyFont.split(',')[0]} enlace=${res.linkUnderline}`,
      );
    }

    if (!ok) fallos++;
    console.log(`${ok ? 'OK  ' : 'FALLO'} ${combo.label}: ${detalles.join(' | ')}`);
  }

  console.log(
    fallos === 0
      ? '\nTODOS LOS TEMAS Y ACCESIBILIDAD SE APLICAN BIEN EN DEV'
      : `\n${fallos} FALLO(S)`,
  );
  win.close();
  app.quit();
  process.exitCode = fallos === 0 ? 0 : 1;
});
