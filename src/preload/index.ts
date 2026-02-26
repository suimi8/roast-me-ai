import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  testConnection: (settings) => ipcRenderer.invoke('test-connection', settings),
  activateProfile: (profileId: string) => ipcRenderer.invoke('activate-profile', profileId),
  closeRoast: () => ipcRenderer.send('close-roast'),
  resizeRoastWindow: (size: any) => ipcRenderer.send('resize-roast-window', size),
  testRoast: () => ipcRenderer.send('test-roast'),
  onRoast: (callback: any) => ipcRenderer.on('show-roast', (_event: any, value: any) => callback(value)),
  onAppLog: (callback: any) => ipcRenderer.on('app-log', (_event: any, msg: string) => callback(msg)),
  openExternal: (url: string) => require('electron').shell.openExternal(url)
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
