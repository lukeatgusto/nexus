/**
 * Notion service for fetching tasks from a Notion database.
 * Runs in the main (Node.js) process.
 */
import { Client } from '@notionhq/client';
import {
  loadNotionCredentials,
  saveNotionCredentials,
  clearNotionCredentials,
  NotionCredentials,
} from './notionStore';

// Types for task data passed to the renderer
export interface NotionTask {
  id: string;
  pageId: string;
  title: string;
  priority: 'High' | 'Medium' | 'Low' | null;
  status: string | null;
  dueDate: string | null;
  notionUrl: string;
}

let client: Client | null = null;
let credentials: NotionCredentials | null = null;

/**
 * Initialize the service from stored credentials (called on app startup).
 */
export function initialize(): void {
  const stored = loadNotionCredentials();
  if (stored) {
    credentials = stored;
    client = new Client({ auth: stored.apiKey });
  }
}

/**
 * Check if the service has valid credentials configured.
 */
export function isConnected(): boolean {
  return client !== null && credentials !== null;
}

/**
 * Configure the service with new credentials and persist them.
 */
export function configure(apiKey: string, databaseId: string, userEmail: string): void {
  credentials = { apiKey, databaseId, userEmail };
  client = new Client({ auth: apiKey });
  saveNotionCredentials(credentials);
}

/**
 * Test the connection by querying the database with a minimal request.
 * Throws if the connection fails.
 */
export async function testConnection(): Promise<void> {
  if (!client || !credentials) {
    throw new Error('Notion is not configured');
  }

  // Try to query the data source with limit 1 to validate access
  await client.dataSources.query({
    data_source_id: credentials.databaseId,
    page_size: 1,
  });
}

/**
 * Fetch today's tasks assigned to the configured user.
 * Filters: Assigned To contains userEmail, Due Date = today, Status != Done.
 * Returns tasks sorted by priority (High > Medium > Low > none).
 */
export async function getTodaysTasks(): Promise<NotionTask[]> {
  if (!client || !credentials) {
    throw new Error('Notion is not configured');
  }

  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  // Query with filters: due date = today, assigned to user, not done
  const response = await client.dataSources.query({
    data_source_id: credentials.databaseId,
    filter: {
      and: [
        {
          property: 'Due Date',
          date: {
            equals: today,
          },
        },
        {
          property: 'Assigned To',
          people: {
            contains: credentials.userEmail,
          },
        },
        {
          property: 'Status',
          status: {
            does_not_equal: 'Done',
          },
        },
      ],
    },
    page_size: 50,
  });

  const tasks: NotionTask[] = response.results.map((page: Record<string, unknown>) => {
    const props = page.properties as Record<string, unknown>;

    // Extract title
    const titleProp = props['Name'] as { title?: Array<{ plain_text: string }> } | undefined;
    const title = titleProp?.title?.[0]?.plain_text || 'Untitled';

    // Extract priority (select property)
    const priorityProp = props['Priority'] as { select?: { name: string } | null } | undefined;
    const priorityName = priorityProp?.select?.name || null;
    const priority = (['High', 'Medium', 'Low'].includes(priorityName || '')
      ? priorityName
      : null) as NotionTask['priority'];

    // Extract status
    const statusProp = props['Status'] as { status?: { name: string } | null } | undefined;
    const status = statusProp?.status?.name || null;

    // Extract due date
    const dateProp = props['Due Date'] as { date?: { start: string } | null } | undefined;
    const dueDate = dateProp?.date?.start || null;

    const pageId = (page as { id: string }).id;
    const cleanId = pageId.replace(/-/g, '');

    return {
      id: pageId,
      pageId: cleanId,
      title,
      priority,
      status,
      dueDate,
      notionUrl: `notion://www.notion.so/${cleanId}`,
    };
  });

  // Sort by priority: High > Medium > Low > null
  const priorityOrder: Record<string, number> = { High: 0, Medium: 1, Low: 2 };
  tasks.sort((a, b) => {
    const aOrder = a.priority ? priorityOrder[a.priority] : 3;
    const bOrder = b.priority ? priorityOrder[b.priority] : 3;
    return aOrder - bOrder;
  });

  return tasks;
}

/**
 * Generate a deep link URL to open the Notion database.
 */
export function getDatabaseUrl(): string | null {
  if (!credentials) return null;
  const cleanId = credentials.databaseId.replace(/-/g, '');
  return `notion://www.notion.so/${cleanId}`;
}

/**
 * Disconnect and clear stored credentials.
 */
export function disconnect(): void {
  client = null;
  credentials = null;
  clearNotionCredentials();
}
