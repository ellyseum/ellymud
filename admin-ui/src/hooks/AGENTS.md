# Hooks - LLM Context

## useApi Hook

Generic data fetching hook with loading, error, and refetch support.

```typescript
interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

function useApi<T>(fetcher: () => Promise<T>): UseApiResult<T>
```

**Usage:**
```typescript
const { data, loading, error, refetch } = useApi<User[]>(
  () => api.get('/api/users')
);
```

**Important:** The `fetcher` function should be stable (wrapped in useCallback) to prevent infinite loops.

## usePolling Hook

Sets up automatic data refresh at specified intervals.

```typescript
function usePolling(callback: () => void, intervalMs: number): void
```

**Usage:**
```typescript
const { refetch } = useApi<Stats>(() => api.get('/api/stats'));
usePolling(refetch, 5000); // Refresh every 5 seconds
```

## Index Re-export

The `index.ts` file re-exports all hooks for convenient importing:

```typescript
// From index.ts
export { useApi } from './useApi';
export { usePolling } from './usePolling';

// Usage in components
import { useApi, usePolling } from '../hooks';
```
