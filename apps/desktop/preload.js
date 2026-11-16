/**
 * Puente seguro entre el renderer y el proceso principal.
 * contextIsolation está activo: el renderer solo ve lo que se
 * expone explícitamente con contextBridge (IPC validado).
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('sazonlab', {
  /** Información de la aplicación (versión, plataforma, offline). */
  appInfo: () => ipcRenderer.invoke('app:info'),
});
