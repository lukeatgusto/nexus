import { app, BrowserWindow, ipcMain, nativeTheme } from 'electron';
import path from 'path';
import os from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { authorize, isConnected, disconnect } from './googleOAuth';
import { getTodaysEvents } from './googleCalendar';
import { GOOGLE_CLIENT_ID, GOOGLE_SCOPES } from './calendarConfig';

// node-pty must be required (not imported) due to native module loading
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pty = require('node-pty');

const execFileAsync = promisify(execFile);

let mainWindow: BrowserWindow | null = null;
let ptyProcess: ReturnType<typeof pty.spawn> | null = null;

// ---------------------------------------------------------------------------
// PTY Management
// ---------------------------------------------------------------------------

function spawnShell(): void {
  const shell = process.env.SHELL || '/bin/zsh';
  const home = os.homedir();

  ptyProcess = pty.spawn(shell, ['--login'], {
    name: 'xterm-256color',
    cols: 80,
    rows: 24,
    cwd: home,
    env: {
      ...process.env,
      TERM: 'xterm-256color',
      COLORTERM: 'truecolor',
    },
  });

  // Forward shell output to the renderer
  ptyProcess.onData((data: string) => {
    mainWindow?.webContents.send('terminal:data', data);
  });

  ptyProcess.onExit(({ exitCode }: { exitCode: number }) => {
    mainWindow?.webContents.send('terminal:exit', exitCode);
    ptyProcess = null;
  });
}

async function getCwd(): Promise<string> {
  if (!ptyProcess) return os.homedir();

  try {
    const pid = ptyProcess.pid;
    // macOS: use lsof to find the cwd of the shell process
    const { stdout } = await execFileAsync('lsof', ['-p', String(pid)], {
      timeout: 2000,
    });
    // Output format: "zsh PID user cwd DIR ... /path/to/dir"
    const cwdLine = stdout.split('\n').find(line => line.includes('cwd'));
    if (cwdLine) {
      const match = cwdLine.trim().split(/\s+/);
      // The last token is the path
      if (match.length > 0) {
        return match[match.length - 1];
      }
    }
  } catch {
    // Fallback to home directory if lsof fails
  }
  return os.homedir();
}

function cleanupPty(): void {
  if (ptyProcess) {
    ptyProcess.kill();
    ptyProcess = null;
  }
}

// ---------------------------------------------------------------------------
// IPC Handlers
// ---------------------------------------------------------------------------

function setupIpcHandlers(): void {
  ipcMain.on('terminal:write', (_event, data: string) => {
    ptyProcess?.write(data);
  });

  ipcMain.on('terminal:resize', (_event, cols: number, rows: number) => {
    if (ptyProcess && cols > 0 && rows > 0) {
      try {
        ptyProcess.resize(cols, rows);
      } catch {
        // Ignore resize errors (can happen during cleanup)
      }
    }
  });

  ipcMain.handle('terminal:getCwd', () => {
    return getCwd();
  });

  ipcMain.on('terminal:dispose', () => {
    cleanupPty();
  });

  ipcMain.on('terminal:restart', () => {
    cleanupPty();
    spawnShell();
  });

  // -------------------------------------------------------------------------
  // Calendar IPC Handlers
  // -------------------------------------------------------------------------

  ipcMain.handle('calendar:isConfigured', () => {
    return GOOGLE_CLIENT_ID !== '';
  });

  ipcMain.handle('calendar:isConnected', () => {
    return isConnected();
  });

  ipcMain.handle('calendar:authorize', async () => {
    if (!GOOGLE_CLIENT_ID) {
      throw new Error('Google Client ID not configured. Set GOOGLE_CLIENT_ID in electron/calendarConfig.ts');
    }
    await authorize({ clientId: GOOGLE_CLIENT_ID, scopes: GOOGLE_SCOPES });
  });

  ipcMain.handle('calendar:getEvents', async () => {
    if (!GOOGLE_CLIENT_ID) {
      throw new Error('Google Client ID not configured');
    }
    return getTodaysEvents(GOOGLE_CLIENT_ID);
  });

  ipcMain.handle('calendar:disconnect', () => {
    disconnect();
  });
}

// ---------------------------------------------------------------------------
// Window Management
// ---------------------------------------------------------------------------

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 1000,
    minWidth: 1200,
    minHeight: 700,
    titleBarStyle: 'hiddenInset', // Hide title bar, keep traffic lights
    vibrancy: 'under-window', // macOS translucent window
    visualEffectState: 'active',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Load the app
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Sync theme with system
  nativeTheme.on('updated', () => {
    mainWindow?.webContents.send('theme-changed', nativeTheme.shouldUseDarkColors);
  });

  mainWindow.on('closed', () => {
    cleanupPty();
    mainWindow = null;
  });

  // Spawn the shell after the window is ready
  spawnShell();
}

// ---------------------------------------------------------------------------
// App Lifecycle
// ---------------------------------------------------------------------------

app.whenReady().then(() => {
  setupIpcHandlers();
  createWindow();
});

app.on('window-all-closed', () => {
  cleanupPty();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

app.on('before-quit', () => {
  cleanupPty();
});
