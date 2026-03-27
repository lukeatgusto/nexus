import React, { useEffect, useRef, useCallback } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import { useAppContext } from '@/contexts/AppContext';

const DARK_THEME = {
  background: '#1C1C1E',
  foreground: '#E5E5EA',
  cursor: '#E5E5EA',
  cursorAccent: '#1C1C1E',
  selectionBackground: '#007AFF44',
  selectionForeground: '#E5E5EA',
  black: '#1C1C1E',
  red: '#FF3B30',
  green: '#34C759',
  yellow: '#FFCC00',
  blue: '#007AFF',
  magenta: '#AF52DE',
  cyan: '#5AC8FA',
  white: '#E5E5EA',
  brightBlack: '#636366',
  brightRed: '#FF6961',
  brightGreen: '#4CD964',
  brightYellow: '#FFD60A',
  brightBlue: '#5AC8FA',
  brightMagenta: '#DA8FFF',
  brightCyan: '#70D7FF',
  brightWhite: '#F5F5F7',
};

const LIGHT_THEME = {
  background: '#FFFFFF',
  foreground: '#000000',
  cursor: '#000000',
  cursorAccent: '#FFFFFF',
  selectionBackground: '#007AFF44',
  selectionForeground: '#000000',
  black: '#000000',
  red: '#FF3B30',
  green: '#34C759',
  yellow: '#FFCC00',
  blue: '#007AFF',
  magenta: '#AF52DE',
  cyan: '#5AC8FA',
  white: '#E5E5EA',
  brightBlack: '#8E8E93',
  brightRed: '#FF6961',
  brightGreen: '#4CD964',
  brightYellow: '#FFD60A',
  brightBlue: '#5AC8FA',
  brightMagenta: '#DA8FFF',
  brightCyan: '#70D7FF',
  brightWhite: '#F5F5F7',
};

function Terminal() {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const cleanupRef = useRef<Array<() => void>>([]);
  const { theme, leftPanelCollapsed, rightPanelCollapsed } = useAppContext();

  // Fit terminal to container
  const fitTerminal = useCallback(() => {
    const fitAddon = fitAddonRef.current;
    if (!fitAddon) return;

    try {
      fitAddon.fit();
      const xterm = xtermRef.current;
      if (xterm) {
        window.terminalAPI.resize(xterm.cols, xterm.rows);
      }
    } catch {
      // Ignore fit errors during transitions
    }
  }, []);

  // Initialize terminal on mount
  useEffect(() => {
    if (!terminalRef.current) return;

    const xterm = new XTerm({
      fontFamily: "'SF Mono', Monaco, Menlo, 'Courier New', monospace",
      fontSize: 13,
      lineHeight: 1.4,
      cursorBlink: true,
      cursorStyle: 'bar',
      scrollback: 10000,
      allowProposedApi: true,
      theme: theme === 'dark' ? DARK_THEME : LIGHT_THEME,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    xterm.loadAddon(fitAddon);
    xterm.loadAddon(webLinksAddon);

    xtermRef.current = xterm;
    fitAddonRef.current = fitAddon;

    // Open terminal in the container
    xterm.open(terminalRef.current);

    // Initial fit after a brief delay to let the DOM settle
    requestAnimationFrame(() => {
      fitAddon.fit();
      const cols = xterm.cols;
      const rows = xterm.rows;
      window.terminalAPI.resize(cols, rows);
    });

    // Connect xterm input -> IPC -> shell stdin
    const inputDisposable = xterm.onData((data) => {
      window.terminalAPI.write(data);
    });

    // Connect shell stdout -> IPC -> xterm display
    const removeDataListener = window.terminalAPI.onData((data) => {
      xterm.write(data);
    });

    // Handle shell exit
    const removeExitListener = window.terminalAPI.onExit((_exitCode) => {
      xterm.write('\r\n\x1b[90m[Shell process exited]\x1b[0m\r\n');
    });

    // Handle window resize
    const handleResize = () => {
      fitAddon.fit();
      window.terminalAPI.resize(xterm.cols, xterm.rows);
    };
    window.addEventListener('resize', handleResize);

    // Store cleanup functions
    cleanupRef.current = [
      () => inputDisposable.dispose(),
      removeDataListener,
      removeExitListener,
      () => window.removeEventListener('resize', handleResize),
    ];

    // Focus the terminal
    xterm.focus();

    return () => {
      // Run all cleanup functions
      cleanupRef.current.forEach((fn) => fn());
      cleanupRef.current = [];

      xterm.dispose();
      xtermRef.current = null;
      fitAddonRef.current = null;
    };
    // Only run on mount/unmount - theme changes handled separately
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update theme without re-creating the terminal
  useEffect(() => {
    if (xtermRef.current) {
      xtermRef.current.options.theme = theme === 'dark' ? DARK_THEME : LIGHT_THEME;
    }
  }, [theme]);

  // Re-fit when panels collapse/expand
  useEffect(() => {
    // Delay fit to after the CSS transition completes
    const timer = setTimeout(() => {
      fitTerminal();
    }, 320); // slightly longer than the 300ms transition
    return () => clearTimeout(timer);
  }, [leftPanelCollapsed, rightPanelCollapsed, fitTerminal]);

  // Handle ResizeObserver for more reliable resize detection
  useEffect(() => {
    const container = terminalRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      fitTerminal();
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [fitTerminal]);

  return (
    <div
      ref={terminalRef}
      className="w-full h-full"
      style={{
        // Ensure xterm fills the container
        padding: '8px',
        boxSizing: 'border-box',
        backgroundColor: theme === 'dark' ? '#1C1C1E' : '#FFFFFF',
      }}
    />
  );
}

export default Terminal;
