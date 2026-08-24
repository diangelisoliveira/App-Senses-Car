const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('sensesCar', {
  load: () => ipcRenderer.invoke('data:load'),
  save: (records) => ipcRenderer.invoke('data:save', records),
  loadCatalog: () => ipcRenderer.invoke('catalog:load'),
  saveCatalog: (catalog) => ipcRenderer.invoke('catalog:save', catalog),
  loadCommissions: () => ipcRenderer.invoke('commissions:load'),
  saveCommissions: (commissions) => ipcRenderer.invoke('commissions:save', commissions),
  updates: {
    state: () => ipcRenderer.invoke('updates:state'),
    check: () => ipcRenderer.invoke('updates:check'),
    download: () => ipcRenderer.invoke('updates:download'),
    install: () => ipcRenderer.invoke('updates:install'),
    onStatus: (callback) => {
      if (typeof callback !== 'function') return () => {};
      const listener = (_, status) => callback(status);
      ipcRenderer.on('updates:status', listener);
      return () => ipcRenderer.removeListener('updates:status', listener);
    },
  },
  exportPdf: () => ipcRenderer.invoke('report:pdf')
});
