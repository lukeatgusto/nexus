# Phase 1: Foundation & Layout Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up Electron + React + Tailwind project with three-panel layout, collapsible sidebars, and Apple HIG styling

**Architecture:** Electron app with React frontend built via Vite. Three-column flexbox layout (left panel 280px, center flex-1, right panel 300px). Panels collapse via CSS transitions. Context API for global state (panel collapse states, theme). Tailwind with custom theme matching macOS system colors.

**Tech Stack:** Electron 28+, React 18, TypeScript, Tailwind CSS 3, Vite 5, electron-builder

---

## Chunk 1: Project Scaffolding

**Scope:** Initial project setup - npm init, dependencies, TypeScript config, build tools

### File Structure Overview

```
nexus/
├── package.json                  # Dependencies and scripts
├── tsconfig.json                 # TypeScript config
├── electron-builder.yml          # Build configuration
├── electron/                     # Electron main process
│   └── main.ts                   # Main process entry
├── src/                          # React app
│   ├── main.tsx                  # React entry point
│   ├── App.tsx                   # Root component
│   ├── index.css                 # Global styles + Tailwind
│   ├── contexts/                 # React contexts
│   │   └── AppContext.tsx        # Global state
│   ├── components/               # React components
│   │   ├── Layout.tsx            # Three-panel layout
│   │   ├── LeftPanel.tsx         # Calendar + Tasks panel
│   │   ├── CenterPanel.tsx       # Terminal panel
│   │   ├── RightPanel.tsx        # Files + Agents panel
│   │   └── PanelHeader.tsx       # Reusable panel header
│   └── types/                    # TypeScript types
│       └── index.ts              # Shared types
├── tailwind.config.js            # Tailwind configuration
├── postcss.config.js             # PostCSS config
├── vite.config.ts                # Vite build config
└── index.html                    # HTML entry point
```

---

### Task 1: Initialize Project

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.gitignore` (append to existing)

- [ ] **Step 1: Initialize npm project**

```bash
cd /Users/luke.zeller/Documents/BraveNewWorld/nexus
npm init -y
```

Expected: Creates package.json

- [ ] **Step 2: Install dependencies**

```bash
npm install react react-dom
npm install -D electron electron-builder vite @vitejs/plugin-react
npm install -D typescript @types/react @types/react-dom @types/node @types/electron
npm install -D tailwindcss postcss autoprefixer
npm install -D concurrently wait-on cross-env
```

Expected: Installs all packages, creates node_modules/

- [ ] **Step 3: Create TypeScript config**

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src", "electron"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 4: Create Node TypeScript config**

Create `tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts", "electron"]
}
```

- [ ] **Step 5: Update .gitignore**

Append to `.gitignore`:

```
# Electron
dist/
dist-electron/
out/
release/

# Build
.vite/

# macOS
.DS_Store

# IDE
.vscode/
.idea/
```

- [ ] **Step 6: Commit initial setup**

```bash
git add package.json package-lock.json tsconfig.json tsconfig.node.json .gitignore
git commit -m "chore: initialize project with dependencies and TypeScript config"
```

---

### Task 2: Configure Build Tools

**Files:**
- Create: `vite.config.ts`
- Create: `tailwind.config.js`
- Create: `postcss.config.js`
- Create: `electron-builder.yml`

- [ ] **Step 1: Create Vite config**

Create `vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
  },
});
```

- [ ] **Step 2: Initialize Tailwind**

```bash
npx tailwindcss init
```

Expected: Creates tailwind.config.js

- [ ] **Step 3: Configure Tailwind with macOS theme**

Replace `tailwind.config.js`:

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // macOS system colors
        'macos-blue': '#007AFF',
        'macos-red': '#FF3B30',
        'macos-yellow': '#FFCC00',
        'macos-green': '#34C759',
        'macos-gray': {
          50: '#F5F5F7',
          100: '#E5E5EA',
          200: '#D1D1D6',
          300: '#C7C7CC',
          400: '#AEAEB2',
          500: '#8E8E93',
          600: '#636366',
          700: '#48484A',
          800: '#3A3A3C',
          900: '#2C2C2E',
          950: '#1C1C1E',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro', 'Helvetica Neue', 'Arial', 'sans-serif'],
        mono: ['SF Mono', 'Monaco', 'Menlo', 'Courier New', 'monospace'],
      },
      spacing: {
        // 8px grid system
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '8': '32px',
        '10': '40px',
        '12': '48px',
      },
      borderRadius: {
        'macos': '8px',
      },
    },
  },
  plugins: [],
}
```

- [ ] **Step 4: Create PostCSS config**

Create `postcss.config.js`:

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

- [ ] **Step 5: Create Electron builder config**

Create `electron-builder.yml`:

```yaml
appId: com.lukeatgusto.nexus
productName: Nexus
directories:
  buildResources: build
  output: release
files:
  - dist/**/*
  - dist-electron/**/*
  - package.json
mac:
  target:
    - dmg
  category: public.app-category.productivity
  icon: build/icon.icns
dmg:
  title: Nexus
  icon: build/icon.icns
```

- [ ] **Step 6: Commit build configuration**

```bash
git add vite.config.ts tailwind.config.js postcss.config.js electron-builder.yml
git commit -m "chore: configure Vite, Tailwind, and electron-builder"
```

---

### Task 3: Create Electron Main Process

**Files:**
- Create: `electron/main.ts`
- Modify: `package.json` (add scripts)

- [ ] **Step 1: Create main process**

Create `electron/main.ts`:

```typescript
import { app, BrowserWindow, nativeTheme } from 'electron';
import path from 'path';

let mainWindow: BrowserWindow | null = null;

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
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
```

- [ ] **Step 2: Create preload script placeholder**

Create `electron/preload.ts`:

```typescript
import { contextBridge } from 'electron';

// Expose APIs to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
});
```

- [ ] **Step 3: Add npm scripts**

Update `package.json` scripts section:

```json
{
  "scripts": {
    "dev": "concurrently -k \"npm run dev:vite\" \"npm run dev:electron\"",
    "dev:vite": "vite",
    "dev:electron": "wait-on http://localhost:5173 && cross-env VITE_DEV_SERVER_URL=http://localhost:5173 electron .",
    "build": "tsc && vite build && electron-builder",
    "build:mac": "npm run build -- --mac",
    "preview": "vite preview"
  },
  "main": "dist-electron/main.js"
}
```

- [ ] **Step 4: Commit Electron setup**

```bash
git add electron/main.ts electron/preload.ts package.json
git commit -m "feat: add Electron main process and preload script"
```

---

### Task 4: Build Electron TypeScript Compilation

**Files:**
- Modify: `package.json` (add build script for electron)
- Create: `electron/tsconfig.json`

- [ ] **Step 1: Create Electron TypeScript config**

Create `electron/tsconfig.json`:

```json
{
  "extends": "../tsconfig.node.json",
  "compilerOptions": {
    "outDir": "../dist-electron",
    "module": "commonjs",
    "target": "ES2020"
  },
  "include": ["./**/*.ts"]
}
```

- [ ] **Step 2: Add Electron build script**

Update `package.json` scripts (add before "dev"):

```json
{
  "scripts": {
    "build:electron": "tsc -p electron/tsconfig.json",
    "dev": "concurrently -k \"npm run dev:vite\" \"npm run dev:electron\"",
    "dev:vite": "vite",
    "dev:electron": "npm run build:electron && wait-on http://localhost:5173 && cross-env VITE_DEV_SERVER_URL=http://localhost:5173 electron .",
    "build": "npm run build:electron && vite build && electron-builder",
    "build:mac": "npm run build -- --mac",
    "preview": "vite preview"
  }
}
```

- [ ] **Step 3: Test Electron build**

```bash
npm run build:electron
```

Expected: Creates dist-electron/main.js and dist-electron/preload.js

- [ ] **Step 4: Commit Electron build config**

```bash
git add electron/tsconfig.json package.json
git commit -m "chore: configure Electron TypeScript compilation"
```

---

## Chunk 2: React Application Foundation

**Scope:** HTML entry, React setup, global styles, Context API for state management

### Task 5: Create HTML Entry Point

**Files:**
- Create: `index.html`

- [ ] **Step 1: Create HTML file**

Create `index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Nexus</title>
  </head>
  <body class="overflow-hidden">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 2: Commit HTML entry**

```bash
git add index.html
git commit -m "feat: add HTML entry point"
```

---

### Task 6: Set Up React with Tailwind

**Files:**
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/index.css`

- [ ] **Step 1: Create main entry point**

Create `src/main.tsx`:

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

- [ ] **Step 2: Create global styles**

Create `src/index.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply font-sans bg-macos-gray-900 text-white antialiased;
    margin: 0;
    padding: 0;
    overflow: hidden;
  }
}
```

- [ ] **Step 3: Create placeholder App component**

Create `src/App.tsx`:

```typescript
import React from 'react';

function App() {
  return (
    <div className="h-screen w-screen flex items-center justify-center bg-macos-gray-900">
      <div className="text-center">
        <h1 className="text-4xl font-semibold mb-2">Nexus</h1>
        <p className="text-macos-gray-400 text-sm">Command Center</p>
      </div>
    </div>
  );
}

export default App;
```

- [ ] **Step 4: Test app runs**

```bash
npm run dev
```

Expected: Browser opens with "Nexus" centered on dark background

- [ ] **Step 5: Stop dev server and commit**

Press Ctrl+C to stop, then:

```bash
git add src/main.tsx src/App.tsx src/index.css
git commit -m "feat: add React app with Tailwind styles"
```

---

### Task 7: Create Global State Context

**Files:**
- Create: `src/types/index.ts`
- Create: `src/contexts/AppContext.tsx`

- [ ] **Step 1: Define types**

Create `src/types/index.ts`:

```typescript
export interface AppState {
  leftPanelCollapsed: boolean;
  rightPanelCollapsed: boolean;
  theme: 'light' | 'dark';
}

export interface AppContextType extends AppState {
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
}
```

- [ ] **Step 2: Create AppContext**

Create `src/contexts/AppContext.tsx`:

```typescript
import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppState, AppContextType } from '@/types';

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>({
    leftPanelCollapsed: false,
    rightPanelCollapsed: false,
    theme: 'dark', // Default to dark
  });

  // Sync with system theme
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setState(prev => ({ ...prev, theme: e.matches ? 'dark' : 'light' }));
    };

    // Set initial theme
    setState(prev => ({ ...prev, theme: mediaQuery.matches ? 'dark' : 'light' }));

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Apply theme class to document
  useEffect(() => {
    if (state.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [state.theme]);

  const toggleLeftPanel = () => {
    setState(prev => ({ ...prev, leftPanelCollapsed: !prev.leftPanelCollapsed }));
  };

  const toggleRightPanel = () => {
    setState(prev => ({ ...prev, rightPanelCollapsed: !prev.rightPanelCollapsed }));
  };

  const setTheme = (theme: 'light' | 'dark') => {
    setState(prev => ({ ...prev, theme }));
  };

  return (
    <AppContext.Provider
      value={{
        ...state,
        toggleLeftPanel,
        toggleRightPanel,
        setTheme,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
}
```

- [ ] **Step 3: Wrap App with Provider**

Update `src/main.tsx`:

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AppProvider } from './contexts/AppContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </React.StrictMode>,
);
```

- [ ] **Step 4: Commit context**

```bash
git add src/types/index.ts src/contexts/AppContext.tsx src/main.tsx
git commit -m "feat: add global state context for theme and panel collapse"
```

---

## Chunk 3: Three-Panel Layout Components

**Scope:** Layout component, panel components (Left, Center, Right), panel header, placeholder content

### Task 8: Create Layout Component

**Files:**
- Create: `src/components/Layout.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create Layout component**

Create `src/components/Layout.tsx`:

```typescript
import React from 'react';
import { useAppContext } from '@/contexts/AppContext';
import LeftPanel from './LeftPanel';
import CenterPanel from './CenterPanel';
import RightPanel from './RightPanel';

function Layout() {
  const { leftPanelCollapsed, rightPanelCollapsed } = useAppContext();

  return (
    <div className="h-screen w-screen flex bg-macos-gray-900 dark:bg-macos-gray-950">
      {/* Left Panel */}
      <div
        className={`
          flex-shrink-0 transition-all duration-300 ease-in-out
          ${leftPanelCollapsed ? 'w-0' : 'w-[280px]'}
          overflow-hidden
        `}
      >
        <LeftPanel />
      </div>

      {/* Center Panel */}
      <div className="flex-1 min-w-0">
        <CenterPanel />
      </div>

      {/* Right Panel */}
      <div
        className={`
          flex-shrink-0 transition-all duration-300 ease-in-out
          ${rightPanelCollapsed ? 'w-0' : 'w-[300px]'}
          overflow-hidden
        `}
      >
        <RightPanel />
      </div>
    </div>
  );
}

export default Layout;
```

- [ ] **Step 2: Update App to use Layout**

Update `src/App.tsx`:

```typescript
import React from 'react';
import Layout from './components/Layout';

function App() {
  return <Layout />;
}

export default App;
```

- [ ] **Step 3: Commit layout**

```bash
git add src/components/Layout.tsx src/App.tsx
git commit -m "feat: add three-panel layout with collapse transitions"
```

---

### Task 9: Create Panel Header Component

**Files:**
- Create: `src/components/PanelHeader.tsx`

- [ ] **Step 1: Create reusable panel header**

Create `src/components/PanelHeader.tsx`:

```typescript
import React from 'react';

interface PanelHeaderProps {
  title: string;
  icon?: string;
  onCollapse?: () => void;
  collapseDirection?: 'left' | 'right';
}

function PanelHeader({ title, icon, onCollapse, collapseDirection }: PanelHeaderProps) {
  return (
    <div className="h-[40px] px-4 border-b border-macos-gray-800 dark:border-macos-gray-900 flex items-center justify-between bg-macos-gray-800/50 dark:bg-macos-gray-900/50">
      <div className="flex items-center gap-2">
        {icon && <span className="text-sm">{icon}</span>}
        <span className="text-[13px] font-semibold text-macos-gray-200">{title}</span>
      </div>

      {onCollapse && (
        <button
          onClick={onCollapse}
          className="text-macos-gray-400 hover:text-macos-gray-200 transition-colors text-[11px] px-2 py-1 rounded hover:bg-macos-gray-700/50"
          aria-label={`Collapse ${collapseDirection} panel`}
        >
          {collapseDirection === 'left' ? '◀' : '▶'}
        </button>
      )}
    </div>
  );
}

export default PanelHeader;
```

- [ ] **Step 2: Commit panel header**

```bash
git add src/components/PanelHeader.tsx
git commit -m "feat: add reusable panel header component"
```

---

### Task 10: Create Left Panel (Overview)

**Files:**
- Create: `src/components/LeftPanel.tsx`

- [ ] **Step 1: Create LeftPanel component**

Create `src/components/LeftPanel.tsx`:

```typescript
import React from 'react';
import { useAppContext } from '@/contexts/AppContext';
import PanelHeader from './PanelHeader';

function LeftPanel() {
  const { toggleLeftPanel } = useAppContext();

  return (
    <div className="h-full flex flex-col bg-macos-gray-800/30 dark:bg-macos-gray-900/30 border-r border-macos-gray-800 dark:border-macos-gray-900">
      <PanelHeader
        title="Overview"
        icon="📊"
        onCollapse={toggleLeftPanel}
        collapseDirection="left"
      />

      {/* Calendar Section */}
      <div className="p-4 border-b border-macos-gray-800 dark:border-macos-gray-900">
        <div className="text-[12px] font-semibold text-macos-gray-300 mb-3">
          📅 Today's Meetings
        </div>
        <div className="space-y-2">
          {/* Placeholder meeting cards */}
          <div className="bg-macos-gray-800/40 dark:bg-macos-gray-900/40 rounded-lg p-3 border border-macos-gray-700/50">
            <div className="text-[12px] font-medium text-macos-gray-200">Team Standup</div>
            <div className="text-[11px] text-macos-gray-400 mt-1">9:00 AM • in 23 min</div>
            <button className="mt-2 w-full bg-macos-blue/30 hover:bg-macos-blue/40 text-macos-blue text-[11px] py-2 px-3 rounded-md transition-colors">
              🚀 Join & Open Notes
            </button>
          </div>
        </div>
      </div>

      {/* Tasks Section */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[12px] font-semibold text-macos-gray-300">
            ✅ Due Today
          </div>
          <button className="text-[10px] text-macos-gray-400 hover:text-macos-gray-200 px-2 py-1 rounded hover:bg-macos-gray-700/50 transition-colors">
            Open Board
          </button>
        </div>
        <div className="space-y-2">
          {/* Placeholder task items */}
          <div className="border-l-3 border-red-500 bg-red-500/10 rounded-r-lg p-3 cursor-pointer hover:bg-red-500/20 transition-colors">
            <div className="text-[12px] font-medium text-macos-gray-200">Review Q2 roadmap</div>
            <div className="text-[10px] text-macos-gray-400 mt-1">🔴 High</div>
          </div>
          <div className="border-l-3 border-yellow-500 bg-yellow-500/10 rounded-r-lg p-3 cursor-pointer hover:bg-yellow-500/20 transition-colors">
            <div className="text-[12px] font-medium text-macos-gray-200">Approve hiring req</div>
            <div className="text-[10px] text-macos-gray-400 mt-1">🟡 Medium</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LeftPanel;
```

- [ ] **Step 2: Test left panel displays**

```bash
npm run dev
```

Expected: See left panel with placeholder meetings and tasks

- [ ] **Step 3: Stop dev server and commit**

```bash
git add src/components/LeftPanel.tsx
git commit -m "feat: add left panel with placeholder calendar and tasks"
```

---

### Task 11: Create Center Panel (Terminal)

**Files:**
- Create: `src/components/CenterPanel.tsx`

- [ ] **Step 1: Create CenterPanel component**

Create `src/components/CenterPanel.tsx`:

```typescript
import React from 'react';

function CenterPanel() {
  return (
    <div className="h-full flex flex-col bg-macos-gray-900/40 dark:bg-black/40">
      {/* Header */}
      <div className="h-[40px] px-4 border-b border-macos-gray-800 dark:border-macos-gray-900 flex items-center justify-between bg-macos-gray-800/30 dark:bg-macos-gray-900/30">
        <div className="flex items-center gap-2">
          <span className="text-sm">💻</span>
          <span className="text-[13px] font-semibold text-macos-gray-200">Terminal</span>
        </div>
        <span className="text-[11px] text-macos-gray-500">~/Documents/BraveNewWorld</span>
      </div>

      {/* Terminal content placeholder */}
      <div className="flex-1 p-4 font-mono text-[12px] text-macos-gray-300">
        <div className="opacity-60">$ claude</div>
        <div className="mt-2">Starting Claude Code...</div>
        <div className="mt-1 opacity-80">&gt;</div>

        <div className="mt-4 p-3 bg-black/30 rounded-lg border-l-2 border-macos-blue/50">
          <div className="text-[11px] opacity-60 mb-1">Claude interface embedded here</div>
          <div className="opacity-90">Running `claude` command via xterm.js</div>
          <div className="mt-2 opacity-70 text-[11px]">
            Full Claude Code experience with tools, skills, file editing
          </div>
        </div>
      </div>
    </div>
  );
}

export default CenterPanel;
```

- [ ] **Step 2: Test center panel displays**

```bash
npm run dev
```

Expected: See center panel with terminal placeholder

- [ ] **Step 3: Stop dev server and commit**

```bash
git add src/components/CenterPanel.tsx
git commit -m "feat: add center panel with terminal placeholder"
```

---

### Task 12: Create Right Panel (Tools)

**Files:**
- Create: `src/components/RightPanel.tsx`

- [ ] **Step 1: Create RightPanel component**

Create `src/components/RightPanel.tsx`:

```typescript
import React, { useState } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import PanelHeader from './PanelHeader';

type Tab = 'files' | 'agents';

function RightPanel() {
  const { toggleRightPanel } = useAppContext();
  const [activeTab, setActiveTab] = useState<Tab>('files');

  return (
    <div className="h-full flex flex-col bg-macos-gray-800/30 dark:bg-macos-gray-900/30 border-l border-macos-gray-800 dark:border-macos-gray-900">
      <PanelHeader
        title="Tools"
        icon="🔧"
        onCollapse={toggleRightPanel}
        collapseDirection="right"
      />

      {/* Tabs */}
      <div className="px-3 py-2 border-b border-macos-gray-800 dark:border-macos-gray-900 flex gap-2">
        <button
          onClick={() => setActiveTab('files')}
          className={`
            px-3 py-1.5 text-[11px] rounded-md transition-colors
            ${activeTab === 'files'
              ? 'bg-macos-gray-700/50 text-macos-gray-200'
              : 'text-macos-gray-400 hover:text-macos-gray-200 hover:bg-macos-gray-700/30'
            }
          `}
        >
          📁 Files
        </button>
        <button
          onClick={() => setActiveTab('agents')}
          className={`
            px-3 py-1.5 text-[11px] rounded-md transition-colors
            ${activeTab === 'agents'
              ? 'bg-macos-gray-700/50 text-macos-gray-200'
              : 'text-macos-gray-400 hover:text-macos-gray-200 hover:bg-macos-gray-700/30'
            }
          `}
        >
          🤖 Agents
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 overflow-y-auto">
        {activeTab === 'files' ? (
          <div>
            <div className="text-[11px] text-macos-gray-500 mb-2">~/Documents/BraveNewWorld</div>
            <div className="font-mono text-[11px] text-macos-gray-300 space-y-1">
              <div className="hover:bg-macos-gray-700/30 p-1 rounded cursor-pointer">
                📂 docs/
              </div>
              <div className="hover:bg-macos-gray-700/30 p-1 pl-4 rounded cursor-pointer">
                📄 README.md
              </div>
              <div className="hover:bg-macos-gray-700/30 p-1 pl-4 rounded cursor-pointer">
                📄 spec.md
              </div>
              <div className="hover:bg-macos-gray-700/30 p-1 rounded cursor-pointer">
                📂 src/
              </div>
            </div>
            <div className="mt-4 text-[10px] text-macos-gray-500">
              Right-click for actions:<br />
              • Open<br />
              • Reveal in Finder<br />
              • Copy path
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-[13px] font-semibold text-macos-gray-300 mb-2">
              Agents Dashboard
            </div>
            <div className="text-[11px] text-macos-gray-500">
              Coming Soon
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default RightPanel;
```

- [ ] **Step 2: Test right panel displays and tabs work**

```bash
npm run dev
```

Expected: See right panel with Files/Agents tabs, tab switching works

- [ ] **Step 3: Stop dev server and commit**

```bash
git add src/components/RightPanel.tsx
git commit -m "feat: add right panel with files and agents tabs"
```

---

## Chunk 4: Polish and Theme Support

**Scope:** Light mode support, collapse/expand functionality, README, final testing

### Task 13: Add Light Mode Support

**Files:**
- Modify: `src/index.css`
- Modify: `src/components/Layout.tsx`
- Modify: `src/components/LeftPanel.tsx`
- Modify: `src/components/CenterPanel.tsx`
- Modify: `src/components/RightPanel.tsx`
- Modify: `src/components/PanelHeader.tsx`

- [ ] **Step 1: Update global styles for light mode**

Update `src/index.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply font-sans antialiased;
    margin: 0;
    padding: 0;
    overflow: hidden;
  }

  /* Dark mode (default) */
  body {
    @apply bg-macos-gray-900 text-white;
  }

  /* Light mode */
  :root:not(.dark) body {
    @apply bg-macos-gray-50 text-macos-gray-900;
  }
}
```

- [ ] **Step 2: Update Layout for light mode**

Update `src/components/Layout.tsx` - change bg classes:

```typescript
// Change the outer div className from:
className="h-screen w-screen flex bg-macos-gray-900 dark:bg-macos-gray-950"

// To:
className="h-screen w-screen flex bg-macos-gray-50 dark:bg-macos-gray-950"
```

- [ ] **Step 3: Update LeftPanel for light mode**

Update `src/components/LeftPanel.tsx` - change bg classes:

```typescript
// Line 10: Update outer div
className="h-full flex flex-col bg-macos-gray-100/50 dark:bg-macos-gray-900/30 border-r border-macos-gray-200 dark:border-macos-gray-900"

// Lines for meeting card and tasks - add light mode variants
// For meeting card background:
className="bg-white/80 dark:bg-macos-gray-900/40 rounded-lg p-3 border border-macos-gray-200 dark:border-macos-gray-700/50"

// For task cards - update all three priority levels:
// High priority:
className="border-l-3 border-red-500 bg-red-500/20 dark:bg-red-500/10 rounded-r-lg p-3 cursor-pointer hover:bg-red-500/30 dark:hover:bg-red-500/20 transition-colors"

// Medium priority:
className="border-l-3 border-yellow-500 bg-yellow-500/20 dark:bg-yellow-500/10 rounded-r-lg p-3 cursor-pointer hover:bg-yellow-500/30 dark:hover:bg-yellow-500/20 transition-colors"
```

- [ ] **Step 4: Update CenterPanel for light mode**

Update `src/components/CenterPanel.tsx`:

```typescript
// Line 6: outer div
className="h-full flex flex-col bg-macos-gray-200/30 dark:bg-black/40"

// Line 8: header
className="h-[40px] px-4 border-b border-macos-gray-200 dark:border-macos-gray-900 flex items-center justify-between bg-white/30 dark:bg-macos-gray-900/30"

// Line 18: placeholder box
className="mt-4 p-3 bg-macos-gray-100 dark:bg-black/30 rounded-lg border-l-2 border-macos-blue/50"
```

- [ ] **Step 5: Update RightPanel for light mode**

Update `src/components/RightPanel.tsx`:

```typescript
// Line 13: outer div
className="h-full flex flex-col bg-macos-gray-100/50 dark:bg-macos-gray-900/30 border-l border-macos-gray-200 dark:border-macos-gray-900"

// Line 22: tabs container
className="px-3 py-2 border-b border-macos-gray-200 dark:border-macos-gray-900 flex gap-2"

// Lines 26-28, 37-39: Active tab button
className={`
  px-3 py-1.5 text-[11px] rounded-md transition-colors
  ${activeTab === 'files'
    ? 'bg-macos-gray-200 dark:bg-macos-gray-700/50 text-macos-gray-900 dark:text-macos-gray-200'
    : 'text-macos-gray-600 dark:text-macos-gray-400 hover:text-macos-gray-900 dark:hover:text-macos-gray-200 hover:bg-macos-gray-200/50 dark:hover:bg-macos-gray-700/30'
  }
`}

// Line 54: File tree hover
className="hover:bg-macos-gray-200 dark:hover:bg-macos-gray-700/30 p-1 rounded cursor-pointer"
```

- [ ] **Step 6: Update PanelHeader for light mode**

Update `src/components/PanelHeader.tsx`:

```typescript
// Line 11: outer div
className="h-[40px] px-4 border-b border-macos-gray-200 dark:border-macos-gray-900 flex items-center justify-between bg-white/50 dark:bg-macos-gray-900/50"

// Line 14: title text
className="text-[13px] font-semibold text-macos-gray-700 dark:text-macos-gray-200"

// Line 19: button
className="text-macos-gray-500 dark:text-macos-gray-400 hover:text-macos-gray-900 dark:hover:text-macos-gray-200 transition-colors text-[11px] px-2 py-1 rounded hover:bg-macos-gray-200 dark:hover:bg-macos-gray-700/50"
```

- [ ] **Step 7: Test light and dark modes**

```bash
npm run dev
```

Then in macOS System Settings:
- Go to Appearance
- Toggle between Light and Dark
- Verify app updates automatically

Expected: App switches between light/dark themes matching system

- [ ] **Step 8: Stop dev server and commit**

```bash
git add src/index.css src/components/*.tsx
git commit -m "feat: add full light mode support with automatic system theme sync"
```

---

### Task 14: Test Collapse Functionality

**Files:**
- None (testing only)

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Test left panel collapse**

Click the ◀ button in left panel header.
Expected: Left panel smoothly collapses to 0 width

- [ ] **Step 3: Test right panel collapse**

Click the ▶ button in right panel header.
Expected: Right panel smoothly collapses to 0 width

- [ ] **Step 4: Test both panels collapsed**

Collapse both panels.
Expected: Terminal takes full width, but no way to expand panels back (will fix in next task)

- [ ] **Step 5: Stop dev server**

Press Ctrl+C

---

### Task 15: Add Expand Buttons for Collapsed Panels

**Files:**
- Modify: `src/components/Layout.tsx`

- [ ] **Step 1: Add expand buttons to Layout**

Update `src/components/Layout.tsx`:

```typescript
import React from 'react';
import { useAppContext } from '@/contexts/AppContext';
import LeftPanel from './LeftPanel';
import CenterPanel from './CenterPanel';
import RightPanel from './RightPanel';

function Layout() {
  const { leftPanelCollapsed, rightPanelCollapsed, toggleLeftPanel, toggleRightPanel } = useAppContext();

  return (
    <div className="h-screen w-screen flex bg-macos-gray-50 dark:bg-macos-gray-950">
      {/* Left Panel */}
      <div
        className={`
          flex-shrink-0 transition-all duration-300 ease-in-out
          ${leftPanelCollapsed ? 'w-0' : 'w-[280px]'}
          overflow-hidden
        `}
      >
        <LeftPanel />
      </div>

      {/* Left Expand Button (visible when collapsed) */}
      {leftPanelCollapsed && (
        <button
          onClick={toggleLeftPanel}
          className="absolute left-2 top-2 z-10 w-8 h-8 flex items-center justify-center bg-macos-gray-200/80 dark:bg-macos-gray-800/80 hover:bg-macos-gray-300 dark:hover:bg-macos-gray-700 rounded-md text-macos-gray-700 dark:text-macos-gray-300 text-sm transition-colors backdrop-blur-sm"
          aria-label="Expand left panel"
        >
          ▶
        </button>
      )}

      {/* Center Panel */}
      <div className="flex-1 min-w-0">
        <CenterPanel />
      </div>

      {/* Right Expand Button (visible when collapsed) */}
      {rightPanelCollapsed && (
        <button
          onClick={toggleRightPanel}
          className="absolute right-2 top-2 z-10 w-8 h-8 flex items-center justify-center bg-macos-gray-200/80 dark:bg-macos-gray-800/80 hover:bg-macos-gray-300 dark:hover:bg-macos-gray-700 rounded-md text-macos-gray-700 dark:text-macos-gray-300 text-sm transition-colors backdrop-blur-sm"
          aria-label="Expand right panel"
        >
          ◀
        </button>
      )}

      {/* Right Panel */}
      <div
        className={`
          flex-shrink-0 transition-all duration-300 ease-in-out
          ${rightPanelCollapsed ? 'w-0' : 'w-[300px]'}
          overflow-hidden
        `}
      >
        <RightPanel />
      </div>
    </div>
  );
}

export default Layout;
```

- [ ] **Step 2: Test expand functionality**

```bash
npm run dev
```

- Collapse left panel → Expand button appears top-left → Click to expand
- Collapse right panel → Expand button appears top-right → Click to expand

Expected: Both panels can be collapsed and expanded smoothly

- [ ] **Step 3: Stop dev server and commit**

```bash
git add src/components/Layout.tsx
git commit -m "feat: add expand buttons for collapsed panels"
```

---

### Task 16: Create README

**Files:**
- Create: `README.md`

- [ ] **Step 1: Create project README**

Create `README.md`:

```markdown
# Nexus

Personal command center for macOS - integrates calendar, tasks, terminal, and file browser in one ultrawide-optimized window.

## Features (Phase 1 Complete)

- ✅ Three-panel layout optimized for ultrawide monitors
- ✅ Collapsible left (Calendar/Tasks) and right (Files/Agents) panels
- ✅ Dark/light mode with automatic system theme sync
- ✅ Apple Human Interface Guidelines compliance
- ✅ Native macOS look and feel

## Coming Soon

- Google Calendar integration
- Notion tasks integration
- Terminal with Claude Code
- File browser
- Agent dashboard

## Development

### Prerequisites

- Node.js 18+
- macOS (for native features)

### Getting Started

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for macOS
npm run build:mac
```

### Tech Stack

- Electron - Native macOS app
- React 18 - UI framework
- TypeScript - Type safety
- Tailwind CSS - Styling
- Vite - Build tool

## Project Structure

```
nexus/
├── electron/           # Electron main process
├── src/                # React application
│   ├── components/     # UI components
│   ├── contexts/       # React contexts
│   └── types/          # TypeScript types
└── docs/               # Documentation
    └── superpowers/
        ├── specs/      # Design specifications
        └── plans/      # Implementation plans
```

## License

MIT
```

- [ ] **Step 2: Commit README**

```bash
git add README.md
git commit -m "docs: add project README"
```

---

### Task 17: Final Testing and Phase 1 Completion

**Files:**
- None (testing and verification)

- [ ] **Step 1: Verify installation**

```bash
npm list --depth=0
```

Expected: Shows all installed packages without errors. If there are issues, run `npm install` to fix.

- [ ] **Step 2: Test development mode**

```bash
npm run dev
```

Verify:
- [ ] App launches in Electron window
- [ ] Three panels visible
- [ ] Left panel collapses/expands smoothly
- [ ] Right panel collapses/expands smoothly
- [ ] Tab switching works in right panel
- [ ] Light/dark theme sync with system works

- [ ] **Step 3: Test production build**

```bash
npm run build:mac
```

Expected: Build completes successfully, creates .dmg in release/

- [ ] **Step 4: Stop all processes**

Press Ctrl+C to stop dev server

- [ ] **Step 5: Push to GitHub**

```bash
git push origin main
```

Expected: All commits pushed to https://github.com/lukeatgusto/nexus

---

## Phase 1 Complete! 🎉

You now have:
- ✅ Working Electron + React + Tailwind app
- ✅ Three-panel layout with smooth collapse animations
- ✅ Dark/light mode support matching system preferences
- ✅ Apple HIG styling (fonts, colors, spacing)
- ✅ All code committed and pushed to GitHub

**Next Steps:**
- Phase 2: Terminal Integration with xterm.js and Claude Code
- Or: Continue polishing Phase 1 based on user feedback

**To run the app anytime:**
```bash
cd /Users/luke.zeller/Documents/BraveNewWorld/nexus
npm run dev
```
