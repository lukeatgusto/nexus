# Phase 2c: Notion Tasks Integration

**Date:** 2026-03-27
**Status:** Planning
**Priority:** High - Key feature for left panel

---

## Goal

Display tasks assigned to the user that are due today from a Notion database, with color-coded priorities and one-click access to open tasks in Notion.

---

## User Experience

### First-Time Setup

```
User opens Nexus for first time (after Calendar setup)
         ↓
Left panel shows "Connect Notion" button
         ↓
User clicks "Connect Notion"
         ↓
Setup wizard opens:
  1. "Create Integration" guide
  2. "Get API Key" instructions
  3. "Find Database ID" helper
         ↓
User pastes API Key and Database ID
         ↓
Nexus tests connection
         ↓
Left panel now shows today's tasks
```

**Simpler than OAuth!** Just API key + Database ID.

---

### Daily Usage

**Left Panel displays:**
```
✅ Due Today
┌─────────────────────────────────┐
│ Review Q2 roadmap         🔴 High│
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ Approve hiring req      🟡 Medium│
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ Pufferfish v2 follow-up   🔵 Low│
└─────────────────────────────────┘

[Open Board]  [+ Add Task]  [⚙️]
```

**Task card shows:**
- Task name
- Priority indicator (color + emoji)
- Color-coded border/background

**Interactions:**
- Click task → Opens in Notion app
- Click "Open Board" → Opens Notion database
- Future: "+ Add Task" for quick capture

---

## Notion API Architecture

### Authentication: API Key (Simpler than OAuth!)

**No OAuth needed!** Notion uses internal integrations with API keys.

**User setup:**
1. Create Notion integration at https://www.notion.so/my-integrations
2. Copy "Internal Integration Token"
3. Share task database with integration
4. Paste token into Nexus

**API Key format:**
```
secret_abcdefghijklmnopqrstuvwxyz1234567890
```

**Storage:**
```typescript
// Stored in electron-store (encrypted)
settings.notion = {
  apiKey: 'secret_...',
  tasksDatabaseId: 'abc123...',
  userEmail: 'luke@gusto.com', // For filtering assigned tasks
};
```

---

## Database Structure

### Tasks Database Schema

**Required Properties:**
- **Name** (title) - Task title
- **Status** (select) - To Do, In Progress, Done
- **Assigned To** (person) - Who owns the task
- **Due Date** (date) - When it's due

**Optional Properties:**
- **Priority** (select) - High, Medium, Low (for color coding)
- **Tags** (multi-select) - Categories
- **Description** (rich text) - Details

**Example Notion database:**
```
┌───────────────────────┬────────────┬──────────────┬──────────┬──────────┐
│ Name                  │ Status     │ Assigned To  │ Due Date │ Priority │
├───────────────────────┼────────────┼──────────────┼──────────┼──────────┤
│ Review Q2 roadmap     │ To Do      │ Luke         │ Today    │ High     │
│ Approve hiring req    │ In Progress│ Luke         │ Today    │ Medium   │
│ Pufferfish follow-up  │ To Do      │ Luke         │ Today    │ Low      │
│ Update docs           │ Done       │ Luke         │ Today    │ Medium   │
│ Team planning         │ To Do      │ Sarah        │ Today    │ High     │
└───────────────────────┴────────────┴──────────────┴──────────┴──────────┘
```

**Query filter:**
- Assigned To = User
- Due Date = Today
- Status ≠ Done

---

## Implementation

### 1. Notion Service

```typescript
// src/services/notion/NotionService.ts
import { Client } from '@notionhq/client';

export interface NotionTask {
  id: string;
  name: string;
  status: 'To Do' | 'In Progress' | 'Done';
  priority?: 'High' | 'Medium' | 'Low';
  dueDate: string;
  url: string;
}

export class NotionService {
  private client: Client | null = null;
  private databaseId: string | null = null;
  private userEmail: string | null = null;

  /**
   * Initialize Notion client with API key
   */
  configure(apiKey: string, databaseId: string, userEmail: string) {
    this.client = new Client({ auth: apiKey });
    this.databaseId = databaseId;
    this.userEmail = userEmail;
  }

  /**
   * Test connection to Notion
   */
  async testConnection(): Promise<boolean> {
    try {
      if (!this.client || !this.databaseId) return false;

      // Try to query the database
      await this.client.databases.query({
        database_id: this.databaseId,
        page_size: 1,
      });

      return true;
    } catch (error) {
      console.error('Notion connection test failed:', error);
      return false;
    }
  }

  /**
   * Get tasks due today assigned to user
   */
  async getTodaysTasks(): Promise<NotionTask[]> {
    if (!this.client || !this.databaseId) {
      throw new Error('Notion not configured');
    }

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    const response = await this.client.databases.query({
      database_id: this.databaseId,
      filter: {
        and: [
          {
            property: 'Assigned To',
            people: {
              contains: this.userEmail,
            },
          },
          {
            property: 'Due Date',
            date: {
              equals: today,
            },
          },
          {
            property: 'Status',
            select: {
              does_not_equal: 'Done',
            },
          },
        ],
      },
      sorts: [
        {
          property: 'Priority',
          direction: 'ascending', // High, Medium, Low
        },
      ],
    });

    return response.results.map((page: any) => ({
      id: page.id,
      name: this.extractTitle(page),
      status: this.extractStatus(page),
      priority: this.extractPriority(page),
      dueDate: this.extractDueDate(page),
      url: page.url,
    }));
  }

  /**
   * Get database URL for "Open Board" link
   */
  getDatabaseUrl(): string {
    return `notion://www.notion.so/${this.databaseId?.replace(/-/g, '')}`;
  }

  /**
   * Open task in Notion app
   */
  openTask(taskId: string) {
    const url = `notion://www.notion.so/${taskId.replace(/-/g, '')}`;
    shell.openExternal(url);
  }

  /**
   * Open database in Notion app
   */
  openDatabase() {
    shell.openExternal(this.getDatabaseUrl());
  }

  // Helper methods to extract properties from Notion API response
  private extractTitle(page: any): string {
    return page.properties.Name?.title?.[0]?.plain_text || 'Untitled';
  }

  private extractStatus(page: any): string {
    return page.properties.Status?.select?.name || 'To Do';
  }

  private extractPriority(page: any): string | undefined {
    return page.properties.Priority?.select?.name;
  }

  private extractDueDate(page: any): string {
    return page.properties['Due Date']?.date?.start || '';
  }
}
```

---

### 2. Setup Wizard Component

```typescript
// src/components/NotionSetupWizard.tsx
import { useState } from 'react';

export function NotionSetupWizard({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState<'intro' | 'apikey' | 'database' | 'testing'>('intro');
  const [apiKey, setApiKey] = useState('');
  const [databaseId, setDatabaseId] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState('');

  const testConnection = async () => {
    setTesting(true);
    setError('');

    try {
      const success = await window.notionAPI.testConnection(apiKey, databaseId);
      if (success) {
        await window.notionAPI.configure(apiKey, databaseId, userEmail);
        onComplete();
      } else {
        setError('Could not connect. Check your API key and database ID.');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setTesting(false);
    }
  };

  if (step === 'intro') {
    return (
      <div className="p-6 max-w-md mx-auto">
        <h2 className="text-[17px] font-semibold mb-4">Connect Notion Tasks</h2>
        <p className="text-[13px] text-macos-gray-600 dark:text-macos-gray-400 mb-4">
          To show your tasks, we need to connect to your Notion workspace.
        </p>
        <div className="bg-macos-gray-100 dark:bg-macos-gray-800 rounded-lg p-4 mb-4">
          <p className="text-[12px] font-semibold mb-2">What you'll need:</p>
          <ul className="text-[12px] space-y-1 list-disc list-inside text-macos-gray-600 dark:text-macos-gray-400">
            <li>Notion account</li>
            <li>A tasks database</li>
            <li>5 minutes for setup</li>
          </ul>
        </div>
        <button
          onClick={() => setStep('apikey')}
          className="w-full bg-macos-blue text-white py-2.5 rounded-lg text-[13px] font-medium"
        >
          Get Started
        </button>
        <button
          onClick={() => window.electronAPI.openExternal('https://developers.notion.com/docs/getting-started')}
          className="w-full mt-2 text-macos-blue text-[12px]"
        >
          Read Setup Guide →
        </button>
      </div>
    );
  }

  if (step === 'apikey') {
    return (
      <div className="p-6 max-w-md mx-auto">
        <h2 className="text-[17px] font-semibold mb-4">Step 1: Get API Key</h2>

        <div className="bg-macos-gray-100 dark:bg-macos-gray-800 rounded-lg p-4 mb-4">
          <p className="text-[12px] font-semibold mb-2">Instructions:</p>
          <ol className="text-[12px] space-y-2 list-decimal list-inside text-macos-gray-600 dark:text-macos-gray-400">
            <li>Go to <span className="font-mono">notion.so/my-integrations</span></li>
            <li>Click "+ New integration"</li>
            <li>Name it "Nexus"</li>
            <li>Copy the "Internal Integration Token"</li>
          </ol>
          <button
            onClick={() => window.electronAPI.openExternal('https://www.notion.so/my-integrations')}
            className="mt-3 text-macos-blue text-[12px] font-medium"
          >
            Open Notion Integrations →
          </button>
        </div>

        <label className="block text-[13px] font-medium mb-2">
          Paste your API key:
        </label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="secret_..."
          className="w-full px-3 py-2 rounded-lg border border-macos-gray-300 dark:border-macos-gray-700 bg-white dark:bg-macos-gray-800 text-[13px] font-mono"
        />

        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setStep('intro')}
            className="flex-1 py-2 rounded-lg text-[13px] text-macos-gray-600 dark:text-macos-gray-400"
          >
            Back
          </button>
          <button
            onClick={() => setStep('database')}
            disabled={!apiKey.startsWith('secret_')}
            className="flex-1 bg-macos-blue text-white py-2 rounded-lg text-[13px] font-medium disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    );
  }

  if (step === 'database') {
    return (
      <div className="p-6 max-w-md mx-auto">
        <h2 className="text-[17px] font-semibold mb-4">Step 2: Connect Database</h2>

        <div className="bg-macos-gray-100 dark:bg-macos-gray-800 rounded-lg p-4 mb-4">
          <p className="text-[12px] font-semibold mb-2">Instructions:</p>
          <ol className="text-[12px] space-y-2 list-decimal list-inside text-macos-gray-600 dark:text-macos-gray-400">
            <li>Open your tasks database in Notion</li>
            <li>Click "•••" (three dots) → "Add connections"</li>
            <li>Select "Nexus" integration</li>
            <li>Copy the database ID from URL</li>
          </ol>
          <p className="text-[11px] text-macos-gray-500 mt-3 font-mono">
            Database ID is the 32-char string in the URL:<br/>
            notion.so/<span className="bg-yellow-200 dark:bg-yellow-800">abc123def456</span>?v=...
          </p>
        </div>

        <label className="block text-[13px] font-medium mb-2">
          Database ID:
        </label>
        <input
          type="text"
          value={databaseId}
          onChange={(e) => setDatabaseId(e.target.value)}
          placeholder="abc123def456..."
          className="w-full px-3 py-2 rounded-lg border border-macos-gray-300 dark:border-macos-gray-700 bg-white dark:bg-macos-gray-800 text-[13px] font-mono mb-3"
        />

        <label className="block text-[13px] font-medium mb-2">
          Your email (for filtering tasks):
        </label>
        <input
          type="email"
          value={userEmail}
          onChange={(e) => setUserEmail(e.target.value)}
          placeholder="luke@gusto.com"
          className="w-full px-3 py-2 rounded-lg border border-macos-gray-300 dark:border-macos-gray-700 bg-white dark:bg-macos-gray-800 text-[13px]"
        />

        {error && (
          <div className="mt-3 p-3 bg-red-100 dark:bg-red-900/30 rounded-lg text-[12px] text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setStep('apikey')}
            className="flex-1 py-2 rounded-lg text-[13px] text-macos-gray-600 dark:text-macos-gray-400"
          >
            Back
          </button>
          <button
            onClick={testConnection}
            disabled={!databaseId || !userEmail || testing}
            className="flex-1 bg-macos-blue text-white py-2 rounded-lg text-[13px] font-medium disabled:opacity-50"
          >
            {testing ? 'Testing...' : 'Connect'}
          </button>
        </div>
      </div>
    );
  }

  return null;
}
```

---

### 3. Task Display Component

```typescript
// src/components/LeftPanel.tsx (Updated - Tasks Section)
import { NotionTask } from '@/services/notion/NotionService';

function TasksSection() {
  const [tasks, setTasks] = useState<NotionTask[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [showSetup, setShowSetup] = useState(false);

  useEffect(() => {
    checkConnection();
    if (isConnected) {
      fetchTasks();
      // Poll every 10 minutes
      const interval = setInterval(fetchTasks, 10 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [isConnected]);

  const fetchTasks = async () => {
    try {
      const tasks = await window.notionAPI.getTasks();
      setTasks(tasks);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    }
  };

  const openTask = (taskId: string) => {
    window.notionAPI.openTask(taskId);
  };

  const openBoard = () => {
    window.notionAPI.openDatabase();
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'High': return {
        border: 'border-red-500',
        bg: 'bg-red-500/20 dark:bg-red-500/10',
        emoji: '🔴'
      };
      case 'Medium': return {
        border: 'border-yellow-500',
        bg: 'bg-yellow-500/20 dark:bg-yellow-500/10',
        emoji: '🟡'
      };
      case 'Low': return {
        border: 'border-blue-500',
        bg: 'bg-blue-500/20 dark:bg-blue-500/10',
        emoji: '🔵'
      };
      default: return {
        border: 'border-macos-gray-400',
        bg: 'bg-macos-gray-100 dark:bg-macos-gray-800',
        emoji: '⚪'
      };
    }
  };

  if (!isConnected) {
    return (
      <div className="flex-1 p-4">
        <h3 className="text-[12px] font-semibold mb-3 text-macos-gray-700 dark:text-macos-gray-300">
          ✅ Tasks
        </h3>
        <p className="text-[12px] text-macos-gray-500 dark:text-macos-gray-400 mb-3">
          Connect Notion to see your tasks
        </p>
        <button
          onClick={() => setShowSetup(true)}
          className="w-full bg-macos-blue text-white py-2 px-4 rounded-lg text-[13px] hover:bg-macos-blue/90"
        >
          Connect Notion
        </button>

        {showSetup && (
          <NotionSetupWizard onComplete={() => {
            setShowSetup(false);
            setIsConnected(true);
          }} />
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 overflow-y-auto">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[12px] font-semibold text-macos-gray-700 dark:text-macos-gray-300">
          ✅ Due Today
        </h3>
        <button
          onClick={openBoard}
          className="text-[10px] text-macos-gray-500 dark:text-macos-gray-400 hover:text-macos-gray-700 dark:hover:text-macos-gray-200 px-2 py-1 rounded hover:bg-macos-gray-200/50 dark:hover:bg-macos-gray-700/50 transition-colors"
        >
          Open Board
        </button>
      </div>

      {tasks.length === 0 ? (
        <p className="text-[12px] text-macos-gray-500 dark:text-macos-gray-400">
          No tasks due today 🎉
        </p>
      ) : (
        <div className="space-y-2">
          {tasks.map(task => {
            const colors = getPriorityColor(task.priority);
            return (
              <div
                key={task.id}
                onClick={() => openTask(task.id)}
                className={`
                  border-l-3 ${colors.border} ${colors.bg}
                  rounded-r-lg p-3 cursor-pointer
                  hover:brightness-95 dark:hover:brightness-110
                  transition-all
                `}
              >
                <div className="flex items-center justify-between">
                  <div className="text-[12px] font-medium text-macos-gray-900 dark:text-macos-gray-200">
                    {task.name}
                  </div>
                  <span className="text-[14px]">{colors.emoji}</span>
                </div>
                {task.priority && (
                  <div className="text-[10px] text-macos-gray-600 dark:text-macos-gray-400 mt-1">
                    {colors.emoji} {task.priority}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

---

### 4. IPC Bridge

```typescript
// electron/preload.ts (Add to existing)
contextBridge.exposeInMainWorld('notionAPI', {
  isConnected: () => ipcRenderer.invoke('notion-is-connected'),
  configure: (apiKey: string, databaseId: string, userEmail: string) =>
    ipcRenderer.invoke('notion-configure', { apiKey, databaseId, userEmail }),
  testConnection: (apiKey: string, databaseId: string) =>
    ipcRenderer.invoke('notion-test-connection', { apiKey, databaseId }),
  getTasks: () => ipcRenderer.invoke('notion-get-tasks'),
  openTask: (taskId: string) => ipcRenderer.send('notion-open-task', taskId),
  openDatabase: () => ipcRenderer.send('notion-open-database'),
  disconnect: () => ipcRenderer.invoke('notion-disconnect'),
});

// electron/main.ts (Add handlers)
import { NotionService } from '../src/services/notion/NotionService';

const notionService = new NotionService();

ipcMain.handle('notion-is-connected', async () => {
  return notionService.isConfigured();
});

ipcMain.handle('notion-configure', async (_, { apiKey, databaseId, userEmail }) => {
  notionService.configure(apiKey, databaseId, userEmail);
  // Store in settings
  settingsStore.set('notion', { apiKey, databaseId, userEmail });
  return true;
});

ipcMain.handle('notion-test-connection', async (_, { apiKey, databaseId }) => {
  const tempService = new NotionService();
  tempService.configure(apiKey, databaseId, 'test@example.com');
  return tempService.testConnection();
});

ipcMain.handle('notion-get-tasks', async () => {
  return notionService.getTodaysTasks();
});

ipcMain.on('notion-open-task', (_, taskId) => {
  notionService.openTask(taskId);
});

ipcMain.on('notion-open-database', () => {
  notionService.openDatabase();
});
```

---

## Implementation Phases

### Phase 2c-1: Notion Service (1 day)

**Tasks:**
1. Install `@notionhq/client` package
2. Implement `NotionService` class
3. Test API connection
4. Test task queries with filters
5. Test deep link opening (notion://)

**Success criteria:**
- Can connect to Notion with API key
- Can query tasks database
- Can filter by assignee, due date, status
- Can extract task properties correctly

---

### Phase 2c-2: Setup Wizard (1 day)

**Tasks:**
1. Create `NotionSetupWizard` component
2. Build 3-step wizard UI
3. Add validation and error handling
4. Test connection verification
5. Store credentials securely

**Success criteria:**
- Clear step-by-step instructions
- API key and database ID validation
- Connection test works
- Good error messages

---

### Phase 2c-3: UI Integration (1 day)

**Tasks:**
1. Update LeftPanel with tasks section
2. Display tasks with priority colors
3. Add "Open Board" button
4. Implement 10-minute polling
5. Handle empty states

**Success criteria:**
- Tasks display correctly
- Color coding works (red/yellow/blue)
- Click task opens Notion
- Click "Open Board" opens database
- Scrollable when many tasks
- No tasks state shows friendly message

---

## Dependencies to Add

```json
{
  "dependencies": {
    "@notionhq/client": "^2.2.15"
  }
}
```

---

## Testing Strategy

### Notion Service Tests
- Test with valid/invalid API keys
- Test database queries with filters
- Test property extraction
- Test deep link generation
- Test with empty results

### Setup Wizard Tests
- Test each step navigation
- Test input validation
- Test connection testing
- Test error states
- Test success flow

### UI Tests
- Test with 0 tasks
- Test with multiple tasks
- Test priority color coding
- Test clicking tasks
- Test "Open Board" link
- Test in light/dark mode
- Test scrolling with many tasks

---

## Success Criteria

**Phase 2c Complete:**
- ✅ Simple API key setup (no OAuth complexity)
- ✅ Tasks due today displayed
- ✅ Color-coded by priority
- ✅ Click to open in Notion
- ✅ "Open Board" link works
- ✅ 10-minute polling
- ✅ Scrollable task list
- ✅ Works in light/dark mode
- ✅ Clear setup wizard

---

## Known Limitations

**Phase 2c scope:**
- Read-only (no in-app task completion)
- Only shows tasks due today (not overdue or upcoming)
- Only shows incomplete tasks (status ≠ Done)
- No task creation from Nexus
- No filtering/sorting options
- Requires specific database structure

**Future enhancements (Phase 3+):**
- Quick task creation (+ Add Task button)
- Mark tasks complete from Nexus
- Show overdue tasks in separate section
- Custom filters (by project, tag, etc.)
- Multiple database support
- Drag-and-drop to reorder

---

## Database Setup Guide (For User)

**Creating the Tasks Database:**

1. **Create database in Notion:**
   - Open Notion
   - Click "+ New page"
   - Select "Database" → "Table"
   - Name it "Tasks"

2. **Add required properties:**
   - Name (title) - Already exists
   - Status (select) - Add options: To Do, In Progress, Done
   - Assigned To (person) - Select yourself
   - Due Date (date) - Date field
   - Priority (select) - Add options: High, Medium, Low

3. **Share with integration:**
   - Click "•••" → "Add connections"
   - Select "Nexus" integration

4. **Get database ID:**
   - Copy from URL: `notion.so/YOUR_DATABASE_ID?v=...`

---

## Security Considerations

1. **API Key storage** - Encrypted in electron-store
2. **Read-only scope** - Integration only needs read access
3. **No external sharing** - API key never leaves user's machine
4. **Revocation** - User can revoke integration at any time in Notion settings

**Notion API limitations:**
- Rate limit: 3 requests per second
- With 10-minute polling, we're well within limits

---

## Comparison to Calendar Integration

| Feature | Calendar (Phase 2b) | Tasks (Phase 2c) |
|---------|---------------------|------------------|
| Auth | OAuth 2.0 (PKCE) | API Key (simpler!) |
| Setup | You create OAuth app | User creates integration |
| Complexity | Medium | Low |
| Polling | 5 minutes | 10 minutes |
| User setup | Click & sign in | 3-step wizard |
| Deep links | Zoom URLs | Notion URLs |

**Phase 2c is simpler than Phase 2b!** No OAuth, just API keys.

---

## Timeline Estimate

- **Phase 2c-1 (Notion Service):** 1 day
- **Phase 2c-2 (Setup Wizard):** 1 day
- **Phase 2c-3 (UI Integration):** 1 day
- **Testing & Polish:** 0.5 days

**Total:** 3.5 days

**Simpler than Calendar** because no OAuth complexity!

---

## Next Steps

1. **After Phase 2b (Calendar):** Begin Phase 2c
2. **User creates Notion integration** (5 min)
3. **Implement Notion service**
4. **Build setup wizard**
5. **Update UI**
6. **Test end-to-end**

---

## Open Questions

1. **What if user has multiple task databases?**
   - Phase 2c: Single database only
   - Future: Allow multiple database IDs

2. **Should we show overdue tasks?**
   - Phase 2c: Today only (keep it simple)
   - Future: Separate "Overdue" section

3. **Task completion from Nexus?**
   - Phase 2c: Read-only, open in Notion to complete
   - Future: Quick complete button

4. **What if no priority property?**
   - Graceful fallback: Show without color coding

---

## References

- [Notion API Documentation](https://developers.notion.com/)
- [Notion JavaScript SDK](https://github.com/makenotion/notion-sdk-js)
- [Database Queries](https://developers.notion.com/reference/post-database-query)
- [Property Types](https://developers.notion.com/reference/property-object)
