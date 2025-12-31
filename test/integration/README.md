# Integration Tests

Tests that require external services (Redis, PostgreSQL, etc.) to run.

## Contents

| File | Description |
|------|-------------|
| `automigrate.integration.test.ts` | Auto-migration between storage backends (JSON↔SQLite↔PostgreSQL) |
| `redis-session.integration.test.ts` | Redis session store tests |
| `storage-backends.integration.test.ts` | SQLite, PostgreSQL, and JSON storage backend tests |

## Running Tests

### Basic (Redis only)

```bash
npm run test:integration
```

### With PostgreSQL

```bash
./scripts/test-integration.sh --with-postgres
```

### With Custom Database URL

```bash
TEST_DATABASE_URL="postgres://user:pass@host:5432/db" npm run test:integration
```

## Prerequisites

- Docker (for spinning up test containers)
- Port 6379 available (Redis)
- Port 5432 available (PostgreSQL, optional)

## Related

- [AGENTS.md](AGENTS.md) - Technical details for LLMs
- [../e2e/](../e2e/) - End-to-end game tests
- [../../scripts/test-integration.sh](../../scripts/test-integration.sh) - Test runner script
