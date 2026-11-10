/**
 * Proceso principal de Electron (CommonJS a propósito: los preload
 * con sandbox solo admiten CJS).
 *
 * Seguridad (decisiones de la Fase 0):
 * - contextIsolation: true
 * - nodeIntegration: false
 * - sandbox: true
 * - Comunicación solo vía IPC validado con ipcMain.handle (canales whitelisted)
 */
const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');

const DEV_URL = process.env.ELECTRON_START_URL || 'http://localhost:5173';
const RENDERER_FILE = path.join(__dirname, 'renderer', 'index.html');

/** Crea la ventana principal con las medidas de seguridad. */
function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    title: 'SazónLab — Recetario Inteligente',
    backgroundColor: '#0f172a',
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

  // Desarrollo: servidor Vite. Producción: archivo construido.
  const cargar = app.isPackaged
    ? win.loadFile(RENDERER_FILE)
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

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
