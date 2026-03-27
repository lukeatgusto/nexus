# Command Center: Design Document

**Date:** 2026-03-27
**Status:** Design Complete - Ready for Implementation
**Platform:** macOS native app (Electron)
**Last Updated:** 2026-03-27 (addressed spec review feedback)

## Context

Building a personal command center optimized for ultrawide monitors to consolidate key information and tools in one place. The primary use case is having a persistent window that shows:

- **Glanceable information:** Today's meetings and priority tasks always visible
- **Working tools:** Terminal with Claude Code integration for AI-assisted development
- **Quick access:** File browser and future agent dashboard

The design supports multiple usage scenarios:
- Full focus window with all panels visible (ultrawide monitor)
- Side panel during Zoom calls (collapsed panels)
- Future expansion for different view modes

## Design Overview

### Three-Panel Layout

```
┌─────────────────────────────────────────────────────────────┐
│                     Command Center                          │
├─────────────┬───────────────────────┬──────────────────────┤
│             │                       │                       │
│  Overview   │      Terminal         │       Tools          │
│  (280px)    │      (flex-1)         │      (300px)         │
│             │                       │                       │
│  ┌────────┐ │  ┌──────────────────┐ │  ┌─────────────────┐ │
│  │Calendar│ │  │                  │ │  │  [Files|Agents] │ │
│  │        │ │  │    xterm.js      │ │  │                 │ │
│  │(scroll)│ │  │    terminal      │ │  │   File tree     │ │
│  └────────┘ │  │                  │ │  │   or agent      │ │
│  ┌────────┐ │  │   $ claude       │ │  │   dashboard     │ │
│  │ Tasks  │ │  │   >              │ │  │                 │ │
│  │        │ │  │                  │ │  │                 │ │
│  │(scroll)│ │  └──────────────────┘ │  └─────────────────┘ │
│  └────────┘ │                       │                       │
│             │                       │                       │
│  [◀ collapse]│                      │              [▶ collapse]│
└─────────────┴───────────────────────┴──────────────────────┘
```

**Key characteristics:**
- Left and right panels are collapsible to maximize terminal width
- All three panels visible simultaneously on ultrawide monitors
- Responsive to panel collapse/expand state
- **Calendar and tasks sections have independent scrolling** (overflow-y: auto)

---

## Feature Specifications

### 1. Google Calendar Integration (Left Panel - Top)

**Display:**
- Show today's future events only (past events hidden)
- Each event card shows:
  - Meeting title
  - Start time
  - Time until meeting starts ("in 23 minutes")
  - Zoom link detection
- **Scrollable list** when events exceed panel height

**Interaction:**
- Single button per meeting: "🚀 Join & Open Notes"
  - Opens Zoom link (using `zoom://` deep link)
  - Opens corresponding Notion meeting page (native app)
  - Both actions trigger simultaneously

**Technical details:**
- Google Calendar API with OAuth 2.0
- Poll for updates every 5 minutes
- Extract Zoom links from event descriptions/location (see Zoom Link Extraction below)
- Query Notion API to find/create meeting page (see Notion Meeting Pages Integration below)
- User needs to create Google Cloud project and enable Calendar API (setup wizard)

**Zoom Link Extraction:**
- Check `location` field first, then `description` field
- Regex pattern: `https?://[a-z0-9.-]*zoom\.us/j/\d+(\?pwd=[a-zA-Z0-9]+)?`
- If multiple links found, use first one
- If no Zoom link found: disable "Join & Open Notes" button, show "No Zoom link" text
- Future: Support Google Meet (`meet.google.com`), MS Teams (`teams.microsoft.com`) with appropriate deep links

**Notion Meeting Pages Integration:**
- **Database:** "Meetings" database in Notion with properties:
  - Title (title) - Meeting name
  - Date (date) - Meeting date
  - Calendar Event ID (rich text) - Unique identifier from Google Calendar
  - Attendees (multi-select or text) - Meeting participants
  - Zoom Link (url) - Link to join
  - Notes (text) - Meeting notes section
- **Matching logic:**
  1. Query Notion for pages where `Calendar Event ID == event.id`
  2. If no match, query for pages where `Title == event.summary AND Date == event.start.date`
  3. If still no match, create new page
- **Page creation:**
  - Set Title from event summary
  - Set Date from event start date
  - Set Calendar Event ID from event.id
  - Set Attendees from event.attendees (names only)
  - Set Zoom Link from extracted URL
  - Add empty Notes section
  - Create in "Meetings" database (user configures database ID)
- **Opening pages:**
  - Use Notion page URL: `notion://www.notion.so/{page_id}`
  - Falls back to `https://www.notion.so/{page_id}` if native app not installed

### 2. Notion Tasks Integration (Left Panel - Bottom)

**Display:**
- Show tasks assigned to Luke, due today
- Simple task database structure:
  - Task Name (title)
  - Status (To Do, In Progress, Done)
  - Assigned To (Person field)
  - Due Date (Date field)
  - Priority (High, Medium, Low) - optional
- Color-coded by priority:
  - High: Red border/background
  - Medium: Yellow border/background
  - Low: Blue border/background
- **Scrollable list** when tasks exceed panel height
- Header includes "Open Board" link to view full Notion database

**Interaction:**
- Click task to open in Notion (native app)
- Click "Open Board" to open Notion task database
- Read-only display (no in-app task completion)

**Technical details:**
- Notion API integration
- Query: `filter: { assigned_to: Luke, due_date: today, status: not Done }`
- Poll for updates every 10 minutes
- Notion internal integration token required (user setup)

### 3. Terminal with Claude Code (Center Panel)

**Display:**
- Full terminal emulator using xterm.js
- Shows current working directory in header
- Terminal takes entire center area (maximum space)

**Functionality:**
- Run standard shell commands (zsh/bash)
- **Primary use: Run `claude` command** for Claude Code integration
- Goal: Full Claude Code experience embedded in terminal

**Technical approach:**
- xterm.js for terminal rendering
- node-pty for shell process management
- Attempt to run `claude` command directly
- **Fallback plan:** If Claude Code TUI doesn't render properly:
  - Add "Open in Claude Code" button in header
  - Launches separate Claude Code window for current directory

**Terminal Process Management:**
- **Initialization:**
  - Spawn shell process via node-pty on app launch
  - Default shell: Detect from `$SHELL` environment variable (typically `/bin/zsh` on macOS)
  - Starting directory: User's home directory or last used directory (saved in app settings)
  - Environment: Inherit from parent process, ensure `TERM=xterm-256color`
- **Lifecycle:**
  - One shell process per app session (persists while app is open)
  - If shell crashes: Auto-restart with notification to user
  - On app quit: Send SIGTERM to shell, wait 1s, then SIGKILL if still running
- **Directory tracking:**
  - Poll current directory every 500ms via `lsof -p <pid> | grep cwd` (non-invasive)
  - Update header display and notify file browser component
  - Alternative: Hook into shell's `chpwd` (zsh) or `PROMPT_COMMAND` (bash) - more complex but cleaner
- **Security:**
  - Terminal has full system access (same as running Terminal.app)
  - No sandboxing - user is running commands as themselves
  - Consider warning on first launch about security implications

**Known limitations:**
- Claude Code's interactive TUI might have rendering issues in xterm.js
- Permission prompts might not display correctly
- Start with direct execution, fall back to quick launch if needed

### 4. File Browser (Right Panel - Files Tab)

**Display:**
- Shows current terminal working directory
- Tree view of files and folders
- Can navigate up/down directory structure
- File icons for different types (.md, folders, etc.)

**Interaction:**
- Click file: Open in default application
- Right-click menu:
  - Open
  - Reveal in Finder
  - Copy path to clipboard
- Double-click folder: Expand/collapse

**Technical details:**
- Node.js `fs` module for file system access
- Watch terminal's `cwd` to keep browser synced (poll every 500ms, see Terminal Process Management)
- Electron shell APIs for "open" and "reveal" actions
- **Note:** "CD to directory" feature deferred - complex to inject commands into running shell safely

### 5. Agent Dashboard (Right Panel - Agents Tab)

**Phase 1: Minimal Placeholder**
- Simple UI showing "Agents Dashboard"
- "Coming Soon" message
- Disabled "+ Add Agent" button
- Reserves space for future functionality

**Future capabilities (not Phase 1):**
- Activity feed showing agent actions
- Status indicators for running agents
- Controls to start/stop/configure agents
- Types of agents envisioned:
  - Scheduled tasks (daily reports, data syncs)
  - Monitoring/alerts (PR reviews, Jira assignments)
  - AI assistants (research, drafting, analysis)
  - Workflow automation (meeting notes → Notion)

---

## Design System (Apple HIG Compliance)

### Colors
- **Semantic system colors** that adapt to light/dark mode
- Define CSS custom properties mirroring macOS system colors
- Support Increased Contrast accessibility setting
- Dark mode: darker backgrounds, lighter text (maintain 4.5:1 contrast ratio)

### Typography
- **System font:** `-apple-system, BlinkMacSystemFont` (SF Pro)
- Sizes:
  - 11px: Secondary/helper text
  - 12px: Body text
  - 13px: Primary text, buttons
  - 15px: Section headers
- Weights: Regular (body), Medium/Semibold (headings)

### Spacing
- **8px grid system** (use multiples: 8, 16, 24, 32)
- 4px for tight spacing within components
- Panel padding: 16-20px typical
- Line height: 1.4-1.6

### Visual Materials
- Window vibrancy: Translucent background showing desktop (Electron vibrancy API)
- Sidebar backgrounds: Slightly darker/lighter than main content
- Content area background: Differentiated from chrome
- 1px separator lines between panels (subtle, low opacity)

### Interactive Elements
- Buttons: 6-8px border radius, system blue for primary actions
- Hover: Subtle background change
- Active/pressed: Slightly darker
- Smooth transitions (200ms ease)

### Window
- Hide default title bar, keep traffic light buttons visible
- Support fullscreen mode
- Proper shadows and rounded corners
- Collapsible panels with smooth animation (300ms ease)

---

## Technical Stack

### Core
- **Electron** - Native macOS app wrapper
- **React 18+** - UI framework
- **Tailwind CSS** - Styling with custom theme for macOS colors
- **TypeScript** - Type safety

### Key Libraries
- **xterm.js** - Terminal emulation
- **node-pty** - Shell process management
- **googleapis** - Google Calendar API client
- **@notionhq/client** - Notion API client
- **date-fns** - Date manipulation

### State Management
- **React Context API** - Global state for:
  - Current terminal directory
  - Panel collapse states
  - Calendar events
  - Notion tasks
  - User settings (API tokens, refresh intervals)
- **Local component state** - For UI-only state (hover, focus, expanded folders)
- **Communication between panels:**
  - Terminal directory changes → File browser updates via context
  - Settings changes → All components via context
  - No Redux/Zustand needed - app is small enough for Context API

### OAuth 2.0 Implementation (Google Calendar)
- **Flow type:** Authorization Code with PKCE (recommended for desktop apps)
- **Process:**
  1. Generate code verifier and challenge
  2. Open browser to Google OAuth consent screen with challenge
  3. Start local HTTP server on `http://localhost:3000/callback`
  4. Google redirects to localhost with authorization code
  5. Exchange code for access + refresh tokens
  6. Shut down local server
- **Token storage:**
  - Use Electron's `safeStorage` API (encrypted storage using OS keychain)
  - Store: access token, refresh token, expiry timestamp
  - Never store in plain text files
- **Token refresh:**
  - Check expiry before each API call
  - If expired, use refresh token to get new access token
  - If refresh fails, prompt user to re-authenticate
- **Scopes required:**
  - `https://www.googleapis.com/auth/calendar.readonly` - Read calendar events
- **Error handling:**
  - User declines consent: Show error, provide "Try Again" button
  - Token refresh fails: Clear tokens, re-trigger OAuth flow
  - Network errors: Retry with exponential backoff

### Build Tools
- **Vite** - Fast dev server and build tool
- **electron-builder** - Package for macOS distribution

### Repository
- New GitHub repository
- Store in user's account
- MIT license

---

## Implementation Phases

### Phase 1: Foundation & Layout
**Goal:** Basic app structure with static UI

**Deliverables:**
- Electron + React + Tailwind project setup
- Three-panel layout with collapsible sidebars
- Static placeholder content in all panels
- Dark/light mode toggle working
- Apple HIG styling applied (fonts, colors, spacing)

**Success criteria:**
- App launches
- Panels collapse/expand smoothly
- Looks native to macOS
- Respects system dark mode preference

**Estimated complexity:** Medium (project scaffolding, layout logic)

---

### Phase 2: Terminal Integration
**Goal:** Working terminal with Claude Code attempt

**Deliverables:**
- xterm.js embedded in center panel
- Shell (zsh/bash) running in terminal
- Current directory displayed in header
- Directory tracking implemented (poll every 500ms)
- Attempt `claude` command execution
- If TUI issues: Add "Open in Claude Code" fallback button

**Success criteria:**
- Can run basic shell commands
- Terminal behaves like native terminal
- Current directory updates in header
- Either Claude Code works embedded OR quick launch opens it successfully

**Estimated complexity:** High (shell integration, process management, Claude Code compatibility testing)

---

### Phase 3: File Browser
**Goal:** Navigate and interact with files

**Deliverables:**
- Display terminal's current directory (syncs with Phase 2 directory tracking)
- Tree view with expand/collapse
- File type icons
- Right-click context menu:
  - Open in default app
  - Reveal in Finder
  - Copy path
- Sync with terminal directory changes

**Success criteria:**
- Can browse file system
- All context menu actions work
- File browser updates when terminal changes directory

**Estimated complexity:** Medium (file system watching, context menus, terminal sync)

---

### Phase 4: Google Calendar Integration
**Goal:** Real calendar data from Google

**Deliverables:**
- OAuth 2.0 setup wizard (first-time auth)
- Fetch today's future events
- Display in scrollable left panel
- Extract Zoom links
- "Join & Open Notes" button implemented
- Auto-refresh every 5 minutes

**Success criteria:**
- User can authenticate with Google
- Events display correctly
- Join button launches Zoom
- Time countdown updates
- Scrolling works when many events

**Estimated complexity:** Medium-High (OAuth flow, API integration, link extraction)

---

### Phase 5: Notion Integration (Tasks)
**Goal:** Real task data from Notion

**Deliverables:**
- Notion integration token setup
- Task database query (assigned to Luke, due today)
- Display in scrollable left panel
- Priority color coding
- Click to open in Notion app
- "Open Board" link
- Auto-refresh every 10 minutes

**Success criteria:**
- Tasks display correctly
- Click opens correct page in Notion
- Color coding matches priority
- Scrolling works when many tasks

**Estimated complexity:** Medium (API integration, database queries)

---

### Phase 6: Notion Integration (Meeting Notes)
**Goal:** Calendar button opens correct Notion page

**Dependencies:** Requires Phase 4 (Calendar) and Phase 5 (Notion setup) to be complete

**Deliverables:**
- Notion "Meetings" database setup
- Query Notion for meeting pages (match by Calendar Event ID, then title + date)
- Create meeting page if doesn't exist
- "Join & Open Notes" button opens both Zoom and Notion

**Success criteria:**
- Finds existing meeting pages correctly
- Creates new pages when needed
- Both apps open when button clicked
- Meeting page includes calendar details (attendees, Zoom link, date)

**Estimated complexity:** Medium (Notion page matching logic, creation logic)

---

### Phase 7: Polish & Optimization
**Goal:** Production-ready app

**Deliverables:**
- **Error handling** for specific scenarios:
  - Network failures during API calls → Show error banner with retry button
  - OAuth token expiration → Auto-refresh or prompt re-auth
  - Terminal process crashes → Auto-restart with notification
  - Notion database not found → Error message with setup link
  - Calendar API quota exceeded → Reduce polling frequency, show warning
- Loading states for all async operations (spinners, skeleton screens)
- Settings panel for configuration:
  - API tokens (Google OAuth, Notion integration token)
  - Refresh intervals (calendar, tasks)
  - Panel width preferences
  - Default terminal directory
  - Notion database IDs (tasks, meetings)
- App icon and branding
- Auto-updater integration (optional - Electron auto-updater)
- Keyboard shortcuts:
  - `Cmd+B` - Toggle left panel
  - `Cmd+Shift+B` - Toggle right panel
  - `Cmd+T` - Focus terminal
  - `Cmd+,` - Open settings
- Performance optimization (lazy loading, React.memo, useMemo)

**Success criteria:**
- Handles all common error scenarios gracefully
- User can configure all settings
- App feels polished and responsive
- Ready for daily use

**Accessibility (MVP scope):**
- Keyboard navigation between panels (tab order)
- Focus indicators visible
- High contrast support (inherits from system)
- Screen reader support: OUT OF SCOPE for MVP (revisit post-launch)

**Estimated complexity:** Medium (lots of small tasks, polish)

---

## Future Enhancements (Post-Launch)

### Agent Dashboard Implementation
When agent requirements are clear:
- Design appropriate UI for agent types
- Activity feed implementation
- Agent control panel
- Status monitoring

### Alternative View Modes
- Minimal mode (just calendar + terminal)
- Focus mode (terminal only, panels auto-hide)
- Meeting mode (optimized for zoom calls)
- View mode switcher in UI

### Additional Integrations
- Slack notifications
- Jira ticket tracking
- GitHub PR status
- Email preview (work inbox)

### Enhanced Terminal Features
- Multiple terminal tabs
- Split terminal panes
- Session persistence
- Command history search

---

## Setup Requirements

### User Setup Tasks
1. **Google Calendar API:**
   - Create Google Cloud project at console.cloud.google.com
   - Enable Calendar API
   - Create OAuth 2.0 credentials (Desktop app type)
   - Configure consent screen (internal use only is fine)
   - Download client ID and secret
   - Paste into Command Center settings

2. **Notion Integration:**
   - Go to notion.so/my-integrations
   - Create new internal integration
   - Copy integration token (starts with `secret_`)
   - Paste into Command Center settings
   - **Important:** Integrations don't automatically have access to workspace content
   - Must explicitly share databases with integration (see step 3)

3. **Notion Database Setup:**
   - Create "Tasks" database with properties:
     - Task Name (title)
     - Status (select: To Do, In Progress, Done)
     - Assigned To (person)
     - Due Date (date)
     - Priority (select: High, Medium, Low)
   - Click "Share" button → Add your integration → "Invite"
   - Copy database ID from URL (command-center will need this)

   - Create "Meetings" database with properties:
     - Title (title) - Meeting name
     - Date (date) - Meeting date
     - Calendar Event ID (rich text) - For matching
     - Attendees (multi-select or text)
     - Zoom Link (url)
     - Notes (text)
   - Click "Share" button → Add your integration → "Invite"
   - Copy database ID from URL (command-center will need this)

### Development Setup
- Node.js 18+
- Electron development tools
- Notion workspace for testing
- Google account for Calendar testing

---

## Key Technical Decisions

### Why Electron over Tauri?
- More mature ecosystem
- Easier terminal integration (xterm.js well-supported)
- User is more familiar with web tech than Rust
- Can always migrate later (frontend mostly portable)

### Why React over vanilla JS?
- Component model fits multi-panel layout
- User works at Gusto (React shop) - familiar patterns
- Rich ecosystem for Electron + React
- Terminal libraries have React wrappers

### Why not direct Notion recording trigger?
- Notion's recording feature is UI-only (no API)
- Best we can do: Open the page where recording button exists
- User can click one button to join + open notes, then one more click in Notion to start recording

### Terminal approach (try embedded, fallback to launch)
- Ambitious: Try running Claude Code directly
- Pragmatic: Have fallback if TUI incompatibility
- Start optimistic, adapt based on testing

---

## Success Metrics

### Phase 1 - Foundation
- App launches without errors
- Layout is stable on ultrawide monitor
- Panels collapse/expand correctly

### Phase 2 - Terminal
- Terminal executes commands
- User can access Claude Code (embedded or via launch)
- Directory tracking works

### Phase 3 - File Browser
- Can browse files in terminal directory
- Context menu actions work
- Syncs with terminal directory changes

### Phase 4 - Calendar
- Calendar shows correct meetings
- Join button reliably opens Zoom
- Time countdowns update correctly

### Phase 5 - Tasks
- Tasks show correct data
- Opens correct Notion pages
- Priority colors display correctly

### Phase 6 - Meeting Notes
- Finds or creates meeting pages
- Both Zoom and Notion open together
- Meeting data populates correctly

### Phase 7 - Polish
- Error handling works for all scenarios
- Settings persist correctly
- Keyboard shortcuts work

### Overall Success
- User uses it daily as primary command center
- Reduces context switching between apps
- Saves time on meeting prep (one button to join + open notes)
- Provides useful at-a-glance view of day

---

## Risk Mitigation

### Risk: Claude Code TUI incompatibility
**Mitigation:** Fallback to "Open in Claude Code" button is acceptable

### Risk: Google Calendar API quota limits
**Mitigation:** Poll every 5 minutes (288 requests/day) is well within free tier (10,000/day)

### Risk: Notion API rate limits
**Mitigation:** Poll every 10 minutes (144 requests/day) is well within limits (3 requests/second)

### Risk: OAuth setup complexity
**Mitigation:** Provide detailed setup wizard, good documentation, error messages guide user

### Risk: Notion page matching ambiguity
**Mitigation:** Match by title + date, create new if uncertain, user can manually link if needed

---

## Resolved Design Decisions

1. **Terminal shell detection:** ✅ Detect from `$SHELL` environment variable
2. **Notion meeting page structure:** ✅ Specified in "Notion Meeting Pages Integration" section
3. **File browser "CD to directory":** ✅ Deferred (too complex for MVP)
4. **Phase sequencing:** ✅ Reordered logically (Terminal → File Browser → Calendar → Notion)
5. **State management:** ✅ React Context API
6. **OAuth flow:** ✅ Authorization Code with PKCE, tokens in Electron safeStorage

## Open Questions for Implementation

1. **File browser depth:** Limit how many folders deep it can go for performance?
2. **Panel collapse persistence:** Remember collapsed state between sessions?
3. **Multiple Notion workspaces:** Support or assume single workspace?
4. **Calendar selection:** Support multiple calendars or just primary?
5. **Window vibrancy:** Always on or configurable? (May affect text readability)

These can be decided during implementation based on testing and user feedback.

---

## Appendix: API Reference Links

- [Google Calendar API](https://developers.google.com/calendar/api/v3/reference)
- [Notion API](https://developers.notion.com/)
- [Electron Documentation](https://www.electronjs.org/docs/latest/)
- [xterm.js Documentation](https://xtermjs.org/)
- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/designing-for-macos)
