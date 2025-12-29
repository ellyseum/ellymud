# Session Management

Server-side session storage abstraction with pluggable backends for in-memory and Redis-based persistence.

## Contents

| Path                          | Description                             |
| ----------------------------- | --------------------------------------- |
| `types.ts`                    | SessionStore interface and SessionData type |
| `memorySessionStore.ts`       | In-memory session storage implementation |
| `redisSessionStore.ts`        | Redis-backed session storage implementation |
| `sessionFactory.ts`           | Factory for creating the appropriate store |
| `memorySessionStore.test.ts`  | Unit tests for in-memory store          |
| `redisSessionStore.test.ts`   | Integration tests for Redis store       |

## Overview

This directory implements the session storage layer using a Strategy pattern. The system supports two backends:

- **Memory Store**: Default for development. Sessions are lost on server restart.
- **Redis Store**: For production. Sessions persist across restarts and support horizontal scaling.

The backend is selected via the `USE_REDIS` environment variable.

## Related

- [`../data/`](../data/) - Redis client singleton used by RedisSessionStore
- [`../config.ts`](../config.ts) - USE_REDIS configuration flag
- [`../utils/`](../utils/) - Logging utilities
