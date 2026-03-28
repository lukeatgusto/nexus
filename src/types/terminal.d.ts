/** Terminal API exposed via contextBridge in preload.ts */
export interface TerminalAPI {
  /** Write data to the shell's stdin */
  write: (data: string) => void;
  /** Listen for data from the shell's stdout */
  onData: (callback: (data: string) => void) => () => void;
  /** Listen for shell exit events */
  onExit: (callback: (exitCode: number) => void) => () => void;
  /** Resize the PTY to match terminal dimensions */
  resize: (cols: number, rows: number) => void;
  /** Get the current working directory of the shell */
  getCwd: () => Promise<string>;
  /** Listen for CWD changes pushed from main process */
  onCwdChange: (callback: (cwd: string) => void) => () => void;
  /** Dispose the PTY process */
  dispose: () => void;
  /** Restart the shell process */
  restart: () => void;
}

/** A node in the file system tree */
export interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  icon: string;
  children?: FileNode[];
}

/** File System API exposed via contextBridge in preload.ts */
export interface FileSystemAPI {
  readDirectory: (dirPath: string) => Promise<FileNode[]>;
  openFile: (filePath: string) => Promise<string>;
  revealInFinder: (filePath: string) => void;
  copyPath: (filePath: string) => void;
}

declare global {
  interface Window {
    electronAPI: {
      platform: string;
      openExternal: (url: string) => void;
    };
    terminalAPI: TerminalAPI;
    calendarAPI: import('./calendar').CalendarAPI;
    notionAPI: import('./notion').NotionAPI;
    fileSystemAPI: FileSystemAPI;
  }
}

export {};
