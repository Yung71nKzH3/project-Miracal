import { contextBridge, ipcRenderer } from 'electron'

console.log('Preload script executing...')

contextBridge.exposeInMainWorld('electronAPI', {
  onMediaUpdate: (callback: (data: any) => void) => 
    ipcRenderer.on('media-update', (_event, value) => callback(value)),
  onMediaPosition: (callback: (data: any) => void) => 
    ipcRenderer.on('media-position', (_event, value) => callback(value)),
  setIgnoreMouseEvents: (ignore: boolean, options?: { forward: boolean }) => 
    ipcRenderer.send('set-ignore-mouse-events', ignore, options),
  setAlwaysOnTop: (flag: boolean) => 
    ipcRenderer.send('set-always-on-top', flag),
})
