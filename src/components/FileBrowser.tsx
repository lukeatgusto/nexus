import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { FileNode } from '@/types/terminal';

// ---------------------------------------------------------------------------
// File Tree Node
// ---------------------------------------------------------------------------

interface FileTreeNodeProps {
  node: FileNode;
  depth: number;
  expandedPaths: Set<string>;
  onToggle: (path: string) => void;
  onContextMenu: (e: React.MouseEvent, node: FileNode) => void;
}

function FileTreeNode({ node, depth, expandedPaths, onToggle, onContextMenu }: FileTreeNodeProps) {
  const isExpanded = expandedPaths.has(node.path);
  const [children, setChildren] = useState<FileNode[]>([]);
  const [loading, setLoading] = useState(false);

  // Load children when a directory is expanded
  useEffect(() => {
    if (node.isDirectory && isExpanded && children.length === 0) {
      setLoading(true);
      window.fileSystemAPI.readDirectory(node.path).then((nodes) => {
        setChildren(nodes);
        setLoading(false);
      }).catch(() => {
        setLoading(false);
      });
    }
  }, [isExpanded, node.isDirectory, node.path, children.length]);

  const handleClick = useCallback(() => {
    if (node.isDirectory) {
      onToggle(node.path);
    } else {
      window.fileSystemAPI.openFile(node.path);
    }
  }, [node, onToggle]);

  const icon = node.isDirectory
    ? (isExpanded ? '\u{1F4C2}' : '\u{1F4C1}')
    : node.icon;

  return (
    <>
      <div
        className="flex items-center hover:bg-macos-gray-200 dark:hover:bg-macos-gray-700/30 p-1 rounded cursor-pointer select-none"
        style={{ paddingLeft: `${depth * 16 + 4}px` }}
        onClick={handleClick}
        onContextMenu={(e) => onContextMenu(e, node)}
      >
        <span className="mr-1.5 text-[11px] flex-shrink-0">{icon}</span>
        <span className="text-[11px] font-mono text-macos-gray-800 dark:text-macos-gray-300 truncate">
          {node.name}{node.isDirectory ? '/' : ''}
        </span>
      </div>
      {node.isDirectory && isExpanded && (
        loading ? (
          <div
            className="text-[10px] text-macos-gray-500 italic p-1"
            style={{ paddingLeft: `${(depth + 1) * 16 + 4}px` }}
          >
            Loading...
          </div>
        ) : (
          children.map((child) => (
            <FileTreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              expandedPaths={expandedPaths}
              onToggle={onToggle}
              onContextMenu={onContextMenu}
            />
          ))
        )
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Context Menu
// ---------------------------------------------------------------------------

interface ContextMenuProps {
  x: number;
  y: number;
  node: FileNode;
  onClose: () => void;
}

function ContextMenu({ x, y, node, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const menuItems = [
    {
      label: node.isDirectory ? 'Open in Finder' : 'Open',
      action: () => {
        if (node.isDirectory) {
          window.fileSystemAPI.revealInFinder(node.path);
        } else {
          window.fileSystemAPI.openFile(node.path);
        }
        onClose();
      },
    },
    {
      label: 'Reveal in Finder',
      action: () => {
        window.fileSystemAPI.revealInFinder(node.path);
        onClose();
      },
    },
    {
      label: 'Copy Path',
      action: () => {
        window.fileSystemAPI.copyPath(node.path);
        onClose();
      },
    },
  ];

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white dark:bg-macos-gray-800 border border-macos-gray-200 dark:border-macos-gray-700 rounded-lg shadow-lg py-1 min-w-[160px]"
      style={{ left: x, top: y }}
    >
      {menuItems.map((item) => (
        <button
          key={item.label}
          onClick={item.action}
          className="w-full text-left px-3 py-1.5 text-[11px] text-macos-gray-800 dark:text-macos-gray-200 hover:bg-macos-blue-500 hover:text-white transition-colors"
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// File Browser (main export)
// ---------------------------------------------------------------------------

function FileBrowser() {
  const [cwd, setCwd] = useState<string>('');
  const [rootNodes, setRootNodes] = useState<FileNode[]>([]);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; node: FileNode } | null>(null);
  const [loading, setLoading] = useState(true);

  // Load a directory's contents into the root view
  const loadDirectory = useCallback(async (dirPath: string) => {
    setLoading(true);
    try {
      const nodes = await window.fileSystemAPI.readDirectory(dirPath);
      setRootNodes(nodes);
      // Reset expanded folders when root changes
      setExpandedPaths(new Set());
    } catch {
      setRootNodes([]);
    }
    setLoading(false);
  }, []);

  // Get initial CWD and load it
  useEffect(() => {
    window.terminalAPI.getCwd().then((dir) => {
      setCwd(dir);
      loadDirectory(dir);
    });
  }, [loadDirectory]);

  // Listen for CWD changes from terminal
  useEffect(() => {
    const cleanup = window.terminalAPI.onCwdChange((newCwd) => {
      setCwd(newCwd);
      loadDirectory(newCwd);
    });
    return cleanup;
  }, [loadDirectory]);

  const handleToggle = useCallback((path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent, node: FileNode) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, node });
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  // Shorten path for display: replace homedir with ~
  const displayPath = cwd.replace(/^\/Users\/[^/]+/, '~');

  return (
    <div>
      <div className="text-[11px] text-macos-gray-500 mb-2 truncate" title={cwd}>
        {displayPath}
      </div>
      {loading ? (
        <div className="text-[10px] text-macos-gray-500 italic">Loading...</div>
      ) : rootNodes.length === 0 ? (
        <div className="text-[10px] text-macos-gray-500 italic">Empty directory</div>
      ) : (
        <div className="space-y-0.5">
          {rootNodes.map((node) => (
            <FileTreeNode
              key={node.path}
              node={node}
              depth={0}
              expandedPaths={expandedPaths}
              onToggle={handleToggle}
              onContextMenu={handleContextMenu}
            />
          ))}
        </div>
      )}

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          node={contextMenu.node}
          onClose={closeContextMenu}
        />
      )}
    </div>
  );
}

export default FileBrowser;
