import { contextBridge, ipcRenderer } from 'electron';

// Expose APIs to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
});

// Expose Calendar APIs to renderer process
contextBridge.exposeInMainWorld('calendarAPI', {
  isConnected: (): Promise<boolean> => {
    return ipcRenderer.invoke('calendar:isConnected');
  },
  isConfigured: (): Promise<boolean> => {
    return ipcRenderer.invoke('calendar:isConfigured');
  },
  authorize: (): Promise<void> => {
    return ipcRenderer.invoke('calendar:authorize');
  },
  getEvents: (): Promise<unknown[]> => {
    return ipcRenderer.invoke('calendar:getEvents');
  },
  disconnect: (): Promise<void> => {
    return ipcRenderer.invoke('calendar:disconnect');
  },
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
