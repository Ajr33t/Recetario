/**
 * Verificación del interruptor de Liquid Glass (punto 9 del encargo):
 * - Aparece en Ajustes > Apariencia y está ACTIVO por defecto.
 * - Al desactivarlo: data-glass="off" y las superficies .glass quedan sin
 *   backdrop-filter (opacas, legibles).
 * - La preferencia persiste tras recargar y se puede volver a activar.
 * Requisito: `npm run dev:app`. Uso: npm run verificar:glass
 */
const { app, BrowserWindow } = require('electron');

app.disableHardwareAcceleration();
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
let fallos = 0;
const check = (nombre, cond, detalle = '') => {
  if (!cond) fallos++;
  console.log(`${cond ? 'OK  ' : 'FALLO'} ${nombre}${detalle ? ` — ${detalle}` : ''}`);
};

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1280,
    height: 900,
    show: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });

  await win.loadURL('http://localhost:5173/#/ajustes');
  await dormir(700);
  // Estado limpio para comprobar el valor por defecto.
  await win.webContents.executeJavaScript(
    `localStorage.removeItem('sazonlab-preferencias'); true;`,
  );
  await win.webContents.reload();
  await dormir(2200);

  const leer = (expr) => win.webContents.executeJavaScript(expr);
  const estado = () =>
    leer(`(() => {
      const label = [...document.querySelectorAll('label')].find(l => /Liquid Glass/i.test(l.textContent));
      const input = label?.querySelector('input[type=checkbox]');
      const panel = document.querySelector('.glass-panel');
      return {
        etiqueta: Boolean(label),
        marcado: input?.checked ?? null,
        dataGlass: document.documentElement.dataset.glass,
        blur: panel ? getComputedStyle(panel).backdropFilter || getComputedStyle(panel).webkitBackdropFilter : null,
      };
    })()`);

  let s = await estado();
  check('Ajustes: interruptor de Liquid Glass presente', s.etiqueta);
  check('Liquid Glass activado por defecto', s.marcado === true && s.dataGlass === 'on', JSON.stringify(s));
  check('Liquid Glass aplica desenfoque', s.blur && s.blur !== 'none', `blur=${s.blur}`);

  // Desactivar
  await leer(
    `(() => { const l = [...document.querySelectorAll('label')].find(l => /Liquid Glass/i.test(l.textContent)); l?.querySelector('input')?.click(); return true; })()`,
  );
  await dormir(900);
  s = await estado();
  check('desactivado: data-glass="off"', s.dataGlass === 'off', `dataGlass=${s.dataGlass}`);
  check('desactivado: sin backdrop-filter', s.blur === 'none', `blur=${s.blur}`);

  // Persistencia tras recarga
  await win.webContents.reload();
  await dormir(2200);
  s = await estado();
  check('persiste desactivado tras recargar', s.marcado === false && s.dataGlass === 'off', JSON.stringify(s));

  // Volver a activar
  await leer(
    `(() => { const l = [...document.querySelectorAll('label')].find(l => /Liquid Glass/i.test(l.textContent)); l?.querySelector('input')?.click(); return true; })()`,
  );
  await dormir(900);
  s = await estado();
  check('reactivable: vuelve el desenfoque', s.marcado === true && s.dataGlass === 'on' && s.blur !== 'none', JSON.stringify(s));

  console.log(`\n${fallos === 0 ? 'TODO OK' : `${fallos} FALLO(S)`}`);
  await dormir(300);
  app.quit();
  process.exitCode = fallos === 0 ? 0 : 1;
});
