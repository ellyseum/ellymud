# Data Directory (src) - LLM Context

## Overview

This directory contains utilities for connecting to external data stores. Currently provides the Redis client singleton used by the session management system.

**Note**: This is different from the root `data/` directory which contains JSON game data files.

## File Reference

### `redis.ts`

**Purpose**: Redis client singleton with automatic reconnection and lazy initialization.

**Key Exports**:
```typescript
export function getRedisClient(): Redis;
export async function closeRedisClient(): Promise<void>;
export function resetRedisClient(): void;
```

**Configuration**:
```bash
# Environment variables
REDIS_URL=redis://localhost:6379  # Default if not set
```

**Usage**:
```typescript
import { getRedisClient } from '../data/redis';

const redis = getRedisClient();
await redis.set('key', 'value');
const value = await redis.get('key');
```

**Connection Behavior**:
- Lazy connection: Client created on first `getRedisClient()` call
- Auto-retry: Exponential backoff (50ms to 2s) on connection failure
- Max 3 retries per request before throwing
- Events logged: `connect`, `ready`, `error`

**Lifecycle Functions**:
```typescript
// Graceful shutdown (waits for pending commands)
await closeRedisClient();

// Immediate disconnect (for testing)
resetRedisClient();
```

## Conventions

### Singleton Pattern

Always use `getRedisClient()`, never create Redis instances directly:

```typescript
// ✅ Correct
import { getRedisClient } from '../data/redis';
const redis = getRedisClient();

// ❌ Wrong - creates multiple connections
import Redis from 'ioredis';
const redis = new Redis();
```

### Cleanup in Tests

```typescript
import { resetRedisClient } from '../data/redis';

afterEach(() => {
  resetRedisClient();  // Disconnect between tests
});
```

## Gotchas & Warnings

- ⚠️ **Lazy Connect**: First Redis operation may be slow due to connection setup.
- ⚠️ **Singleton State**: `resetRedisClient()` affects all code sharing the singleton.
- ⚠️ **Environment Variable**: `REDIS_URL` must be set before first `getRedisClient()` call.
- ⚠️ **Error Handling**: Connection errors are logged but may throw on operations.

## Useful Commands

```bash
# Check Redis is running
redis-cli ping

# Monitor Redis commands in real-time
redis-cli monitor

# Check connection from Node
node -e "require('ioredis').default('redis://localhost:6379').ping().then(console.log)"
```

## Related Context

- [`../session/`](../session/) - Session stores that use this Redis client
- [`../config.ts`](../config.ts) - `USE_REDIS` configuration flag
- [`../../data/`](../../data/) - Root data directory with JSON game files
