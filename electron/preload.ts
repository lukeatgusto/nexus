import { contextBridge, ipcRenderer } from 'electron';

// Expose APIs to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
});

// Expose Terminal APIs to renderer process
contextBridge.exposeInMainWorld('terminalAPI', {
  write: (data: string) => {
    ipcRenderer.send('terminal:write', data);
  },
  onData: (callback: (data: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: string) => callback(data);
    ipcRenderer.on('terminal:data', handler);
    // Return cleanup function
    return () => {
      ipcRenderer.removeListener('terminal:data', handler);
    };
  },
  onExit: (callback: (exitCode: number) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, exitCode: number) => callback(exitCode);
    ipcRenderer.on('terminal:exit', handler);
    return () => {
      ipcRenderer.removeListener('terminal:exit', handler);
    };
  },
  resize: (cols: number, rows: number) => {
    ipcRenderer.send('terminal:resize', cols, rows);
  },
  getCwd: (): Promise<string> => {
    return ipcRenderer.invoke('terminal:getCwd');
  },
  dispose: () => {
    ipcRenderer.send('terminal:dispose');
  },
  restart: () => {
    ipcRenderer.send('terminal:restart');
  },
});
