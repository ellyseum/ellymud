# Admin UI - LLM Context

## Overview

React 18 single-page application for EllyMUD administration. Built with TypeScript and Vite. Communicates with the server via REST API at `/api/admin/*` endpoints.

**Tech Stack:**
- React 18 with hooks
- TypeScript 5.x
- Vite for development and building
- CSS (no preprocessor or CSS-in-JS)

## Architecture

```
App (AuthProvider wrapper)
├── LoginPage (unauthenticated)
└── Dashboard (authenticated)
    ├── Header (title, logout button)
    ├── Sidebar (tab navigation)
    └── Panel (active content)
        ├── OverviewPanel (stats, timer config)
        ├── PlayersPanel (user management)
        ├── MonitorPanel (session monitoring)
        ├── ConfigPanel (game settings)
        └── PipelinePanel (AI pipeline metrics)
```

## File Reference

### `src/App.tsx`

**Purpose**: Main application component with routing logic.

**Key Behavior**:
- Wraps everything in `AuthProvider`
- Hash-based routing (`#dashboard-tab`, `#players-tab`, etc.)
- Conditionally renders `LoginPage` or `Dashboard` based on auth state

```tsx
// Tab routing
const handleTabChange = (tabId: TabId) => {
  setActiveTab(tabId);
  window.history.pushState(null, '', `#${tabId}-tab`);
};
```

### `src/context/AuthContext.tsx`

**Purpose**: Authentication state management.

**Key Exports**:
```tsx
export function AuthProvider({ children }: { children: ReactNode })
export function useAuth(): AuthContextType
// Returns: { isAuthenticated, token, login, logout }
```

**Token Storage**: `localStorage.getItem('mudAdminToken')`

**Usage**:
```tsx
const { isAuthenticated, login, logout } = useAuth();
if (!isAuthenticated) return <LoginPage />;
```

### `src/services/api.ts`

**Purpose**: Centralized API client with type-safe methods.

**Key Exports**:
```typescript
export const api = new ApiClient();

// Methods
api.login(username, password)
api.getServerStats()
api.getConnectedPlayers()
api.getPlayerDetails(username)
api.kickPlayer(username)
api.getPipelineMetrics()
api.getMudConfig()
api.saveMudConfig(config)
// ... and more
```

**Authentication**: Automatically includes JWT token from localStorage in Authorization header.

**Auto-logout**: On 401 response, clears token and reloads page.

### `src/hooks/useApi.ts`

**Purpose**: Generic hook for API calls with loading/error states.

```typescript
const { data, loading, error, refetch } = useApi<T>(
  () => api.someMethod(),
  { autoFetch: true }
);
```

### `src/hooks/usePolling.ts`

**Purpose**: Interval-based data refreshing.

```typescript
usePolling(
  () => refetchPlayers(),
  { interval: 5000, enabled: isActive }
);
```

### `src/types/index.ts`

**Purpose**: TypeScript interfaces for API responses.

**Key Types**:
```typescript
interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

interface ServerStats {
  uptime: number;
  connectedClients: number;
  memoryUsage: MemoryUsage;
  // ...
}

interface Player {
  id: string;
  username: string;
  authenticated: boolean;
  // ...
}

interface PipelineMetrics {
  // Pipeline execution history
}
```

## Component Reference

### `src/components/panels/OverviewPanel.tsx`

**Purpose**: Dashboard home with server statistics.

**Features**:
- Server uptime display
- Memory usage metrics
- Connected player count
- Game timer configuration
- Force save button

### `src/components/panels/PlayersPanel.tsx`

**Purpose**: Player/user management.

**Features**:
- List connected players
- Show player details (health, location, inventory)
- Kick/ban controls
- Idle time tracking

### `src/components/panels/MonitorPanel.tsx`

**Purpose**: Real-time session monitoring.

**Features**:
- View active game sessions
- See what players are doing
- Session duration tracking

### `src/components/panels/ConfigPanel.tsx`

**Purpose**: Game configuration management.

**Features**:
- Edit MUD config values
- Save changes to server
- Load current configuration

### `src/components/panels/PipelinePanel.tsx`

**Purpose**: AI agent pipeline monitoring.

**Features**:
- View pipeline execution history
- See success/failure rates
- Execution timing metrics

## Conventions

### API Calls

Always use the centralized `api` client:

```typescript
// ✅ Correct
import { api } from '../services/api';
const response = await api.getServerStats();

// ❌ Incorrect
fetch('/api/admin/stats', { ... }); // Don't use fetch directly
```

### State Management

Use React hooks and context, not external state libraries:

```typescript
// ✅ Correct - local state
const [players, setPlayers] = useState<Player[]>([]);

// ✅ Correct - shared state via context
const { isAuthenticated } = useAuth();
```

### Polling

Use `usePolling` hook for auto-refresh:

```typescript
// ✅ Correct
usePolling(() => refetch(), { interval: 5000 });

// ❌ Incorrect
useEffect(() => {
  const id = setInterval(fetch, 5000);
  return () => clearInterval(id);
}, []); // Don't roll your own
```

### Error Handling

API client handles 401 automatically. Handle other errors in components:

```typescript
const { error } = useApi(() => api.getPlayers());
if (error) return <div className="error">{error}</div>;
```

## Development Commands

```bash
# Start dev server with hot reload (port 5173)
npm run admin:dev

# Build for production (outputs to public/admin/)
npm run admin:build

# Type check only
cd admin-ui && npx tsc --noEmit
```

## Vite Configuration

Configuration in `vite.admin.config.ts`:

```typescript
export default defineConfig({
  plugins: [react()],
  root: 'admin-ui',
  base: '/admin/',
  build: {
    outDir: '../public/admin',
    emptyOutDir: false,  // Preserve existing files
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
      '/socket.io': { target: 'http://localhost:3000', ws: true },
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, 'admin-ui/src') },
  },
});
```

**Key Points**:
- `base: '/admin/'` - All assets prefixed with /admin/
- `emptyOutDir: false` - Preserves legacy files in public/admin/
- Proxy forwards API calls to main server during development

## Gotchas & Warnings

- ⚠️ **Build Output**: The built app goes to `public/admin/`. Don't edit files there directly.
- ⚠️ **Token Storage**: Uses localStorage, not cookies. Token persists across tabs.
- ⚠️ **Hash Routing**: Uses `#tab-name-tab` format for navigation (no react-router).
- ⚠️ **No SSR**: This is a pure SPA. All rendering is client-side.
- ⚠️ **CORS**: In dev, Vite proxies API calls. In production, same-origin is assumed.
- ⚠️ **Port Conflict**: Dev server uses 5173. If blocked, Vite auto-increments.

## Adding a New Panel

1. Create component in `src/components/panels/NewPanel.tsx`
2. Add tab type to `TabId` in `App.tsx`
3. Add case to `renderPanel()` switch in `App.tsx`
4. Add tab button in `Sidebar.tsx`

```tsx
// 1. Create panel
export function NewPanel() {
  const { data, loading } = useApi(() => api.getNewData());
  return loading ? <LoadingSpinner /> : <div>{/* content */}</div>;
}

// 2. Update App.tsx TabId type
type TabId = 'dashboard' | 'players' | ... | 'new';

// 3. Add to renderPanel switch
case 'new':
  return <NewPanel />;

// 4. Add to Sidebar
<button onClick={() => onTabChange('new')}>New Tab</button>
```

## Adding API Endpoints

1. Add method to `src/services/api.ts`
2. Add types to `src/types/index.ts`

```typescript
// In api.ts
async getNewData(): Promise<ApiResponse<NewDataType>> {
  const response = await fetch(`${API_BASE}/new-endpoint`, {
    headers: this.getHeaders(),
  });
  return this.handleResponse(response);
}

// In types/index.ts
export interface NewDataType {
  // ...
}
```

## Related Context

- [`../public/admin/`](../public/admin/) - Build output (don't edit directly)
- [`../src/admin/`](../src/admin/) - Backend API endpoints
- [`../vite.admin.config.ts`](../vite.admin.config.ts) - Vite configuration
- [`../src/admin/adminApi.ts`](../src/admin/adminApi.ts) - API route handlers
- [`../src/admin/adminAuth.ts`](../src/admin/adminAuth.ts) - JWT authentication
