const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // File operations
  loadTasks: () => ipcRenderer.invoke('load-tasks'),
  saveTasks: (data) => ipcRenderer.invoke('save-tasks', data),
  exportTasks: (filePath, data) => ipcRenderer.invoke('export-tasks', filePath, data),
  importTasks: (filePath) => ipcRenderer.invoke('import-tasks', filePath),
  
  // Menu event listeners
  onMenuNewProject: (callback) => ipcRenderer.on('menu-new-project', callback),
  onMenuSave: (callback) => ipcRenderer.on('menu-save', callback),
  onMenuExport: (callback) => ipcRenderer.on('menu-export', callback),
  onMenuImport: (callback) => ipcRenderer.on('menu-import', callback),
  
  // Remove listeners
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
  
  // Platform info
  platform: process.platform,
  
  // Version info
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron
  },

  // Theme settings
  getSystemPrefersDark: () => ipcRenderer.invoke('get-system-prefers-dark')
});
