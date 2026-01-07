# Admin Panel - LLM Context

## Overview

The admin panel is a React 18 SPA built with Vite, served at `/admin/`. It provides a web interface for server administration including player management, configuration, and monitoring.

## Architecture

```
Admin Panel
├── index.html              # Entry point (served at /admin/)
└── src/
    ├── main.tsx            # React root mount
    ├── App.tsx             # Auth gate + tab routing
    ├── context/            # React contexts (auth)
    ├── components/         # UI components
    │   ├── Header.tsx      # Top bar with logout
    │   ├── Sidebar.tsx     # Tab navigation
    │   ├── LoginPage.tsx   # Auth form
    │   └── panels/         # Tab content panels
    ├── hooks/              # Custom hooks (useApi, usePolling)
    ├── services/           # API client
    └── types/              # TypeScript definitions
```

## File Reference

### `index.html`

**Purpose**: Entry point HTML for `/admin/` route

- Contains React root div
- Loads Vite-processed main.tsx
- Base path set to `/admin/` in Vite config

### `src/main.tsx`

**Purpose**: React application bootstrap

```tsx
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(<App />);
```

### `src/App.tsx`

**Purpose**: Main component with auth gate and hash-based routing

**Key Logic**:
1. Wraps in `AuthProvider`
2. Shows `LoginPage` if not authenticated
3. Hash routing: `#dashboard-tab`, `#players-tab`, etc.

**Panels**:
- `OverviewPanel` - Server stats dashboard
- `MonitorPanel` - Real-time session viewer
- `PlayersPanel` - Player list management
- `ConfigPanel` - MUD config editor
- `PipelinePanel` - Pipeline metrics

## Subdirectories

| Directory    | Purpose               | When to Look Here           |
| ------------ | --------------------- | --------------------------- |
| `components/`| UI components         | Modify admin interface      |
| `context/`   | React contexts        | Auth flow changes           |
| `hooks/`     | Custom React hooks    | Data fetching patterns      |
| `services/`  | API client            | Backend API integration     |
| `types/`     | TypeScript types      | Data structure definitions  |

## Conventions

### Component Pattern

All panel components follow this pattern:

```tsx
import { useApi, usePolling } from '../hooks';
import { api } from '../services/api';

export function SomePanel() {
  const { data, loading, error, refetch } = useApi<ResponseType>(
    () => api.getSomething()
  );
  
  // Auto-refresh every 5 seconds
  usePolling(refetch, 5000);
  
  if (loading) return <LoadingSpinner />;
  if (error) return <div>Error: {error}</div>;
  
  return <div>{/* render data */}</div>;
}
```

### API Client Usage

All API calls go through the `api` singleton:

```tsx
import { api } from '../services/api';

// The api client handles:
// - Token management (localStorage)
// - Authorization headers
// - 401 handling (auto-logout)
// - Response parsing

const response = await api.getServerStats();
```

### Path Aliases

TypeScript path aliases configured in frontend tsconfig:

```typescript
// Use @/ for admin src imports
import { Component } from '@/components/Component';

// Use @shared/ for shared utilities
import { SomeType } from '@shared/types';
```

### Hash Routing

Navigation uses URL hashes, not React Router:

```tsx
// Navigate to tab
window.history.pushState(null, '', '#players-tab');

// Read tab on mount
const hash = window.location.hash.replace('#', '').replace('-tab', '');
```

## Authentication Flow

1. User submits credentials via `LoginPage`
2. `api.login()` calls POST `/api/admin/login`
3. JWT token stored in localStorage
4. `AuthContext` updates `isAuthenticated` state
5. All subsequent API calls include Bearer token
6. 401 responses trigger auto-logout

## Build Output

After `npm run build:frontend`:
- `dist/public/admin/index.html`
- `dist/public/admin/assets/*.js`
- `dist/public/admin/assets/*.css`

## Common Tasks

### Add New Panel

1. Create panel component in `src/components/panels/NewPanel.tsx`
2. Add to `TabId` type in `App.tsx`
3. Add case in `renderPanel()` switch
4. Add tab button in `Sidebar.tsx`

### Add API Endpoint Call

1. Add method to `src/services/api.ts`:
   ```typescript
   async getNewData(): Promise<ApiResponse<NewData>> {
     const response = await fetch(`${API_BASE}/new-endpoint`, {
       headers: this.getHeaders(),
     });
     return this.handleResponse(response);
   }
   ```

2. Add type to `src/types/index.ts`
3. Use in component via `useApi` hook

### Modify Auto-Refresh Interval

Change the second argument to `usePolling`:

```tsx
// Refresh every 10 seconds instead of 5
usePolling(refetch, 10000);
```

## Gotchas & Warnings

- ⚠️ **Base path**: Admin assets MUST be under `/admin/` - Vite config enforces this
- ⚠️ **Token storage**: JWT in localStorage - clear on logout
- ⚠️ **No React Router**: Hash-based routing only - keep it simple
- ⚠️ **Proxy in dev**: `/api` proxied to `localhost:8080` via Vite dev server

## Related Context

- [`../game/`](../game/) - Game client (vanilla TS)
- [`../shared/`](../shared/) - Shared types
- [`../../admin/`](../../admin/) - Backend API routes
- [`/vite.config.ts`](../../../vite.config.ts) - Vite MPA config
