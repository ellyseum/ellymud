# Persistence Layer

Repository pattern abstractions for data storage, supporting multiple backends (JSON files, SQLite, PostgreSQL).

## Contents

| File | Description |
|------|-------------|
| `RepositoryFactory.ts` | Factory for creating repositories based on storage backend |
| `interfaces.ts` | Repository and service interfaces (sync and async) |
| `Kysely*Repository.ts` | Database implementations (SQLite/PostgreSQL) |
| `KyselyAreaRepository.ts` | Kysely area repository (zone metadata) |
| `KyselyMUDConfigRepository.ts` | Database MUD config storage (singleton pattern) |
| `KyselyGameTimerConfigRepository.ts` | Database game timer config storage (singleton pattern) |
| `AsyncFile*Repository.ts` | JSON file implementations with async interface |
| `AsyncFileMUDConfigRepository.ts` | JSON MUD config storage |
| `AsyncFileGameTimerConfigRepository.ts` | JSON game timer config storage |
| `fileRepository.ts` | Legacy file-based (JSON) repository implementations |
| `inMemoryRepository.ts` | In-memory repository for testing |
| `mappers/` | Field conversion between database and domain objects |
| `passwordService.ts` | Password hashing service abstraction |

### Repository Types

| Repository | JSON File | Database Table | Purpose |
|------------|-----------|----------------|---------|
| User | `users.json` | `users` | Player accounts and stats |
| Room | `rooms.json` | `rooms` | Room templates |
| RoomState | `room_state.json` | `room_states` | Mutable room data (items, NPCs) |
| Item | `items.json`, `itemInstances.json` | `items`, `item_instances` | Item templates and instances |
| NPC | `npcs.json` | `npcs` | NPC templates |
| Area | `areas.json` | (file only) | Area definitions |
| Admin | `admin.json` | `admins` | Admin user privileges |
| BugReport | `bug-reports.json` | `bug_reports` | Player bug reports |
| MerchantState | `merchant-state.json` | `merchant_states` | Merchant inventory |
| Ability | `abilities.json` | `abilities` | Ability templates |
| SnakeScore | `snake-scores.json` | `snake_scores` | Snake game leaderboard |
| MUDConfig | `mud-config.json` | `mud_configs` | Server configuration (singleton) |
| GameTimerConfig | `gametimer-config.json` | `gametimer_configs` | Timer intervals (singleton) |

## Quick Start

Use the Repository Factory to get the appropriate implementation:

```typescript
import { 
  getUserRepository, 
  getRoomRepository, 
  getItemRepository, 
  getNpcRepository, 
  getAreaRepository, 
  getRoomStateRepository,
  getAdminRepository,
  getBugReportRepository,
  getMerchantStateRepository,
  getAbilityRepository,
  getSnakeScoreRepository,
  getMUDConfigRepository,
  getGameTimerConfigRepository
} from './persistence';

const users = await getUserRepository().findAll();
const npcs = await getNpcRepository().findAll();
const areas = await getAreaRepository().findAll();
const roomState = await getRoomStateRepository().findAll();
const admins = await getAdminRepository().findAll();
const bugs = await getBugReportRepository().findUnsolved();
const mudConfig = await getMUDConfigRepository().get();
const timerConfig = await getGameTimerConfigRepository().get();
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
