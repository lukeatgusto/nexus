/** Calendar event returned from the main process */
export interface CalendarEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  startDisplay: string;
  timeUntil: string;
  isNow: boolean;
  isPast: boolean;
  zoomLink: string | null;
  location: string | null;
}

/** Calendar API exposed via contextBridge in preload.ts */
export interface CalendarAPI {
  isConnected: () => Promise<boolean>;
  isConfigured: () => Promise<boolean>;
  authorize: () => Promise<void>;
  getEvents: () => Promise<CalendarEvent[]>;
  disconnect: () => Promise<void>;
}

export {};
