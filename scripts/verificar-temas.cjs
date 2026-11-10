/**
 * Verificación de temas en vivo: comprueba en el servidor DEV (localhost:5173)
 * que los temas y el alto contraste se aplican de verdad (computed style).
 * Requisito: `npm run dev:app` corriendo. Uso: npm run verificar:temas
 */
const { app, BrowserWindow } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');

app.disableHardwareAcceleration();
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

const COMBOS = [
  { theme: 'cereza', mode: 'oscuro' },
  { theme: 'bosque', mode: 'alto-contraste' },
  { theme: 'monocromo', mode: 'claro' },
  { theme: 'oceano', mode: 'claro' },
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
  for (const combo of COMBOS) {
    await win.loadURL('http://localhost:5173/');
    await dormir(800);
    await win.webContents.executeJavaScript(`
      localStorage.setItem('sazonlab-preferencias',
        JSON.stringify({ state: { theme: '${combo.theme}', mode: '${combo.mode}' }, version: 0 }));
      location.reload(); true;`);
    await dormir(1500);
    const res = await win.webContents.executeJavaScript(`(() => ({
      bg: getComputedStyle(document.body).backgroundColor,
      fg: getComputedStyle(document.body).color,
      theme: document.documentElement.dataset.theme,
      mode: document.documentElement.dataset.mode,
      vars: (document.getElementById('theme-vars') || {}).textContent?.length || 0,
      glassBlur: getComputedStyle(document.querySelector('.glass') || document.body).backdropFilter,
    }))()`);

    const esperadoBg = hexToRgb(getPalette(combo.theme, combo.mode).bg);
    const esperadoFg = hexToRgb(getPalette(combo.theme, combo.mode).fg);
    const ok =
      res.bg === esperadoBg &&
      res.fg === esperadoFg &&
      res.theme === combo.theme &&
      res.mode === combo.mode &&
      res.vars > 100;
    if (!ok) fallos++;
    console.log(
      `${ok ? 'OK ' : 'FALLO'} ${combo.theme}/${combo.mode}: bg=${res.bg} (esperado ${esperadoBg}) fg=${res.fg} (esperado ${esperadoFg}) vars=${res.vars} glass=${res.glassBlur}`,
    );
  }
  console.log(fallos === 0 ? '\nTODOS LOS TEMAS SE APLICAN BIEN EN DEV' : `\n${fallos} FALLO(S)`);
  win.close();
  app.quit();
  process.exitCode = fallos === 0 ? 0 : 1;
});
