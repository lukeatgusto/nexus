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
