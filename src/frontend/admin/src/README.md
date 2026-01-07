# Admin UI Source

This directory contains the React source code for the EllyMUD admin dashboard.

## Contents

| Path         | Description                                |
| ------------ | ------------------------------------------ |
| `components/`| React UI components (Header, Sidebar, panels) |
| `context/`   | React context providers (AuthContext)      |
| `hooks/`     | Custom React hooks (useApi, usePolling)    |
| `services/`  | API client and service modules             |
| `types/`     | TypeScript type definitions                |
| `utils/`     | Utility functions (formatters)             |

## Entry Points

- `main.tsx` - Application bootstrap and React root
- `App.tsx` - Main application component with routing
- `index.css` - Global styles

## Development

Run `npm run dev:frontend` from the project root to start the unified frontend development server with hot reload.

## Build Output

Production builds go to `dist/public/admin/` via `npm run build:frontend`.

## Related

- [`../`](../) - Admin panel root (index.html)
- [`../../game/`](../../game/) - Game client
- [`../../shared/`](../../shared/) - Shared types
