# Admin UI Source - LLM Context

## Overview

This is the source directory for the React admin dashboard. The application is built with React 18, TypeScript, and Vite as part of the unified frontend MPA.

## File Structure

```
src/
├── main.tsx           # React entry point, renders App into #root
├── App.tsx            # Main component, handles auth and routing
├── index.css          # Global styles, dark theme
├── vite-env.d.ts      # Vite type declarations
├── components/        # UI components
├── context/           # React context providers
├── hooks/             # Custom hooks
├── services/          # API client
├── types/             # TypeScript definitions
└── utils/             # Utility functions
```

## Key Patterns

### Component Structure

All panel components follow this pattern:

```typescript
import { useApi, usePolling } from '../hooks';
import { api } from '../services/api';

export function SomePanel() {
  const { data, loading, error, refetch } = useApi<DataType>(
    () => api.get('/endpoint')
  );
  
  usePolling(refetch, 5000); // Auto-refresh every 5s
  
  if (loading) return <LoadingSpinner />;
  if (error) return <div>Error: {error}</div>;
  
  return <div>{/* render data */}</div>;
}
```

### Authentication Flow

1. `AuthContext` provides `token`, `login`, `logout`
2. `App.tsx` checks for token, shows `LoginPage` if missing
3. API client reads token from localStorage
4. All API calls include `Authorization: Bearer <token>` header

## Build Configuration

The Vite config is at project root: `vite.config.ts` (unified MPA config)

```typescript
// Key settings for admin
root: 'src/frontend',        // Source root
outDir: '../../dist/public', // Build output
// Admin served at /admin/ via MPA input config
```

## Development Commands

```bash
npm run dev:frontend     # Start unified dev server (port 5173)
npm run build:frontend   # Production build
npm run preview:frontend # Preview production build
```
