const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('corpusDesktop', {
  onUpdate: cb => ipcRenderer.on('update:status', (_e, s) => cb(s)),
  checkForUpdates: () => ipcRenderer.invoke('update:check'),
  installUpdate: () => ipcRenderer.invoke('update:install'),
  openDownload: () => ipcRenderer.invoke('update:open'),
  version: () => ipcRenderer.invoke('app:version')
});
