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
