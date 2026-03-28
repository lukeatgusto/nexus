import React, { useState, useEffect } from 'react';
import Terminal from './Terminal';

function CenterPanel() {
  const [cwd, setCwd] = useState<string>('~');

  // Poll for working directory updates
  useEffect(() => {
    const pollCwd = async () => {
      try {
        const currentCwd = await window.terminalAPI.getCwd();
        // Shorten home directory to ~
        const shortened = currentCwd.replace(/^\/Users\/[^/]+/, '~');
        setCwd(shortened);
      } catch {
        // Ignore errors during polling
      }
    };

    // Initial poll
    pollCwd();

    // Poll every 2 seconds
    const interval = setInterval(pollCwd, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-full flex flex-col bg-macos-gray-200/30 dark:bg-black/40">
      {/* Header */}
      <div className="h-[40px] px-4 border-b border-macos-gray-200 dark:border-macos-gray-900 flex items-center justify-between bg-white/30 dark:bg-macos-gray-900/30 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm">&#x1F4BB;</span>
          <span className="text-[13px] font-semibold text-macos-gray-700 dark:text-macos-gray-200">
            Terminal
          </span>
        </div>
        <span className="text-[11px] text-macos-gray-500 truncate ml-4">{cwd}</span>
      </div>

      {/* Terminal */}
      <div className="flex-1 min-h-0">
        <Terminal />
      </div>
    </div>
  );
}

export default CenterPanel;
