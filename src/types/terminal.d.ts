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
  /** Dispose the PTY process */
  dispose: () => void;
  /** Restart the shell process */
  restart: () => void;
}

declare global {
  interface Window {
    electronAPI: {
      platform: string;
    };
    terminalAPI: TerminalAPI;
    calendarAPI: import('./calendar').CalendarAPI;
  }
}

export {};
