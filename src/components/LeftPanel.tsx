import React from 'react';
import { useAppContext } from '@/contexts/AppContext';
import PanelHeader from './PanelHeader';

function LeftPanel() {
  const { toggleLeftPanel } = useAppContext();

  return (
    <div className="h-full flex flex-col bg-macos-gray-100/50 dark:bg-macos-gray-900/30 border-r border-macos-gray-200 dark:border-macos-gray-900">
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
          <div className="bg-white/80 dark:bg-macos-gray-900/40 rounded-lg p-3 border border-macos-gray-200 dark:border-macos-gray-700/50">
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
          <div className="border-l-3 border-red-500 bg-red-500/20 dark:bg-red-500/10 rounded-r-lg p-3 cursor-pointer hover:bg-red-500/30 dark:hover:bg-red-500/20 transition-colors">
            <div className="text-[12px] font-medium text-macos-gray-200">Review Q2 roadmap</div>
            <div className="text-[10px] text-macos-gray-400 mt-1">🔴 High</div>
          </div>
          <div className="border-l-3 border-yellow-500 bg-yellow-500/20 dark:bg-yellow-500/10 rounded-r-lg p-3 cursor-pointer hover:bg-yellow-500/30 dark:hover:bg-yellow-500/20 transition-colors">
            <div className="text-[12px] font-medium text-macos-gray-200">Approve hiring req</div>
            <div className="text-[10px] text-macos-gray-400 mt-1">🟡 Medium</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LeftPanel;
