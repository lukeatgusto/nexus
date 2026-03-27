import React from 'react';

function CenterPanel() {
  return (
    <div className="h-full flex flex-col bg-macos-gray-200/30 dark:bg-black/40">
      {/* Header */}
      <div className="h-[40px] px-4 border-b border-macos-gray-200 dark:border-macos-gray-900 flex items-center justify-between bg-white/30 dark:bg-macos-gray-900/30">
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

        <div className="mt-4 p-3 bg-macos-gray-100 dark:bg-black/30 rounded-lg border-l-2 border-macos-blue/50">
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
