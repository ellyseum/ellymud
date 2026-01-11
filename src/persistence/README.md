# Persistence Layer

Repository pattern abstractions for data storage, supporting multiple backends (JSON files, SQLite, PostgreSQL).

## Contents

| File | Description |
|------|-------------|
| `RepositoryFactory.ts` | Factory for creating repositories based on storage backend |
| `interfaces.ts` | Repository and service interfaces (sync and async) |
| `Kysely*Repository.ts` | Database implementations (SQLite/PostgreSQL) |
| `AsyncFile*Repository.ts` | JSON file implementations with async interface |
| `fileRepository.ts` | Legacy file-based (JSON) repository implementations |
| `inMemoryRepository.ts` | In-memory repository for testing |
| `mappers/` | Field conversion between database and domain objects |
| `passwordService.ts` | Password hashing service abstraction |

## Quick Start

Use the Repository Factory to get the appropriate implementation:

```typescript
import { getUserRepository, getRoomRepository, getItemRepository, getNpcRepository, getAreaRepository } from './persistence';

const users = await getUserRepository().findAll();
const npcs = await getNpcRepository().findAll();
const areas = await getAreaRepository().findAll();
```

## Purpose

This layer provides an abstraction over data persistence, allowing:
- Multiple storage backends (JSON, SQLite, PostgreSQL)
- Dependency injection for testing
- Centralized backend selection via Repository Factory
- Clean separation of concerns

## Related

- [AGENTS.md](AGENTS.md) - Technical details for LLMs
- [../data/db.ts](../data/db.ts) - Kysely database connection
- [../testing/testDb.ts](../testing/testDb.ts) - In-memory SQLite for tests
