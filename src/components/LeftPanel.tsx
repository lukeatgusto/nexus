import React, { useState, useEffect, useCallback } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import PanelHeader from './PanelHeader';
import type { CalendarEvent } from '@/types/calendar';

const POLL_INTERVAL = 5 * 60 * 1000; // 5 minutes

type CalendarState =
  | { status: 'loading' }
  | { status: 'not-configured' }
  | { status: 'disconnected' }
  | { status: 'connecting' }
  | { status: 'error'; message: string }
  | { status: 'connected'; events: CalendarEvent[] };

function CalendarSection() {
  const [state, setState] = useState<CalendarState>({ status: 'loading' });

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

  // Poll for event updates when connected
  useEffect(() => {
    if (state.status !== 'connected') return;

    const interval = setInterval(fetchEvents, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [state.status, fetchEvents]);

  // Also refresh time-until displays every minute
  useEffect(() => {
    if (state.status !== 'connected') return;

    const interval = setInterval(fetchEvents, 60 * 1000);
    return () => clearInterval(interval);
  }, [state.status, fetchEvents]);

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
    window.open(zoomLink, '_blank');
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
  const futureEvents = state.events.filter(e => !e.isPast);

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
        <div className="space-y-2">
          {futureEvents.map(event => (
            <MeetingCard key={event.id} event={event} onJoin={handleJoin} />
          ))}
        </div>
      )}
    </div>
  );
}

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

      {/* Tasks Section */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[12px] font-semibold text-macos-gray-300">
            Due Today
          </div>
          <button className="text-[10px] text-macos-gray-400 hover:text-macos-gray-200 px-2 py-1 rounded hover:bg-macos-gray-700/50 transition-colors">
            Open Board
          </button>
        </div>
        <div className="space-y-2">
          {/* Placeholder task items */}
          <div className="border-l-3 border-red-500 bg-red-500/20 dark:bg-red-500/10 rounded-r-lg p-3 cursor-pointer hover:bg-red-500/30 dark:hover:bg-red-500/20 transition-colors">
            <div className="text-[12px] font-medium text-macos-gray-200">Review Q2 roadmap</div>
            <div className="text-[10px] text-macos-gray-400 mt-1">High</div>
          </div>
          <div className="border-l-3 border-yellow-500 bg-yellow-500/20 dark:bg-yellow-500/10 rounded-r-lg p-3 cursor-pointer hover:bg-yellow-500/30 dark:hover:bg-yellow-500/20 transition-colors">
            <div className="text-[12px] font-medium text-macos-gray-200">Approve hiring req</div>
            <div className="text-[10px] text-macos-gray-400 mt-1">Medium</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LeftPanel;
