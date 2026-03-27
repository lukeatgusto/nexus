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
 * Resolve a user email to a Notion user ID.
 * Returns null if the email cannot be found.
 */
async function resolveUserId(email: string): Promise<string | null> {
  if (!client) {
    throw new Error('Notion client not initialized');
  }

  try {
    const response = await client.users.list({});
    const user = response.results.find((u: any) => {
      if (u.type === 'person' && u.person?.email) {
        return u.person.email.toLowerCase() === email.toLowerCase();
      }
      return false;
    });
    return user?.id || null;
  } catch (error) {
    console.error('Failed to resolve user ID:', error);
    return null;
  }
}

/**
 * Configure the service with new credentials and persist them.
 * Attempts to resolve the email to a Notion user ID for filtering.
 */
export async function configure(
  apiKey: string,
  databaseId: string,
  userEmail: string
): Promise<void> {
  client = new Client({ auth: apiKey });

  // Try to resolve the email to a user ID
  const userId = await resolveUserId(userEmail);

  credentials = { apiKey, databaseId, userEmail, userId: userId || undefined };
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
 * Filters: Assigned To contains userId (if available), Due Date = today, Status != Done.
 * Returns tasks sorted by priority (High > Medium > Low > none).
 */
export async function getTodaysTasks(): Promise<NotionTask[]> {
  if (!client || !credentials) {
    throw new Error('Notion is not configured');
  }

  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  // Build filter conditions
  const filterConditions: any[] = [
    {
      property: 'Due Date',
      date: {
        equals: today,
      },
    },
    {
      property: 'Status',
      status: {
        does_not_equal: 'Done',
      },
    },
  ];

  // Only add assignee filter if we have a resolved user ID
  if (credentials.userId) {
    filterConditions.push({
      property: 'Assigned To',
      people: {
        contains: credentials.userId,
      },
    });
  }

  // Query with filters: due date = today, assigned to user (if available), not done
  const response = await client.dataSources.query({
    data_source_id: credentials.databaseId,
    filter: {
      and: filterConditions,
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
