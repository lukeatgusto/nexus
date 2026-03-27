import React, { useState } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import PanelHeader from './PanelHeader';

type Tab = 'files' | 'agents';

function RightPanel() {
  const { toggleRightPanel } = useAppContext();
  const [activeTab, setActiveTab] = useState<Tab>('files');

  return (
    <div className="h-full flex flex-col bg-macos-gray-100/50 dark:bg-macos-gray-900/30 border-l border-macos-gray-200 dark:border-macos-gray-900">
      <PanelHeader
        title="Tools"
        icon="🔧"
        onCollapse={toggleRightPanel}
        collapseDirection="right"
      />

      {/* Tabs */}
      <div className="px-3 py-2 border-b border-macos-gray-200 dark:border-macos-gray-900 flex gap-2">
        <button
          onClick={() => setActiveTab('files')}
          className={`
            px-3 py-1.5 text-[11px] rounded-md transition-colors
            ${activeTab === 'files'
              ? 'bg-macos-gray-200 dark:bg-macos-gray-700/50 text-macos-gray-900 dark:text-macos-gray-200'
              : 'text-macos-gray-600 dark:text-macos-gray-400 hover:text-macos-gray-900 dark:hover:text-macos-gray-200 hover:bg-macos-gray-200/50 dark:hover:bg-macos-gray-700/30'
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
              ? 'bg-macos-gray-200 dark:bg-macos-gray-700/50 text-macos-gray-900 dark:text-macos-gray-200'
              : 'text-macos-gray-600 dark:text-macos-gray-400 hover:text-macos-gray-900 dark:hover:text-macos-gray-200 hover:bg-macos-gray-200/50 dark:hover:bg-macos-gray-700/30'
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
              <div className="hover:bg-macos-gray-200 dark:hover:bg-macos-gray-700/30 p-1 rounded cursor-pointer">
                📂 docs/
              </div>
              <div className="hover:bg-macos-gray-200 dark:hover:bg-macos-gray-700/30 p-1 pl-4 rounded cursor-pointer">
                📄 README.md
              </div>
              <div className="hover:bg-macos-gray-200 dark:hover:bg-macos-gray-700/30 p-1 pl-4 rounded cursor-pointer">
                📄 spec.md
              </div>
              <div className="hover:bg-macos-gray-200 dark:hover:bg-macos-gray-700/30 p-1 rounded cursor-pointer">
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
