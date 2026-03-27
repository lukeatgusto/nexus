import React, { useState, useEffect, useCallback } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import PanelHeader from './PanelHeader';
import NotionSetupWizard from './NotionSetupWizard';
import type { CalendarEvent } from '@/types/calendar';
import type { NotionTask } from '@/types/notion';

const POLL_INTERVAL = 5 * 60 * 1000; // 5 minutes

type CalendarState =
  | { status: 'loading' }
  | { status: 'not-configured' }
  | { status: 'disconnected' }
  | { status: 'connecting' }
  | { status: 'error'; message: string }
  | { status: 'connected'; events: CalendarEvent[] };

function getTimeUntil(startTime: string, endTime: string): { timeUntil: string; isNow: boolean; isPast: boolean } {
  const now = Date.now();
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();

  if (now >= end) {
    return { timeUntil: 'Ended', isNow: false, isPast: true };
  }

  if (now >= start) {
    return { timeUntil: 'Now', isNow: true, isPast: false };
  }

  const diffMs = start - now;
  const diffMin = Math.round(diffMs / 60000);

  if (diffMin <= 0) {
    return { timeUntil: 'Starting now', isNow: true, isPast: false };
  }

  if (diffMin < 60) {
    return { timeUntil: `in ${diffMin} min`, isNow: false, isPast: false };
  }

  const hours = Math.floor(diffMin / 60);
  const mins = diffMin % 60;
  if (mins === 0) {
    return { timeUntil: `in ${hours}h`, isNow: false, isPast: false };
  }
  return { timeUntil: `in ${hours}h ${mins}m`, isNow: false, isPast: false };
}

function CalendarSection() {
  const [state, setState] = useState<CalendarState>({ status: 'loading' });
  const [timeUpdateTrigger, setTimeUpdateTrigger] = useState(0);

  const fetchEvents = useCallback(async () => {
    try {
      const events = await window.calendarAPI.getEvents();
      setState({ status: 'connected', events });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch events';
      setState({ status: 'error', message: msg });
    }
  }, []);

  const checkStatus = useCallback(async () => {
    try {
      const configured = await window.calendarAPI.isConfigured();
      if (!configured) {
        setState({ status: 'not-configured' });
        return;
      }

      const connected = await window.calendarAPI.isConnected();
      if (!connected) {
        setState({ status: 'disconnected' });
        return;
      }

      await fetchEvents();
    } catch {
      setState({ status: 'error', message: 'Failed to check calendar status' });
    }
  }, [fetchEvents]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // Poll for event updates when connected (5 minutes)
  useEffect(() => {
    if (state.status !== 'connected') return;

    const interval = setInterval(fetchEvents, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [state.status, fetchEvents]);

  // Trigger re-renders every 60 seconds to update time-until strings
  useEffect(() => {
    if (state.status !== 'connected') return;

    const interval = setInterval(() => {
      setTimeUpdateTrigger(prev => prev + 1);
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, [state.status]);

  const handleConnect = async () => {
    setState({ status: 'connecting' });
    try {
      await window.calendarAPI.authorize();
      await fetchEvents();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Authorization failed';
      setState({ status: 'error', message: msg });
    }
  };

  const handleDisconnect = async () => {
    await window.calendarAPI.disconnect();
    setState({ status: 'disconnected' });
  };

  const handleJoin = (zoomLink: string) => {
    window.electronAPI.openExternal(zoomLink);
  };

  // Not configured - show setup instructions
  if (state.status === 'not-configured') {
    return (
      <div className="p-4 border-b border-macos-gray-800 dark:border-macos-gray-900">
        <div className="text-[12px] font-semibold text-macos-gray-300 mb-3">
          Today's Meetings
        </div>
        <div className="bg-white/80 dark:bg-macos-gray-900/40 rounded-lg p-3 border border-macos-gray-200 dark:border-macos-gray-700/50">
          <div className="text-[11px] text-macos-gray-400">
            Set up Google Calendar:
          </div>
          <ol className="text-[10px] text-macos-gray-400 mt-2 space-y-1 list-decimal list-inside">
            <li>Create OAuth app at console.cloud.google.com</li>
            <li>Add Client ID to electron/calendarConfig.ts</li>
            <li>Restart the app</li>
          </ol>
        </div>
      </div>
    );
  }

  // Loading state
  if (state.status === 'loading') {
    return (
      <div className="p-4 border-b border-macos-gray-800 dark:border-macos-gray-900">
        <div className="text-[12px] font-semibold text-macos-gray-300 mb-3">
          Today's Meetings
        </div>
        <div className="text-[11px] text-macos-gray-400 text-center py-4">Loading...</div>
      </div>
    );
  }

  // Disconnected - show connect button
  if (state.status === 'disconnected') {
    return (
      <div className="p-4 border-b border-macos-gray-800 dark:border-macos-gray-900">
        <div className="text-[12px] font-semibold text-macos-gray-300 mb-3">
          Today's Meetings
        </div>
        <button
          onClick={handleConnect}
          className="w-full bg-macos-blue/20 hover:bg-macos-blue/30 text-macos-blue text-[12px] py-3 px-4 rounded-lg transition-colors border border-macos-blue/30"
        >
          Connect Google Calendar
        </button>
      </div>
    );
  }

  // Connecting
  if (state.status === 'connecting') {
    return (
      <div className="p-4 border-b border-macos-gray-800 dark:border-macos-gray-900">
        <div className="text-[12px] font-semibold text-macos-gray-300 mb-3">
          Today's Meetings
        </div>
        <div className="text-[11px] text-macos-gray-400 text-center py-4">
          Waiting for Google sign-in...
        </div>
      </div>
    );
  }

  // Error state
  if (state.status === 'error') {
    return (
      <div className="p-4 border-b border-macos-gray-800 dark:border-macos-gray-900">
        <div className="text-[12px] font-semibold text-macos-gray-300 mb-3">
          Today's Meetings
        </div>
        <div className="bg-red-500/10 rounded-lg p-3 border border-red-500/30">
          <div className="text-[11px] text-red-400">{state.message}</div>
          <button
            onClick={checkStatus}
            className="mt-2 text-[10px] text-macos-blue hover:underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Connected - show events
  // Use timeUpdateTrigger to ensure component re-renders when time changes
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _unused = timeUpdateTrigger;

  // Recalculate time-based properties from stored event data
  const enrichedEvents = state.events.map(event => {
    const { timeUntil, isNow, isPast } = getTimeUntil(event.startTime, event.endTime);
    return { ...event, timeUntil, isNow, isPast };
  });

  const futureEvents = enrichedEvents.filter(e => !e.isPast);

  return (
    <div className="p-4 border-b border-macos-gray-800 dark:border-macos-gray-900">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[12px] font-semibold text-macos-gray-300">
          Today's Meetings
        </div>
        <button
          onClick={handleDisconnect}
          className="text-[10px] text-macos-gray-400 hover:text-macos-gray-200 px-1.5 py-0.5 rounded hover:bg-macos-gray-700/50 transition-colors"
          title="Disconnect calendar"
        >
          Disconnect
        </button>
      </div>

      {futureEvents.length === 0 ? (
        <div className="text-[11px] text-macos-gray-400 text-center py-4">
          No more meetings today
        </div>
      ) : (
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {futureEvents.map(event => (
            <MeetingCard key={event.id} event={event} onJoin={handleJoin} />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tasks Section (Notion Integration)
// ---------------------------------------------------------------------------

const TASKS_POLL_INTERVAL = 10 * 60 * 1000; // 10 minutes

type TasksState =
  | { status: 'loading' }
  | { status: 'disconnected' }
  | { status: 'connected'; tasks: NotionTask[] }
  | { status: 'error'; message: string };

function TasksSection() {
  const [state, setState] = useState<TasksState>({ status: 'loading' });
  const [showWizard, setShowWizard] = useState(false);

  const fetchTasks = useCallback(async () => {
    try {
      const tasks = await window.notionAPI.getTasks();
      setState({ status: 'connected', tasks });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch tasks';
      setState({ status: 'error', message: msg });
    }
  }, []);

  const checkStatus = useCallback(async () => {
    try {
      const connected = await window.notionAPI.isConnected();
      if (!connected) {
        setState({ status: 'disconnected' });
        return;
      }
      await fetchTasks();
    } catch {
      setState({ status: 'error', message: 'Failed to check Notion status' });
    }
  }, [fetchTasks]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // Poll for task updates when connected
  useEffect(() => {
    if (state.status !== 'connected') return;
    const interval = setInterval(fetchTasks, TASKS_POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [state.status, fetchTasks]);

  const handleDisconnect = async () => {
    await window.notionAPI.disconnect();
    setState({ status: 'disconnected' });
  };

  const handleOpenTask = (notionUrl: string) => {
    window.notionAPI.openTask(notionUrl);
  };

  const handleOpenDatabase = () => {
    window.notionAPI.openDatabase();
  };

  const handleWizardComplete = () => {
    setShowWizard(false);
    checkStatus();
  };

  // Loading
  if (state.status === 'loading') {
    return (
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="text-[12px] font-semibold text-macos-gray-300 mb-3">
          Due Today
        </div>
        <div className="text-[11px] text-macos-gray-400 text-center py-4">Loading...</div>
      </div>
    );
  }

  // Disconnected - show connect button
  if (state.status === 'disconnected') {
    return (
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="text-[12px] font-semibold text-macos-gray-300 mb-3">
          Due Today
        </div>
        <button
          onClick={() => setShowWizard(true)}
          className="w-full bg-macos-blue/20 hover:bg-macos-blue/30 text-macos-blue text-[12px] py-3 px-4 rounded-lg transition-colors border border-macos-blue/30"
        >
          Connect Notion
        </button>
        {showWizard && (
          <NotionSetupWizard
            onComplete={handleWizardComplete}
            onCancel={() => setShowWizard(false)}
          />
        )}
      </div>
    );
  }

  // Error
  if (state.status === 'error') {
    return (
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="text-[12px] font-semibold text-macos-gray-300 mb-3">
          Due Today
        </div>
        <div className="bg-red-500/10 rounded-lg p-3 border border-red-500/30">
          <div className="text-[11px] text-red-400">{state.message}</div>
          <button
            onClick={checkStatus}
            className="mt-2 text-[10px] text-macos-blue hover:underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Connected - show tasks
  const { tasks } = state;

  return (
    <div className="flex-1 p-4 overflow-y-auto">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[12px] font-semibold text-macos-gray-300">
          Due Today
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleOpenDatabase}
            className="text-[10px] text-macos-gray-400 hover:text-macos-gray-200 px-2 py-1 rounded hover:bg-macos-gray-700/50 transition-colors"
          >
            Open Board
          </button>
          <button
            onClick={handleDisconnect}
            className="text-[10px] text-macos-gray-400 hover:text-macos-gray-200 px-1.5 py-0.5 rounded hover:bg-macos-gray-700/50 transition-colors"
            title="Disconnect Notion"
          >
            Disconnect
          </button>
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="text-[11px] text-macos-gray-400 text-center py-4">
          No tasks due today
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map(task => (
            <TaskCard key={task.id} task={task} onClick={handleOpenTask} />
          ))}
        </div>
      )}
    </div>
  );
}

function getPriorityStyles(priority: NotionTask['priority']): { border: string; bg: string; hoverBg: string; label: string } {
  switch (priority) {
    case 'High':
      return { border: 'border-red-500', bg: 'bg-red-500/20 dark:bg-red-500/10', hoverBg: 'hover:bg-red-500/30 dark:hover:bg-red-500/20', label: 'High' };
    case 'Medium':
      return { border: 'border-yellow-500', bg: 'bg-yellow-500/20 dark:bg-yellow-500/10', hoverBg: 'hover:bg-yellow-500/30 dark:hover:bg-yellow-500/20', label: 'Medium' };
    case 'Low':
      return { border: 'border-blue-500', bg: 'bg-blue-500/20 dark:bg-blue-500/10', hoverBg: 'hover:bg-blue-500/30 dark:hover:bg-blue-500/20', label: 'Low' };
    default:
      return { border: 'border-macos-gray-500', bg: 'bg-macos-gray-500/20 dark:bg-macos-gray-500/10', hoverBg: 'hover:bg-macos-gray-500/30 dark:hover:bg-macos-gray-500/20', label: 'No priority' };
  }
}

function TaskCard({ task, onClick }: { task: NotionTask; onClick: (url: string) => void }) {
  const styles = getPriorityStyles(task.priority);

  return (
    <div
      onClick={() => onClick(task.notionUrl)}
      className={`border-l-3 ${styles.border} ${styles.bg} ${styles.hoverBg} rounded-r-lg p-3 cursor-pointer transition-colors`}
    >
      <div className="text-[12px] font-medium text-macos-gray-200">
        {task.title}
      </div>
      <div className="flex items-center gap-2 mt-1">
        <span className="text-[10px] text-macos-gray-400">{styles.label}</span>
        {task.status && (
          <span className="text-[10px] text-macos-gray-500">{task.status}</span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Meeting Card
// ---------------------------------------------------------------------------

function MeetingCard({ event, onJoin }: { event: CalendarEvent; onJoin: (url: string) => void }) {
  return (
    <div
      className={`rounded-lg p-3 border transition-colors ${
        event.isNow
          ? 'bg-macos-blue/10 dark:bg-macos-blue/10 border-macos-blue/30'
          : 'bg-white/80 dark:bg-macos-gray-900/40 border-macos-gray-200 dark:border-macos-gray-700/50'
      }`}
    >
      <div className="text-[12px] font-medium text-macos-gray-200">
        {event.title}
      </div>
      <div className="text-[11px] text-macos-gray-400 mt-1">
        {event.startDisplay}
        <span className={`ml-1.5 ${event.isNow ? 'text-macos-blue font-medium' : ''}`}>
          · {event.timeUntil}
        </span>
      </div>
      {event.zoomLink && (
        <button
          onClick={() => onJoin(event.zoomLink!)}
          className="mt-2 w-full bg-macos-blue/30 hover:bg-macos-blue/40 text-macos-blue text-[11px] py-2 px-3 rounded-md transition-colors"
        >
          Join & Open Notes
        </button>
      )}
    </div>
  );
}

function LeftPanel() {
  const { toggleLeftPanel } = useAppContext();

  return (
    <div className="h-full flex flex-col bg-macos-gray-100/50 dark:bg-macos-gray-900/30 border-r border-macos-gray-200 dark:border-macos-gray-900">
      <PanelHeader
        title="Overview"
        icon="📊"
        onCollapse={toggleLeftPanel}
        collapseDirection="left"
      />

      <CalendarSection />

      <TasksSection />
    </div>
  );
}

export default LeftPanel;
