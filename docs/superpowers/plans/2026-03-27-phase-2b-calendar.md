# Phase 2b: Google Calendar Integration

**Date:** 2026-03-27
**Status:** Planning
**Priority:** High - Key feature for left panel

---

## Goal

Display today's meetings from Google Calendar in the left panel with one-click access to join Zoom calls and open meeting notes in Notion.

---

## User Experience

### First-Time Setup

```
User opens Nexus for first time
         ↓
Left panel shows "Connect Calendar" button
         ↓
User clicks "Connect Calendar"
         ↓
Browser opens to Google sign-in
         ↓
User signs in and grants permission
         ↓
Browser shows "Success! Return to Nexus"
         ↓
Left panel now shows today's meetings
```

**No Google Cloud setup required for users!** Just click and sign in.

---

### Daily Usage

**Left Panel displays:**
```
📅 Today's Meetings
┌─────────────────────────────────┐
│ Team Standup                     │
│ 9:00 AM • in 23 min             │
│ [🚀 Join & Open Notes]          │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ 1:1 with Sarah                   │
│ 10:30 AM • in 1h 53m            │
│ [🚀 Join & Open Notes]          │
└─────────────────────────────────┘

[+ More (3)]  [⚙️ Settings]
```

**Meeting card shows:**
- Title
- Start time
- Time until meeting ("in 23 min", "starting now", etc.)
- Action button

**Action button behavior:**
- If Zoom link found → Opens Zoom + Notion page
- If no Zoom link → Button disabled or shows "No meeting link"

---

## OAuth Architecture

### Standard Desktop OAuth Flow (PKCE)

**Why PKCE?**
- Desktop apps can't keep Client Secret secure (it's in the code)
- PKCE (Proof Key for Code Exchange) solves this
- Google recommends PKCE for desktop/mobile apps
- More secure than traditional OAuth for native apps

**Flow:**
```
1. Nexus generates code_verifier (random string)
2. Creates code_challenge = SHA256(code_verifier)
3. Opens browser with authorization URL:
   https://accounts.google.com/o/oauth2/v2/auth
   ?client_id=YOUR_CLIENT_ID
   &redirect_uri=http://127.0.0.1:PORT/callback
   &response_type=code
   &scope=https://www.googleapis.com/auth/calendar.readonly
   &code_challenge=HASH
   &code_challenge_method=S256

4. User signs in and grants permission
5. Google redirects to http://127.0.0.1:PORT/callback?code=AUTH_CODE
6. Nexus exchanges code for tokens:
   POST https://oauth2.googleapis.com/token
   {
     code: AUTH_CODE,
     client_id: YOUR_CLIENT_ID,
     code_verifier: ORIGINAL_VERIFIER,
     redirect_uri: http://127.0.0.1:PORT/callback,
     grant_type: authorization_code
   }
7. Store access_token and refresh_token locally
```

---

## One-Time Setup (For You, Luke)

### Create Google Cloud OAuth App

**Steps:**
1. Go to https://console.cloud.google.com
2. Create project "Nexus Command Center"
3. Enable Google Calendar API
4. Create OAuth 2.0 Client ID:
   - Application type: **Desktop app**
   - Name: "Nexus"
   - Download JSON credentials
5. Configure OAuth consent screen:
   - App name: "Nexus Command Center"
   - User support email: your email
   - Scopes: `calendar.readonly`
   - Add test users (yourself) for development
   - **Note:** For public release, need Google verification (but not for personal use)

**What you get:**
- Client ID: `123456-abcdef.apps.googleusercontent.com`
- No Client Secret needed (PKCE handles security)

**Where it goes:**
```typescript
// src/config/google.ts
export const GOOGLE_CLIENT_ID = '123456-abcdef.apps.googleusercontent.com';
export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly'
];
```

**Security note:** Client ID is public, it's safe to ship with the app. It's like a username, not a password.

---

## Implementation

### 1. OAuth Service

```typescript
// src/services/auth/GoogleOAuthService.ts
import { BrowserWindow } from 'electron';
import crypto from 'crypto';

export class GoogleOAuthService {
  private codeVerifier: string;
  private callbackServer: http.Server | null = null;

  /**
   * Start OAuth flow
   * Returns access token and refresh token
   */
  async authorize(): Promise<OAuthTokens> {
    // Generate PKCE codes
    this.codeVerifier = this.generateCodeVerifier();
    const codeChallenge = this.generateCodeChallenge(this.codeVerifier);

    // Start local callback server
    const callbackUrl = await this.startCallbackServer();

    // Build authorization URL
    const authUrl = this.buildAuthUrl(codeChallenge, callbackUrl);

    // Open browser
    shell.openExternal(authUrl);

    // Wait for callback with auth code
    const authCode = await this.waitForCallback();

    // Exchange code for tokens
    const tokens = await this.exchangeCodeForTokens(authCode, callbackUrl);

    // Store tokens securely
    await this.storeTokens(tokens);

    return tokens;
  }

  /**
   * Get valid access token (refresh if needed)
   */
  async getAccessToken(): Promise<string> {
    const tokens = await this.getStoredTokens();

    // Check if expired
    if (this.isExpired(tokens.expiresAt)) {
      const newTokens = await this.refreshAccessToken(tokens.refreshToken);
      await this.storeTokens(newTokens);
      return newTokens.accessToken;
    }

    return tokens.accessToken;
  }

  /**
   * Refresh access token using refresh token
   */
  private async refreshAccessToken(refreshToken: string): Promise<OAuthTokens> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: GOOGLE_CLIENT_ID,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    const data = await response.json();

    return {
      accessToken: data.access_token,
      refreshToken: refreshToken, // Keep existing refresh token
      expiresAt: Date.now() + data.expires_in * 1000,
    };
  }

  private generateCodeVerifier(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  private generateCodeChallenge(verifier: string): string {
    return crypto.createHash('sha256').update(verifier).digest('base64url');
  }

  private buildAuthUrl(codeChallenge: string, redirectUri: string): string {
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: GOOGLE_SCOPES.join(' '),
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      access_type: 'offline', // Get refresh token
      prompt: 'consent', // Force consent to get refresh token
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  }

  /**
   * Start local HTTP server to receive OAuth callback
   */
  private async startCallbackServer(): Promise<string> {
    return new Promise((resolve) => {
      const port = 8080; // Or find available port

      this.callbackServer = http.createServer((req, res) => {
        // Handle callback
        const url = new URL(req.url!, `http://localhost:${port}`);
        const code = url.searchParams.get('code');

        if (code) {
          // Show success page
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`
            <html>
              <body style="font-family: -apple-system; text-align: center; padding: 50px;">
                <h1>✅ Success!</h1>
                <p>You can close this window and return to Nexus.</p>
              </body>
            </html>
          `);

          this.callbackServer?.close();
          resolve(code);
        }
      });

      this.callbackServer.listen(port, () => {
        resolve(`http://127.0.0.1:${port}/callback`);
      });
    });
  }

  private async exchangeCodeForTokens(code: string, redirectUri: string): Promise<OAuthTokens> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        client_id: GOOGLE_CLIENT_ID,
        code_verifier: this.codeVerifier,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const data = await response.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };
  }
}
```

---

### 2. Calendar Service

```typescript
// src/services/calendar/GoogleCalendarService.ts
import { GoogleOAuthService } from '../auth/GoogleOAuthService';

export interface CalendarEvent {
  id: string;
  summary: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  location?: string;
  description?: string;
  zoomLink?: string;
}

export class GoogleCalendarService {
  private oauth: GoogleOAuthService;

  constructor() {
    this.oauth = new GoogleOAuthService();
  }

  /**
   * Get today's future events
   */
  async getTodaysEvents(): Promise<CalendarEvent[]> {
    const token = await this.oauth.getAccessToken();

    // Calculate time range (today, future events only)
    const now = new Date();
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
      new URLSearchParams({
        timeMin: now.toISOString(),
        timeMax: endOfDay.toISOString(),
        orderBy: 'startTime',
        singleEvents: 'true',
        maxResults: '10',
      }),
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    // Parse events and extract Zoom links
    return data.items.map((event: any) => ({
      id: event.id,
      summary: event.summary,
      start: event.start,
      location: event.location,
      description: event.description,
      zoomLink: this.extractZoomLink(event),
    }));
  }

  /**
   * Extract Zoom link from event
   * Checks location field and description
   */
  private extractZoomLink(event: any): string | undefined {
    const zoomRegex = /https?:\/\/[a-z0-9.-]*zoom\.us\/j\/\d+(\?pwd=[a-zA-Z0-9]+)?/;

    // Check location first
    if (event.location) {
      const match = event.location.match(zoomRegex);
      if (match) return match[0];
    }

    // Check description
    if (event.description) {
      const match = event.description.match(zoomRegex);
      if (match) return match[0];
    }

    return undefined;
  }

  /**
   * Calculate time until event starts
   */
  getTimeUntil(eventStart: string): string {
    const now = new Date();
    const start = new Date(eventStart);
    const diff = start.getTime() - now.getTime();

    if (diff < 0) return 'Started';
    if (diff < 60000) return 'Starting now';
    if (diff < 3600000) {
      const mins = Math.floor(diff / 60000);
      return `in ${mins} min`;
    }
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      return `in ${hours}h ${mins}m`;
    }

    return 'Today';
  }
}
```

---

### 3. Settings Storage

```typescript
// src/services/settings/SettingsService.ts
import Store from 'electron-store';

interface Settings {
  google: {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
  };
  notion?: {
    apiKey?: string;
    meetingsDatabaseId?: string;
  };
}

// Encrypted storage for tokens
export const settingsStore = new Store<Settings>({
  name: 'nexus-settings',
  encryptionKey: 'nexus-secure-storage', // Basic obfuscation
});
```

---

### 4. React Integration

```typescript
// src/components/LeftPanel.tsx (Updated)
import { useEffect, useState } from 'react';
import { CalendarEvent } from '@/services/calendar/GoogleCalendarService';

function LeftPanel() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkConnection();
    if (isConnected) {
      fetchEvents();
      // Poll every 5 minutes
      const interval = setInterval(fetchEvents, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [isConnected]);

  const checkConnection = async () => {
    const connected = await window.calendarAPI.isConnected();
    setIsConnected(connected);
  };

  const fetchEvents = async () => {
    try {
      const events = await window.calendarAPI.getEvents();
      setEvents(events);
    } catch (error) {
      console.error('Failed to fetch events:', error);
    }
  };

  const connectCalendar = async () => {
    setLoading(true);
    try {
      await window.calendarAPI.authorize();
      setIsConnected(true);
      fetchEvents();
    } catch (error) {
      console.error('Failed to connect:', error);
    } finally {
      setLoading(false);
    }
  };

  const joinMeeting = (event: CalendarEvent) => {
    if (event.zoomLink) {
      // Open Zoom link
      window.electronAPI.openExternal(event.zoomLink);

      // Open Notion page (Phase 2c will implement this)
      // window.notionAPI.openMeetingPage(event);
    }
  };

  if (!isConnected) {
    return (
      <div className="p-4">
        <h3 className="text-[13px] font-semibold mb-3">📅 Calendar</h3>
        <p className="text-[12px] text-macos-gray-400 mb-3">
          Connect your Google Calendar to see today's meetings
        </p>
        <button
          onClick={connectCalendar}
          disabled={loading}
          className="w-full bg-macos-blue text-white py-2 px-4 rounded-lg text-[13px] hover:bg-macos-blue/90"
        >
          {loading ? 'Connecting...' : 'Connect Calendar'}
        </button>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[13px] font-semibold">📅 Today's Meetings</h3>
        <button className="text-[10px] text-macos-gray-400">Settings</button>
      </div>

      {events.length === 0 ? (
        <p className="text-[12px] text-macos-gray-400">No meetings today</p>
      ) : (
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {events.map(event => (
            <div
              key={event.id}
              className="bg-white/80 dark:bg-macos-gray-900/40 rounded-lg p-3 border border-macos-gray-200 dark:border-macos-gray-700/50"
            >
              <div className="text-[12px] font-medium text-macos-gray-900 dark:text-macos-gray-200">
                {event.summary}
              </div>
              <div className="text-[11px] text-macos-gray-600 dark:text-macos-gray-400 mt-1">
                {formatTime(event.start.dateTime)} • {getTimeUntil(event.start.dateTime)}
              </div>
              {event.zoomLink ? (
                <button
                  onClick={() => joinMeeting(event)}
                  className="mt-2 w-full bg-macos-blue/30 hover:bg-macos-blue/40 text-macos-blue text-[11px] py-2 px-3 rounded-md transition-colors"
                >
                  🚀 Join & Open Notes
                </button>
              ) : (
                <div className="mt-2 text-[10px] text-macos-gray-400">
                  No meeting link
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

### 5. IPC Bridge

```typescript
// electron/preload.ts (Add to existing)
contextBridge.exposeInMainWorld('calendarAPI', {
  isConnected: () => ipcRenderer.invoke('calendar-is-connected'),
  authorize: () => ipcRenderer.invoke('calendar-authorize'),
  getEvents: () => ipcRenderer.invoke('calendar-get-events'),
  disconnect: () => ipcRenderer.invoke('calendar-disconnect'),
});

// electron/main.ts (Add handlers)
import { GoogleCalendarService } from '../src/services/calendar/GoogleCalendarService';

const calendarService = new GoogleCalendarService();

ipcMain.handle('calendar-is-connected', async () => {
  return calendarService.isConnected();
});

ipcMain.handle('calendar-authorize', async () => {
  return calendarService.authorize();
});

ipcMain.handle('calendar-get-events', async () => {
  return calendarService.getTodaysEvents();
});

ipcMain.handle('calendar-disconnect', async () => {
  return calendarService.disconnect();
});
```

---

## Implementation Phases

### Phase 2b-1: OAuth Setup (2 days)

**Tasks:**
1. Create Google Cloud OAuth app (you, once)
2. Install dependencies (`electron-store`)
3. Implement `GoogleOAuthService`
4. Test OAuth flow end-to-end
5. Store/retrieve tokens securely

**Success criteria:**
- Can click "Connect" and authorize
- Tokens stored and retrieved correctly
- Token refresh works automatically

---

### Phase 2b-2: Calendar Integration (1 day)

**Tasks:**
1. Implement `GoogleCalendarService`
2. Add IPC bridge for calendar
3. Test fetching today's events
4. Test Zoom link extraction

**Success criteria:**
- Can fetch today's events
- Zoom links extracted correctly
- Error handling works

---

### Phase 2b-3: UI Integration (1 day)

**Tasks:**
1. Update LeftPanel component
2. Add connect/disconnect buttons
3. Display events with time until
4. Add refresh mechanism (5 min polling)
5. Style meeting cards

**Success criteria:**
- Events display in left panel
- Time until updates correctly
- Join button opens Zoom link
- Scrollable when many events

---

## Dependencies to Add

```json
{
  "dependencies": {
    "electron-store": "^8.1.0"
  }
}
```

---

## Testing Strategy

### OAuth Flow
- Test authorization in browser
- Test token storage
- Test token refresh when expired
- Test disconnect/reconnect

### Calendar API
- Test with 0 events
- Test with multiple events
- Test with events with/without Zoom links
- Test time calculations
- Test polling behavior

### UI
- Test connect button
- Test event display
- Test join button behavior
- Test settings panel
- Test in light/dark mode

---

## Success Criteria

**Phase 2b Complete:**
- ✅ One-click OAuth connection
- ✅ Today's meetings displayed
- ✅ Time until meeting updates live
- ✅ Zoom links extracted and clickable
- ✅ Tokens refresh automatically
- ✅ Settings panel for disconnect
- ✅ Scrollable when many events
- ✅ Works in light/dark mode

---

## Known Limitations

**Phase 2b scope:**
- Only shows primary calendar (not multiple calendars)
- Only detects Zoom links (not Meet/Teams yet)
- Doesn't open Notion pages yet (Phase 2c)
- No recurring event customization
- No event creation/editing

**Future enhancements (Phase 3+):**
- Multiple calendar support
- Other meeting link types
- Notion integration for meeting notes
- Event reminders/notifications
- All-day events display

---

## Security Considerations

1. **Client ID is public** - This is normal and safe
2. **Tokens stored encrypted** - Use electron-store encryption
3. **Tokens never leave user's machine** - All API calls from user's computer
4. **Refresh tokens** - Never expire unless revoked by user
5. **HTTPS only** - All OAuth/API communication over HTTPS

**User's Google account permissions:**
- Scope: `calendar.readonly` (read-only)
- User can revoke at any time: https://myaccount.google.com/permissions

---

## Documentation Needed

1. **Setup Guide** - How you created the OAuth app (for reference)
2. **User Privacy** - What permissions we request and why
3. **Troubleshooting** - Common OAuth issues
4. **Contributing** - How to test calendar integration

---

## Timeline Estimate

- **Phase 2b-1 (OAuth):** 2 days
- **Phase 2b-2 (Calendar API):** 1 day
- **Phase 2b-3 (UI):** 1 day
- **Testing & Polish:** 1 day

**Total:** 5 days

---

## Next Steps

1. **After Phase 2a (Terminal):** Begin Phase 2b
2. **Create Google Cloud OAuth app** (you, takes ~30 min)
3. **Implement OAuth service**
4. **Implement Calendar service**
5. **Update UI**
6. **Test end-to-end**

---

## Open Questions

1. **Should we show past events?**
   - Recommendation: No, only future events to reduce clutter

2. **How many events to show?**
   - Recommendation: All today's events, scrollable

3. **What if no meetings today?**
   - Show "No meetings today" message

4. **Settings location?**
   - Add gear icon in panel header → opens settings modal

---

## References

- [Google Calendar API Docs](https://developers.google.com/calendar/api/v3/reference)
- [OAuth 2.0 for Desktop Apps](https://developers.google.com/identity/protocols/oauth2/native-app)
- [PKCE Extension](https://oauth.net/2/pkce/)
- [electron-store Documentation](https://github.com/sindresorhus/electron-store)
