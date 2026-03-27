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
