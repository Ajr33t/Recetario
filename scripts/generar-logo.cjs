/**
 * Genera el PNG512×512 del logo a partir de assets/logo.svg.
 * Usa Electron (ya instalado) como rasterizador: sin dependencias nuevas.
 *
 * Salidas:
 *  - desktop/build/icon.png     → icono de la app y del instalador NSIS
 *  - landing/public/logo-512.png → respaldo/og del logo
 *
 * Uso: npm run logo   (o: electron scripts/generar-logo.cjs)
 */
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

app.disableHardwareAcceleration();

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

app.whenReady().then(async () => {
  const raiz = path.join(__dirname, '..');
  const svg = fs.readFileSync(path.join(raiz, 'assets', 'logo.svg'), 'utf8');

  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    html, body { margin: 0; width: 512px; height: 512px; overflow: hidden; background: transparent; }
    svg { display: block; width: 512px; height: 512px; }
  </style></head><body>${svg}</body></html>`;

  const win = new BrowserWindow({
    width: 512,
    height: 512,
    show: false,
    transparent: true,
    backgroundColor: '#00000000',
    webPreferences: { contextIsolation: true, sandbox: true },
  });

  await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  await dormir(400);

  const imagen = await win.webContents.capturePage();
  const png = imagen.toPNG();

  fs.mkdirSync(path.join(raiz, 'desktop', 'build'), { recursive: true });
  fs.writeFileSync(path.join(raiz, 'desktop', 'build', 'icon.png'), png);
  fs.writeFileSync(path.join(raiz, 'landing', 'public', 'logo-512.png'), png);

  console.log('OK: desktop/build/icon.png + landing/public/logo-512.png (512×512)');
  app.exit(0);
});

process.on('unhandledRejection', (err) => {
  console.error('FATAL:', err.message);
  app.exit(1);
});
