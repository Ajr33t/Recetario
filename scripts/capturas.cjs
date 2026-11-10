/**
 * Capturas de evidencia (Fase 2) con Electron:
 *  1) docs/evidencias/galeria-36-temas.png  → rejilla 6×6 (12 temas × 3 modos)
 *  2) docs/evidencias/app-*.png             → la app real con combos precargados
 *
 * Uso: npx electron scripts/capturas.cjs   (o: npm run capturas)
 */
const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

// Captura estable sin GPU (evita UnknownVizError en capturePage)
app.disableHardwareAcceleration();

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'docs', 'evidencias');
const MODOS = ['claro', 'oscuro', 'alto-contraste'];

// Combos de la app real que se capturan (estado = formato del store)
const APP_COMBOS = [
  { state: { theme: 'oceano', mode: 'claro' }, archivo: 'app-01-oceano-claro.png' },
  { state: { theme: 'ciberpunk', mode: 'oscuro' }, archivo: 'app-02-ciberpunk-oscuro.png' },
  {
    state: { theme: 'bosque', mode: 'oscuro', highContrast: true },
    archivo: 'app-03-bosque-alto-contraste.png',
  },
  { state: { theme: 'sakura', mode: 'claro' }, archivo: 'app-04-sakura-claro.png' },
];

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

/** ¿La imagen está casi en blanco? (fallback: reintentar con ventana visible) */
function estaEnBlanco(img) {
  const bmp = img.toBitmap();
  for (let i = 0; i < bmp.length; i += 160) {
    if (bmp[i] < 250 || bmp[i + 1] < 250 || bmp[i + 2] < 250) return false;
  }
  return true;
}

/** Captura la ventana; si falla o sale en blanco, la muestra y reintenta. */
async function capturar(win, ruta) {
  let img = null;
  for (let intento = 0; intento < 2 && !img; intento++) {
    try {
      const captura = await win.webContents.capturePage();
      if (intento === 0 && estaEnBlanco(captura)) {
        console.warn('  captura en blanco → reintento con ventana visible…');
        win.show();
        await dormir(1000);
      } else {
        img = captura;
      }
    } catch (err) {
      console.warn(`  captura falló (${err.message}) → reintento con ventana visible…`);
      win.show();
      await dormir(1200);
    }
  }
  if (!img) img = await win.webContents.capturePage();
  fs.writeFileSync(ruta, img.toPNG());
  console.log('  ✅', path.basename(ruta));
}

function galeriaHtml(THEMES, getPalette) {
  let i = 0;
  const celdas = [];
  const estilos = [];
  for (const t of THEMES) {
    for (const m of MODOS) {
      const p = getPalette(t.id, m);
      estilos.push(`
.c${i} { background: ${p.bg}; color: ${p.fg}; background-image: linear-gradient(135deg, ${p.gradient[0]} 0%, ${p.gradient[1]} 45%, ${p.gradient[2]} 100%); }
.c${i} .glass { background: ${p.glass}; border: 1px solid ${p.glassBorder}; box-shadow: ${p.shadow}; }
.c${i} .btn { background: ${p.primary}; color: ${p.primaryFg}; }
.c${i} .txt { color: ${p.mutedFg}; }
.c${i} .chip { background: ${p.muted}; color: ${p.mutedFg}; }
.c${i} .bar { background: ${p.accent}; }`);
      celdas.push(`<div class="celda c${i}">
  <div class="glass">
    <div class="barra"><span class="bar"></span><span class="titulo">${t.name} · ${m}</span></div>
    <button class="btn" type="button">Aceptar</button>
    <p class="txt">Texto de muestra del tema ${t.name} en modo ${m}. Contraste verificado.</p>
    <span class="chip">Chip de ejemplo</span>
    <div class="sw"><i style="background:${p.bg}"></i><i style="background:${p.primary}"></i><i style="background:${p.accent}"></i><i style="background:${p.fg}"></i></div>
  </div>
</div>`);
      i++;
    }
  }
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>
body{margin:0;padding:14px;font-family:system-ui,sans-serif;background:#e8eef4;color:#0f172a}
h1{font-size:16px;margin:0 0 10px}
.grid{display:grid;grid-template-columns:repeat(6,1fr);gap:10px}
.celda{min-height:148px}
.glass{border-radius:12px;padding:10px;height:100%;box-sizing:border-box}
.barra{display:flex;align-items:center;gap:6px;margin-bottom:8px}
.bar{width:18px;height:18px;border-radius:6px;display:inline-block}
.titulo{font-size:12px;font-weight:700}
.btn{border:0;border-radius:8px;padding:5px 11px;font-size:11px;font-weight:700;cursor:pointer}
.txt{font-size:10px;line-height:1.35;margin:7px 0 0}
.chip{display:inline-block;font-size:9px;padding:2px 8px;border-radius:999px;margin-top:6px}
.sw{display:flex;gap:5px;margin-top:8px}
.sw i{width:14px;height:14px;border-radius:50%;border:1px solid rgba(128,128,128,.4)}
</style></head><body>
<h1>SazónLab — Galería de 12 temas × 3 modos (36 combinaciones)</h1>
<div class="grid">${celdas.join('')}</div>
<style>${estilos.join('')}</style>
</body></html>`;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });

  // palettes.js es ESM dentro del workspace app (type: module)
  const palettes = await import(pathToFileURL(path.join(ROOT, 'app/src/themes/palettes.js')).href);
  const { THEMES, getPalette } = palettes;

  // --- 1) Galería 6×6 --------------------------------------------------
  const galeriaPath = path.join(OUT, '_galeria.html');
  fs.writeFileSync(galeriaPath, galeriaHtml(THEMES, getPalette), 'utf8');

  const gal = new BrowserWindow({
    width: 1500,
    height: 1320,
    show: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  await gal.loadFile(galeriaPath);
  await dormir(400);
  await capturar(gal, path.join(OUT, 'galeria-36-temas.png'));
  gal.close();

  // --- 2) Capturas de la app real --------------------------------------
  const appDist = path.join(ROOT, 'app/dist/index.html');
  if (!fs.existsSync(appDist)) {
    console.warn('⚠️  app/dist no existe — corre "npm run build:app" antes.');
    return;
  }

  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });

  for (const combo of APP_COMBOS) {
    // Carga inicial para poder escribir en localStorage de la app
    await win.loadFile(appDist);
    await win.webContents.executeJavaScript(`
      localStorage.setItem('sazonlab-preferencias',
        JSON.stringify({ state: ${JSON.stringify(combo.state)}, version: 0 }));
      true;
    `);
    // Recarga: la app hidrata las preferencias y aplica el tema al arrancar
    const recarga = new Promise((r) => win.webContents.once('did-finish-load', r));
    win.webContents.reload();
    await recarga;
    await win.webContents
      .executeJavaScript('document.fonts.ready.then(() => true)')
      .catch(() => {});
    await dormir(600);
    await capturar(win, path.join(OUT, combo.archivo));
  }
  win.close();
}

app.whenReady().then(async () => {
  try {
    await main();
    console.log('\nCapturas guardadas en docs/evidencias/');
  } catch (err) {
    console.error('Error en capturas:', err);
    process.exitCode = 1;
  } finally {
    app.quit();
  }
});
