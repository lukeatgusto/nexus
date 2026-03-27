import fs from 'fs';
import path from 'path';

export interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  icon: string;
  children?: FileNode[];
}

/**
 * Maps file extension to an emoji icon.
 */
function getFileIcon(fileName: string, isDirectory: boolean): string {
  if (isDirectory) return '\u{1F4C1}'; // collapsed folder

  const ext = path.extname(fileName).toLowerCase();
  switch (ext) {
    case '.md':
      return '\u{1F4DD}'; // memo
    case '.txt':
      return '\u{1F4C4}'; // page facing up
    case '.js':
    case '.ts':
    case '.tsx':
    case '.jsx':
      return '\u{1F4DC}'; // scroll
    case '.json':
    case '.yaml':
    case '.yml':
    case '.toml':
      return '\u{1F4CB}'; // clipboard
    case '.html':
    case '.htm':
      return '\u{1F310}'; // globe with meridians
    case '.css':
    case '.scss':
    case '.sass':
    case '.less':
      return '\u{1F3A8}'; // artist palette
    case '.png':
    case '.jpg':
    case '.jpeg':
    case '.gif':
    case '.svg':
    case '.ico':
    case '.webp':
      return '\u{1F5BC}\uFE0F'; // framed picture
    case '.zip':
    case '.tar':
    case '.gz':
    case '.rar':
    case '.7z':
      return '\u{1F4E6}'; // package
    case '.lock':
    case '.env':
    case '.gitignore':
    case '.eslintrc':
    case '.prettierrc':
      return '\u2699\uFE0F'; // gear
    default:
      return '\u{1F4C4}'; // page facing up
  }
}

/**
 * Reads a single directory level (non-recursive). Returns entries sorted
 * with directories first, then files, each group alphabetically.
 * Hidden files (starting with .) are excluded.
 */
export function readDirectory(dirPath: string): FileNode[] {
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    const nodes: FileNode[] = entries
      .filter((entry) => !entry.name.startsWith('.'))
      .map((entry) => {
        const fullPath = path.join(dirPath, entry.name);
        const isDir = entry.isDirectory();
        return {
          name: entry.name,
          path: fullPath,
          isDirectory: isDir,
          icon: getFileIcon(entry.name, isDir),
        };
      });

    // Sort: directories first, then files, alphabetical within each group
    nodes.sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) {
        return a.isDirectory ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });

    return nodes;
  } catch {
    return [];
  }
}
