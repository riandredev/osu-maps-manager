import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('osuMaps', {
  status: () => ipcRenderer.invoke('maps:status'),
  sync: (options: unknown) => ipcRenderer.invoke('maps:sync', options),
  selectLibrary: () => ipcRenderer.invoke('maps:select-library'),
  restore: (options: unknown) => ipcRenderer.invoke('maps:restore', options),
  cancel: () => ipcRenderer.invoke('maps:cancel'),
  onProgress: (callback: (value: unknown) => void) => {
    const listener = (_event: unknown, value: unknown) => callback(value);
    ipcRenderer.on('maps:progress', listener);
    return () => ipcRenderer.removeListener('maps:progress', listener);
  },
});
