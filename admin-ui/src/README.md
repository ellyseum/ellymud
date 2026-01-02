# Admin UI Source

This directory contains the React source code for the EllyMUD admin dashboard.

## Directory Structure

- **components/** - React UI components (Header, Sidebar, panels)
- **context/** - React context providers (AuthContext)
- **hooks/** - Custom React hooks (useApi, usePolling)
- **services/** - API client and service modules
- **types/** - TypeScript type definitions
- **utils/** - Utility functions (formatters)

## Entry Points

- `main.tsx` - Application bootstrap and React root
- `App.tsx` - Main application component with routing
- `index.css` - Global styles

## Development

Run `npm run admin:dev` from the project root to start the development server.

## Build Output

Production builds go to `public/admin/` via `npm run admin:build`.
