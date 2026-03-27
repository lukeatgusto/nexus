# Nexus

Personal command center for macOS - integrates calendar, tasks, terminal, and file browser in one ultrawide-optimized window.

## Features (Phase 1 Complete)

- ✅ Three-panel layout optimized for ultrawide monitors
- ✅ Collapsible left (Calendar/Tasks) and right (Files/Agents) panels
- ✅ Dark/light mode with automatic system theme sync
- ✅ Apple Human Interface Guidelines compliance
- ✅ Native macOS look and feel

## Coming Soon

- Google Calendar integration
- Notion tasks integration
- Terminal with Claude Code
- File browser
- Agent dashboard

## Development

### Prerequisites

- Node.js 18+
- macOS (for native features)

### Getting Started

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for macOS
npm run build:mac
```

### Tech Stack

- Electron - Native macOS app
- React 18 - UI framework
- TypeScript - Type safety
- Tailwind CSS - Styling
- Vite - Build tool

## Project Structure

```
nexus/
├── electron/           # Electron main process
├── src/                # React application
│   ├── components/     # UI components
│   ├── contexts/       # React contexts
│   └── types/          # TypeScript types
└── docs/               # Documentation
    └── superpowers/
        ├── specs/      # Design specifications
        └── plans/      # Implementation plans
```

## License

MIT
