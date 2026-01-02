# Admin UI

React-based web application for administering EllyMUD servers. Provides a modern, responsive dashboard for monitoring and managing the game server.

## Contents

| Path                 | Description                                      |
| -------------------- | ------------------------------------------------ |
| `index.html`         | Vite entry point HTML                            |
| `src/`               | React application source code                    |
| `tsconfig.json`      | TypeScript configuration for the React app       |
| `tsconfig.node.json` | TypeScript configuration for Vite/Node tooling   |

### Source Directory

| Path           | Description                           |
| -------------- | ------------------------------------- |
| `src/App.tsx`  | Main application component and router |
| `src/main.tsx` | React entry point                     |
| `src/components/` | UI components and panels           |
| `src/context/` | React context providers               |
| `src/hooks/`   | Custom React hooks                    |
| `src/services/`| API client services                   |
| `src/types/`   | TypeScript type definitions           |
| `src/utils/`   | Utility functions                     |

## Overview

The Admin UI is a single-page React application that communicates with the EllyMUD server via REST API endpoints. It provides real-time monitoring of connected players, server statistics, and configuration management.

### Key Features

- **Overview Dashboard** - Server uptime, memory usage, and player statistics
- **Player Management** - View connected players, kick/ban users, inspect details
- **Session Monitor** - Real-time view of active game sessions
- **Configuration Panel** - Modify game settings without server restart
- **Pipeline Metrics** - View AI agent pipeline execution history and statistics

## Development

Start the development server with hot reload:

```bash
npm run admin:dev
```

This starts Vite on port 5173 with API proxying to the main server (port 3000).

## Building

Build for production:

```bash
npm run admin:build
```

Output is written to `public/admin/` where it's served by the main EllyMUD server.

## Related

- [`public/admin/`](../public/admin/) - Build output directory
- [`src/admin/`](../src/admin/) - Backend API implementation
- [`vite.admin.config.ts`](../vite.admin.config.ts) - Vite build configuration
