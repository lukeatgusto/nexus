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
