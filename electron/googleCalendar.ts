/**
 * Google Calendar service - fetches today's events and extracts meeting info.
 */
import { getValidAccessToken } from './googleOAuth';

const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';

export interface CalendarEvent {
  id: string;
  title: string;
  startTime: string;       // ISO string
  endTime: string;          // ISO string
  startDisplay: string;     // "9:00 AM"
  zoomLink: string | null;
  location: string | null;
  isAllDay: boolean;
}

const ZOOM_REGEX = /https?:\/\/[a-z0-9.-]*zoom\.us\/j\/\d+(\?pwd=[a-zA-Z0-9]+)?/;

function extractZoomLink(event: GoogleCalendarEvent): string | null {
  // Check conference data first (Google Meet / Zoom plugin)
  if (event.conferenceData?.entryPoints) {
    for (const entry of event.conferenceData.entryPoints) {
      if (entry.uri && ZOOM_REGEX.test(entry.uri)) {
        return entry.uri;
      }
    }
  }

  // Check location field
  if (event.location) {
    const match = event.location.match(ZOOM_REGEX);
    if (match) return match[0];
  }

  // Check description field
  if (event.description) {
    const match = event.description.match(ZOOM_REGEX);
    if (match) return match[0];
  }

  return null;
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}


interface GoogleCalendarEvent {
  id: string;
  summary?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  location?: string;
  description?: string;
  conferenceData?: {
    entryPoints?: Array<{ uri: string; entryPointType: string }>;
  };
}

export async function getTodaysEvents(clientId: string): Promise<CalendarEvent[]> {
  const accessToken = await getValidAccessToken(clientId);
  if (!accessToken) {
    throw new Error('Not authenticated - please connect your calendar');
  }

  // Build time range for today
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  const params = new URLSearchParams({
    timeMin: startOfDay.toISOString(),
    timeMax: endOfDay.toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '20',
    conferenceDataVersion: '1',
  });

  const response = await fetch(
    `${CALENDAR_API_BASE}/calendars/primary/events?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Calendar API error: ${response.status} ${text}`);
  }

  const data = await response.json() as { items: GoogleCalendarEvent[] };
  const events: CalendarEvent[] = [];

  for (const item of data.items || []) {
    const isAllDay = !item.start.dateTime || !item.end.dateTime;

    events.push({
      id: item.id,
      title: item.summary || '(No title)',
      startTime: item.start.dateTime || item.start.date || '',
      endTime: item.end.dateTime || item.end.date || '',
      startDisplay: item.start.dateTime ? formatTime(item.start.dateTime) : 'All day',
      zoomLink: extractZoomLink(item),
      location: item.location || null,
      isAllDay,
    });
  }

  return events;
}
