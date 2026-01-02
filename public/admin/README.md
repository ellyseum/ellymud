# Admin Interface (Build Output)

> ⚠️ **This directory contains BUILD OUTPUT from the React admin application.**
> **Do not edit files here directly.** Source code is in [`admin-ui/`](../../admin-ui/).

Web-based admin dashboard for EllyMUD server management and monitoring.

## Source Location

The admin interface is now a React application. To make changes:

1. Edit source files in [`admin-ui/src/`](../../admin-ui/src/)
2. Run `npm run admin:build` to regenerate this directory
3. Or use `npm run admin:dev` for development with hot reload

## Contents

| File               | Description                            |
| ------------------ | -------------------------------------- |
| `index.html`       | Vite-generated entry point             |
| `assets/`          | Bundled JavaScript and CSS             |
| `login.html`       | Legacy login page (fallback)           |
| `styles.css`       | Legacy styles (fallback)               |
| `config-test.html` | Configuration testing utility          |

## Features

The admin dashboard provides:

- **Overview Dashboard** - Server uptime, memory usage, player statistics
- **Player Management** - View connected players, kick/ban users, inspect details
- **Session Monitoring** - Real-time view of active game sessions
- **Configuration Panel** - Modify game settings without server restart
- **Pipeline Metrics** - View AI agent pipeline execution history and statistics

## Authentication

Admin access requires:

1. A user account with admin privileges
2. JWT-based authentication via the login form
3. Token stored in browser localStorage

## Accessing the Dashboard

1. Start the EllyMUD server
2. Navigate to `http://localhost:8080/admin/`
3. Log in with admin credentials
4. Dashboard loads with live server data

## Development

For development with hot reload:

```bash
npm run admin:dev
```

This starts Vite on port 5173 with API proxying to the main server.

To rebuild for production:

```bash
npm run admin:build
```

## Related

- [`admin-ui/`](../../admin-ui/) - **React source code (edit here)**
- [`vite.admin.config.ts`](../../vite.admin.config.ts) - Vite build configuration
- [`src/admin/`](../../src/admin/) - Backend API implementation
- [`public/`](../) - Main web client
