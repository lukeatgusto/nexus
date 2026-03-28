# Phase 2: Terminal Integration

**Date:** 2026-03-27
**Status:** Planning
**Priority:** High - Core feature for command center

---

## Goal

Embed a fully functional terminal with Claude Code integration in the center panel, allowing users to interact with their shell and AI assistant without leaving the command center.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                 Electron Main Process                │
│                                                       │
│  ┌─────────────────────────────────────────────┐    │
│  │          node-pty (PTY Process)              │    │
│  │  - Spawns shell (/bin/zsh)                  │    │
│  │  - Manages I/O streams                       │    │
│  │  - Tracks working directory                  │    │
│  └─────────────────────────────────────────────┘    │
│            ↕ IPC (stdin/stdout/stderr)              │
│  ┌─────────────────────────────────────────────┐    │
│  │         IPC Handlers (preload)               │    │
│  │  - terminal.write()                          │    │
│  │  - terminal.onData()                         │    │
│  │  - terminal.getCwd()                         │    │
│  │  - terminal.resize()                         │    │
│  └─────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
                         ↕ IPC
┌─────────────────────────────────────────────────────┐
│              React Renderer Process                  │
│                                                       │
│  ┌─────────────────────────────────────────────┐    │
│  │      Terminal Component (React)              │    │
│  │  - Renders xterm.js instance                 │    │
│  │  - Handles keyboard input                    │    │
│  │  - Displays output                           │    │
│  └─────────────────────────────────────────────┘    │
│            ↕ Data binding                           │
│  ┌─────────────────────────────────────────────┐    │
│  │         xterm.js (Terminal UI)               │    │
│  │  - Terminal emulator                         │    │
│  │  - Renders ANSI escape codes                 │    │
│  │  - Handles cursor, scrollback                │    │
│  └─────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

---

## Component Breakdown

### 1. xterm.js (Frontend Terminal Emulator)

**Purpose:** Renders terminal UI in the React app

**Key features:**
- Full ANSI escape code support
- Scrollback buffer
- Text selection and copy/paste
- Cursor rendering
- Color themes (match light/dark mode)

**Dependencies:**
- `xterm` - Core terminal emulator
- `xterm-addon-fit` - Auto-resize to container
- `xterm-addon-web-links` - Clickable URLs
- `xterm-addon-webgl` (optional) - Hardware-accelerated rendering

**React integration:**
```typescript
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';

const terminal = new Terminal({
  fontFamily: 'SF Mono, Monaco, Menlo, monospace',
  fontSize: 13,
  theme: {
    background: darkMode ? '#1C1C1E' : '#FFFFFF',
    foreground: darkMode ? '#E5E5EA' : '#000000',
    // ... macOS-like theme
  },
  cursorBlink: true,
  cursorStyle: 'bar',
  scrollback: 10000,
});
```

---

### 2. node-pty (Backend Shell Process)

**Purpose:** Spawns and manages shell process in Electron main

**Key features:**
- Cross-platform PTY (pseudo-terminal)
- Spawns interactive shell with proper environment
- Handles process signals (SIGTERM, SIGKILL)
- Manages stdin/stdout/stderr streams

**Dependencies:**
- `node-pty` - Native module for PTY support
- Note: Requires `node-gyp` and native build tools

**Implementation:**
```typescript
import * as pty from 'node-pty';

const shell = pty.spawn(
  process.env.SHELL || '/bin/zsh',
  [],
  {
    name: 'xterm-256color',
    cols: 80,
    rows: 24,
    cwd: process.env.HOME,
    env: process.env,
  }
);

shell.onData((data) => {
  // Send to renderer via IPC
  mainWindow.webContents.send('terminal-output', data);
});
```

---

### 3. IPC Bridge (Secure Communication)

**Purpose:** Connect React UI to PTY process securely

**Exposed APIs (via contextBridge):**
```typescript
// In preload.ts
contextBridge.exposeInMainWorld('terminalAPI', {
  // Send input from user to shell
  write: (data: string) => ipcRenderer.send('terminal-input', data),

  // Receive output from shell
  onData: (callback: (data: string) => void) => {
    ipcRenderer.on('terminal-output', (_, data) => callback(data));
  },

  // Get current working directory
  getCwd: () => ipcRenderer.invoke('terminal-get-cwd'),

  // Resize PTY when terminal resizes
  resize: (cols: number, rows: number) => {
    ipcRenderer.send('terminal-resize', { cols, rows });
  },

  // Cleanup
  dispose: () => ipcRenderer.send('terminal-dispose'),
});
```

**Main process handlers:**
```typescript
ipcMain.on('terminal-input', (_, data) => {
  shell.write(data);
});

ipcMain.handle('terminal-get-cwd', async () => {
  // Poll current directory
  return getCurrentDirectory(shell.pid);
});

ipcMain.on('terminal-resize', (_, { cols, rows }) => {
  shell.resize(cols, rows);
});
```

---

## Implementation Phases

### Phase 2a: Basic Terminal (Week 1)

**Goal:** Working terminal that can execute commands

**Tasks:**
1. Install dependencies (`xterm`, `node-pty`)
2. Create Terminal component (React)
3. Set up IPC bridge in preload
4. Spawn shell in main process
5. Wire up data flow (input → shell → output)
6. Handle terminal resize
7. Test basic commands (`ls`, `pwd`, `echo`)

**Deliverable:** Terminal that works like a basic Terminal.app

---

### Phase 2b: Claude Code Integration (Week 2)

**Goal:** Run `claude` command successfully

**Tasks:**
1. Test if `claude` renders in xterm.js
2. Handle interactive prompts
3. Test tool executions
4. Verify file editing workflows
5. **Fallback:** If TUI issues arise, add "Launch Claude Code" button

**Challenges:**
- Claude Code TUI might not render perfectly
- Permission prompts might be blocked
- Tool execution output might be weird

**Fallback strategy:**
```typescript
// If claude TUI doesn't work well in xterm
<button onClick={() => {
  // Open external Claude Code window for current directory
  const cwd = await terminalAPI.getCwd();
  spawn('claude', [], { cwd, detached: true });
}}>
  Open Claude Code
</button>
```

---

### Phase 2c: Directory Tracking (Week 2)

**Goal:** Keep file browser synced with terminal's cwd

**Approach 1: Polling (Simple, Reliable)**
```typescript
setInterval(async () => {
  const cwd = await getCwd(shell.pid);
  if (cwd !== currentDir) {
    updateFileTree(cwd);
    currentDir = cwd;
  }
}, 500);
```

**Approach 2: Shell Hooks (Complex, Cleaner)**
```bash
# In shell init (.zshrc)
chpwd() {
  echo "\033]1337;CurrentDir=$PWD\007"
}
```
Then parse OSC sequences in xterm.js

**Decision:** Start with Approach 1 (polling), optimize later if needed

**macOS-specific trick:**
```typescript
import { execSync } from 'child_process';

function getCwd(pid: number): string {
  const output = execSync(`lsof -p ${pid} | grep cwd`).toString();
  // Parse output to extract directory
  return parseLsofOutput(output);
}
```

---

## Technical Challenges & Solutions

### Challenge 1: node-pty Native Build

**Problem:** node-pty requires native compilation (node-gyp)

**Solutions:**
- Install Xcode Command Line Tools
- Use electron-rebuild to compile for Electron's Node version
- Add to `postinstall` script: `electron-rebuild -f -w node-pty`

**Fallback:** Prebuilt binaries from npm (usually available)

---

### Challenge 2: Terminal Sizing

**Problem:** Terminal must resize when panel expands/collapses

**Solution:**
```typescript
import { FitAddon } from 'xterm-addon-fit';

const fitAddon = new FitAddon();
terminal.loadAddon(fitAddon);

// Call on mount and panel size changes
useEffect(() => {
  fitAddon.fit();
  const { cols, rows } = terminal;
  terminalAPI.resize(cols, rows);
}, [leftPanelCollapsed, rightPanelCollapsed]);
```

---

### Challenge 3: Claude Code TUI Rendering

**Problem:** Complex TUI apps might have issues in xterm.js

**Testing plan:**
1. Run `claude` in embedded terminal
2. Test basic prompts and responses
3. Test file editing
4. Test tool executions
5. Document any rendering glitches

**Acceptance criteria:**
- Basic chat works ✅
- Tool execution visible ✅
- Can read files ✅
- Can write files ✅

**If glitches found:**
- Report to xterm.js/Claude Code teams
- Implement fallback button
- User can choose embedded vs. external

---

### Challenge 4: Shell Environment

**Problem:** Shell needs proper environment setup

**Solution:**
```typescript
const shell = pty.spawn(
  process.env.SHELL || '/bin/zsh',
  ['--login'], // Load user's shell config
  {
    env: {
      ...process.env,
      TERM: 'xterm-256color',
      COLORTERM: 'truecolor',
      // Remove variables that might confuse apps
      VSCODE_GIT_IPC_HANDLE: undefined,
    },
  }
);
```

---

## Testing Strategy

### Unit Tests
- IPC handler tests (input/output flow)
- Directory tracking logic
- Terminal resize calculations

### Integration Tests
- Spawn shell and execute commands
- Verify output appears in UI
- Test shell restart on crash
- Test cleanup on app quit

### Manual Tests
- Run `ls`, `cd`, `pwd` - verify basic commands
- Run `claude` - verify TUI renders
- Collapse/expand panels - verify terminal resizes
- Change directories - verify file browser updates
- Quit app - verify shell process terminates

---

## Dependencies to Add

```json
{
  "dependencies": {
    "xterm": "^5.3.0",
    "xterm-addon-fit": "^0.8.0",
    "xterm-addon-web-links": "^0.9.0"
  },
  "devDependencies": {
    "node-pty": "^1.0.0",
    "@types/node-pty": "^1.0.0",
    "electron-rebuild": "^3.2.9"
  }
}
```

**Note:** May hit esbuild issue again during `npm install`. If so:
- Install on different machine
- Or use webpack fallback (previously discussed)

---

## Success Criteria

**Phase 2a Complete:**
- ✅ Terminal renders in center panel
- ✅ Can execute shell commands
- ✅ Output displays correctly
- ✅ Terminal resizes properly
- ✅ Shell persists during app session

**Phase 2b Complete:**
- ✅ `claude` command launches
- ✅ Basic chat interaction works
- ✅ File operations work
- ✅ Fallback button available if needed

**Phase 2c Complete:**
- ✅ Current directory tracked
- ✅ File browser syncs automatically
- ✅ Directory changes propagate within 1 second

---

## Timeline Estimate

- **Phase 2a (Basic Terminal):** 2-3 days
- **Phase 2b (Claude Code):** 1-2 days + testing
- **Phase 2c (Directory Tracking):** 1 day

**Total:** 4-6 days of focused development

**Blockers:**
- esbuild approval (in progress)
- node-pty compilation (may need troubleshooting)
- Claude Code TUI behavior (unknown until tested)

---

## Next Steps

1. **Once esbuild approved:** Install xterm.js and node-pty
2. **Create Terminal component:** Wire up xterm.js in React
3. **Set up IPC:** Add terminal APIs to preload
4. **Spawn shell:** Implement PTY management in main
5. **Test basic flow:** Ensure commands execute and output appears
6. **Iterate:** Add features, fix issues, polish UX

---

## Open Questions

1. **Should we auto-run `claude` on terminal launch?**
   - Pro: Instant AI assistant
   - Con: Might be intrusive, user might want plain shell first
   - Decision: Let user decide, save preference

2. **How to handle multiple terminals?**
   - Phase 2: Single terminal only
   - Future: Tab system for multiple shells?

3. **Should terminal persist across app restarts?**
   - Phase 2: No, fresh shell each launch
   - Future: Save session state (tmux integration?)

---

## References

- [xterm.js Documentation](https://xtermjs.org/)
- [node-pty GitHub](https://github.com/microsoft/node-pty)
- [Electron IPC Guide](https://www.electronjs.org/docs/latest/tutorial/ipc)
- [Apple HIG - Typography](https://developer.apple.com/design/human-interface-guidelines/typography)
