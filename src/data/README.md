# Data Directory (Source)

Runtime data utilities and external data store clients.

## Contents

| Path       | Description                          |
| ---------- | ------------------------------------ |
| `redis.ts` | Redis client singleton for session storage |

## Overview

This directory contains utilities for connecting to external data stores. Currently provides the Redis client used by the session management system.

**Note**: This is separate from the root `data/` directory which contains JSON game data files (users, rooms, items, NPCs).

## Related

- [`../../data/`](../../data/) - Game data JSON files
- [`../session/`](../session/) - Session stores that use the Redis client
- [`../config.ts`](../config.ts) - `USE_REDIS` and `REDIS_URL` configuration
