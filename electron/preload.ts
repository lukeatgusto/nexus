import { contextBridge, ipcRenderer } from 'electron';

// Expose APIs to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  openExternal: (url: string) => ipcRenderer.send('open-external', url),
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

// Expose Notion APIs to renderer process
contextBridge.exposeInMainWorld('notionAPI', {
  isConnected: (): Promise<boolean> => {
    return ipcRenderer.invoke('notion:isConnected');
  },
  configure: (apiKey: string, databaseId: string, userEmail: string): Promise<void> => {
    return ipcRenderer.invoke('notion:configure', apiKey, databaseId, userEmail);
  },
  testConnection: (): Promise<void> => {
    return ipcRenderer.invoke('notion:testConnection');
  },
  getTasks: (): Promise<unknown[]> => {
    return ipcRenderer.invoke('notion:getTasks');
  },
  openTask: (notionUrl: string) => {
    ipcRenderer.send('notion:openTask', notionUrl);
  },
  openDatabase: () => {
    ipcRenderer.send('notion:openDatabase');
  },
  disconnect: (): Promise<void> => {
    return ipcRenderer.invoke('notion:disconnect');
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
  onCwdChange: (callback: (cwd: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, cwd: string) => callback(cwd);
    ipcRenderer.on('terminal:cwdChanged', handler);
    return () => {
      ipcRenderer.removeListener('terminal:cwdChanged', handler);
    };
  },
  dispose: () => {
    ipcRenderer.send('terminal:dispose');
  },
  restart: () => {
    ipcRenderer.send('terminal:restart');
  },
});

// Expose File System APIs to renderer process
contextBridge.exposeInMainWorld('fileSystemAPI', {
  readDirectory: (dirPath: string): Promise<unknown[]> => {
    return ipcRenderer.invoke('fs:readDirectory', dirPath);
  },
  openFile: (filePath: string): Promise<string> => {
    return ipcRenderer.invoke('fs:openFile', filePath);
  },
  revealInFinder: (filePath: string) => {
    ipcRenderer.send('fs:revealInFinder', filePath);
  },
  copyPath: (filePath: string) => {
    ipcRenderer.send('fs:copyPath', filePath);
  },
});
