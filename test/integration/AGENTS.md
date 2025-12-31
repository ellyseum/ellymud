# Integration Tests - LLM Context

## Overview

Integration tests that verify the system works correctly with real external services. These tests require Docker to spin up test containers.

## File Reference

### `automigrate.integration.test.ts`

**Purpose**: Tests automatic data migration when storage backend changes.

**Tests**:
- JSON → SQLite migration (4 tests)
- SQLite → JSON export (3 tests)
- PostgreSQL → JSON export (3 tests, conditional)
- JSON → PostgreSQL migration (3 tests, conditional)
- SQLite → PostgreSQL migration via JSON intermediate (1 test, conditional)

**Key behaviors verified**:
- Data integrity across migrations (users, rooms, items, item instances)
- Backend state tracking via `.backend-state` file
- Bidirectional migration support
- Cross-database migration (SQLite ↔ PostgreSQL)

**Requires**: `TEST_DATABASE_URL` for PostgreSQL tests

### `redis-session.integration.test.ts`

**Purpose**: Tests RedisSessionStore against a real Redis instance.

**Tests**:
- Session CRUD operations (save, get, delete)
- Session refresh and lastActivity updates
- Health check endpoint
- SCAN-based key retrieval

**Requires**: `REDIS_URL` environment variable

### `storage-backends.integration.test.ts`

**Purpose**: Tests database operations across all supported storage backends.

**Tests for each backend**:
- CRUD operations (create, read, update, delete)
- Upsert/conflict handling
- Transaction support
- JSON serialization in text columns

**Backends tested**:
- SQLite (always runs)
- PostgreSQL (conditional, requires `TEST_DATABASE_URL`)
- JSON files (always runs)

## Running Tests

```bash
# Redis tests only
npm run test:integration

# Include PostgreSQL tests
./scripts/test-integration.sh --with-postgres

# With custom Postgres URL
TEST_DATABASE_URL="postgres://..." npm run test:integration
```

## Test Isolation

- Each backend test uses temporary databases/files
- SQLite: Creates temp file in `os.tmpdir()`, deleted after tests
- PostgreSQL: Drops and recreates test tables
- JSON: Creates temp directory, deleted after tests

## Conditional Test Execution

Tests that require external services use conditional describe blocks:

```typescript
const describeWithRedis = process.env.REDIS_URL ? describe : describe.skip;
const describePostgres = process.env.TEST_DATABASE_URL ? describe : describe.skip;
```

## Related Context

- [`../../src/data/db.ts`](../../src/data/db.ts) - Database connection module being tested
- [`../../src/session/redisSessionStore.ts`](../../src/session/redisSessionStore.ts) - Redis store being tested
- [`../../scripts/test-integration.sh`](../../scripts/test-integration.sh) - Test runner with Docker setup
- [`../../jest.integration.config.js`](../../jest.integration.config.js) - Jest configuration
