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
