# Session Management - LLM Context

## Overview

This directory implements a session storage abstraction layer using the Strategy pattern. It allows the server to switch between in-memory and Redis-backed session storage without changing application code.

**Key design decisions:**
- Interface-based design enables easy testing and backend swapping
- Factory pattern selects backend based on `USE_REDIS` environment variable
- Both stores implement identical async interface for consistency
- TTL-based expiration (1 hour) for automatic session cleanup

## Architecture

```
SessionStore Interface
├── MemorySessionStore (Map-based, in-process)
│   └── Cleanup interval for expired sessions
└── RedisSessionStore (ioredis, external)
    └── Redis TTL handles expiration

sessionFactory.ts
└── createSessionStore() → returns appropriate implementation
```

## File Reference

### `types.ts`

**Purpose**: Defines the core interfaces for session management.

**Key Exports**:
```typescript
export interface SessionData {
  username: string;
  sessionId: string;
  createdAt: number;
  lastActivity: number;
  [key: string]: unknown;  // Extensible for future needs
}

export interface SessionStore {
  saveSession(sessionId: string, data: SessionData): Promise<void>;
  getSession(sessionId: string): Promise<SessionData | null>;
  refreshSession(sessionId: string): Promise<void>;
  deleteSession(sessionId: string): Promise<void>;
  healthCheck(): Promise<boolean>;
}
```

**Usage**:
```typescript
import { SessionStore, SessionData } from './types';

// Type your store references
const store: SessionStore = createSessionStore();
```

---

### `memorySessionStore.ts`

**Purpose**: In-memory session storage using a JavaScript Map. Default for development.

**Key Exports**:
```typescript
export class MemorySessionStore implements SessionStore {
  getSessionCount(): number;  // Extra method for debugging
  clear(): void;              // For testing cleanup
  stopCleanup(): void;        // Stop the cleanup interval
}
```

**Behavior**:
- Sessions stored in `Map<string, SessionData>`
- Automatic cleanup every 60 seconds removes expired sessions
- TTL: 1 hour (3600000ms)
- Always passes health check

**Usage**:
```typescript
const store = new MemorySessionStore();
await store.saveSession('abc123', {
  username: 'player1',
  sessionId: 'abc123',
  createdAt: Date.now(),
  lastActivity: Date.now(),
});
```

**Testing Notes**:
- Call `stopCleanup()` in `afterEach` to prevent timer leaks
- Call `clear()` to reset state between tests

---

### `redisSessionStore.ts`

**Purpose**: Redis-backed session storage for production deployments.

**Key Exports**:
```typescript
export class RedisSessionStore implements SessionStore {
  getAllSessionKeys(): Promise<string[]>;  // For debugging/admin
}
```

**Behavior**:
- Uses `session:` prefix for all keys
- TTL: 1 hour (3600 seconds), managed by Redis
- Lazy connection via `getRedisClient()`
- Health check uses `PING` command

**Key Pattern**:
```typescript
// Keys are prefixed for namespace isolation
const key = `session:${sessionId}`;  // e.g., "session:abc123"
```

**Redis Commands Used**:
- `SET key value EX ttl` - Save with expiration
- `GET key` - Retrieve session
- `EXPIRE key ttl` - Refresh TTL
- `DEL key` - Delete session
- `PING` - Health check
- `KEYS session:*` - List all sessions (admin only)

---

### `sessionFactory.ts`

**Purpose**: Factory function for creating the appropriate session store.

**Key Exports**:
```typescript
export function createSessionStore(): SessionStore;

// Re-exports for convenience
export { MemorySessionStore } from './memorySessionStore';
export { RedisSessionStore } from './redisSessionStore';
export type { SessionStore, SessionData } from './types';
```

**Selection Logic**:
```typescript
const useRedis = process.env.USE_REDIS === 'true';
// Returns RedisSessionStore if true, MemorySessionStore otherwise
```

**Usage**:
```typescript
import { createSessionStore, SessionStore } from './session/sessionFactory';

const sessionStore = createSessionStore();
// Now use sessionStore without knowing which backend
```

---

### `memorySessionStore.test.ts`

**Purpose**: Unit tests for MemorySessionStore.

**Test Coverage**:
- Save and retrieve sessions
- Non-existent session returns null
- Session deletion
- Health check always passes
- Session refresh updates lastActivity

---

### `redisSessionStore.test.ts`

**Purpose**: Integration tests for RedisSessionStore (requires Redis).

**Notes**:
- Tests are skipped if Redis is unavailable
- Uses real Redis connection, not mocks
- Clean up test data after each test

## Conventions

### Environment Variables

```bash
# Enable Redis backend
USE_REDIS=true

# Redis connection (defaults to localhost:6379)
REDIS_URL=redis://localhost:6379
```

### Session ID Format

Session IDs should be opaque strings. The stores don't validate format:

```typescript
// ✅ Recommended: UUID or secure random
const sessionId = crypto.randomUUID();

// ✅ Also valid: any unique string
const sessionId = `${username}-${Date.now()}`;
```

### Error Handling

Both stores are async but handle errors differently:

```typescript
// MemorySessionStore: Never throws
await memoryStore.getSession('x');  // Returns null if missing

// RedisSessionStore: May throw on connection issues
try {
  await redisStore.getSession('x');
} catch (err) {
  // Handle Redis connection failure
}
```

## Common Tasks

### Adding a New Session Field

1. Update `SessionData` interface in `types.ts`:
```typescript
export interface SessionData {
  username: string;
  sessionId: string;
  createdAt: number;
  lastActivity: number;
  newField?: string;  // Add new optional field
}
```

2. No changes needed to stores - they serialize the full object.

### Implementing a New Backend

1. Create new file implementing `SessionStore` interface
2. Add selection logic in `sessionFactory.ts`
3. Add corresponding tests

```typescript
// Example: PostgreSQL backend
export class PostgresSessionStore implements SessionStore {
  async saveSession(sessionId: string, data: SessionData): Promise<void> {
    // Implementation
  }
  // ... other methods
}
```

### Testing with Sessions

```typescript
import { MemorySessionStore } from './memorySessionStore';

describe('MyFeature', () => {
  let store: MemorySessionStore;

  beforeEach(() => {
    store = new MemorySessionStore();
  });

  afterEach(() => {
    store.stopCleanup();  // ⚠️ IMPORTANT: Prevent timer leaks
    store.clear();
  });
});
```

## Gotchas & Warnings

- ⚠️ **Timer Leaks**: MemorySessionStore starts a cleanup interval. Always call `stopCleanup()` in tests.
- ⚠️ **Redis Connection**: RedisSessionStore uses lazy connection. First operation may be slow.
- ⚠️ **No Persistence**: MemorySessionStore loses all sessions on server restart.
- ⚠️ **Key Conflicts**: RedisSessionStore uses `session:` prefix. Don't use this prefix for other Redis keys.
- ⚠️ **JSON Serialization**: SessionData is JSON-serialized for Redis. Don't store non-serializable values.

## Useful Commands

```bash
# Run session store tests
npm test -- src/session/

# Run only memory store tests (no Redis needed)
npm test -- src/session/memorySessionStore.test.ts

# Check Redis connection
redis-cli ping

# List all sessions in Redis
redis-cli keys "session:*"

# View a specific session
redis-cli get "session:abc123"
```

## Related Context

- [`../data/redis.ts`](../data/redis.ts) - Redis client singleton used by RedisSessionStore
- [`../config.ts`](../config.ts) - `USE_REDIS` configuration flag
- [`../utils/logger.ts`](../utils/logger.ts) - Logging used by both stores
