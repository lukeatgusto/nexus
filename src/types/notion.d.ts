/** Task returned from the Notion service */
export interface NotionTask {
  id: string;
  pageId: string;
  title: string;
  priority: 'High' | 'Medium' | 'Low' | null;
  status: string | null;
  dueDate: string | null;
  notionUrl: string;
}

/** Notion API exposed via contextBridge in preload.ts */
export interface NotionAPI {
  isConnected: () => Promise<boolean>;
  configure: (apiKey: string, databaseId: string, userEmail: string) => Promise<void>;
  testConnection: () => Promise<void>;
  getTasks: () => Promise<NotionTask[]>;
  openTask: (notionUrl: string) => void;
  openDatabase: () => void;
  disconnect: () => Promise<void>;
}

export {};
