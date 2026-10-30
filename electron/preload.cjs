const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('caissepro', {
  renderPdf: (payload) => ipcRenderer.invoke('report:pdf', payload),
  savePdf: (payload) => ipcRenderer.invoke('report:save', payload),
  printPdf: (payload) => ipcRenderer.invoke('report:print', payload),
})
