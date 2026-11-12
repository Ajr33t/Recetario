/**
 * Proceso principal de Electron (CommonJS a propósito: los preload
 * con sandbox solo admiten CJS).
 *
 * Seguridad (decisiones de la Fase 0):
 * - contextIsolation: true
 * - nodeIntegration: false
 * - sandbox: true
 * - Comunicación solo vía IPC validado con ipcMain.handle (canales whitelisted)
 *
 * Modo offline (Fase 8): al empacar, la app levanta la API de Express
 * embebida como proceso hijo (Electron como Node, ELECTRON_RUN_AS_NODE)
 * con SQLite en el directorio de datos del usuario, y el renderer la
 * descubre por el query param `apiPort` (ver app/src/services/api.js).
 */
const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const { fork } = require('child_process');

const DEV_URL = process.env.ELECTRON_START_URL || 'http://localhost:5173';
const RENDERER_FILE = path.join(__dirname, 'renderer', 'index.html');

// Puerto fijo de la API embebida (el servidor de desarrollo usa 3001:
// no hay conflicto aunque ambos corran a la vez).
const PUERTO_API = Number(process.env.SAZONLAB_PORT) || 4731;
const API_EMBEBIDA = app.isPackaged || process.env.SAZONLAB_API_EMBEBIDA === '1';

let apiProc = null;

/** Ruta del entry de la API (fuera del asar cuando está empaquetado). */
function rutaServidor() {
  const base = app.isPackaged ? path.join(process.resourcesPath, 'app.asar.unpacked') : __dirname;
  return path.join(base, 'server', 'src', 'index.js');
}

/** Lanza la API local y espera a que /api/health responda. */
function iniciarApi() {
  if (!API_EMBEBIDA) return Promise.resolve();

  apiProc = fork(rutaServidor(), [], {
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      PORT: String(PUERTO_API),
      // SQLite en %APPDATA%/SazonLab (fuera de Program Files)
      SAZONLAB_DATA_DIR: app.getPath('userData'),
    },
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
  });
  apiProc.stdout?.on('data', (d) => console.log(`[API] ${String(d).trimEnd()}`));
  apiProc.stderr?.on('data', (d) => console.error(`[API] ${String(d).trimEnd()}`));
  apiProc.on('exit', (cod) => console.warn(`[SazónLab] La API embebida terminó (${cod}).`));

  // Espera activa del health (máx. 10 s) para no mostrar una UI sin API
  return (async () => {
    for (let intento = 0; intento < 40; intento++) {
      try {
        const r = await fetch(`http://127.0.0.1:${PUERTO_API}/api/health`);
        if (r.ok) return;
      } catch {
        /* aún no está arriba */
      }
      await new Promise((r) => setTimeout(r, 250));
    }
    console.warn('[SazónLab] La API embebida no respondió a tiempo.');
  })();
}

/** Detiene la API embebida al salir (evita procesos huérfanos). */
function detenerApi() {
  if (apiProc && apiProc.exitCode === null) {
    try {
      apiProc.kill();
    } catch {
      /* ya terminado */
    }
  }
}

/** Crea la ventana principal con las medidas de seguridad. */
function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    title: 'SazónLab — Recetario Inteligente',
    backgroundColor: '#0f172a',
    icon: path.join(__dirname, 'build', 'icon.png'),
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // El usuario no puede abrir ventanas nuevas desde el renderer:
  // los enlaces externos se abren en el navegador del sistema.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  // Desarrollo: servidor Vite. Producción: archivo construido (+ puerto
  // de la API embebida para que el renderer la descubra).
  const cargar = app.isPackaged
    ? win.loadFile(RENDERER_FILE, { search: `?apiPort=${PUERTO_API}` })
    : win.loadURL(DEV_URL).catch(() => win.loadFile(RENDERER_FILE));

  cargar.catch(() => {
    // Último recurso: intenta el archivo local si existe
    win.loadFile(RENDERER_FILE).catch(() => {});
  });

  win.once('ready-to-show', () => win.show());
  return win;
}

// --- IPC seguro (canal único, datos simples) -------------------
ipcMain.handle('app:info', () => ({
  name: 'SazónLab',
  version: app.getVersion(),
  platform: process.platform,
  electron: process.versions.electron,
  node: process.versions.node,
}));

app.whenReady().then(async () => {
  await iniciarApi();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', detenerApi);
process.on('exit', detenerApi);
