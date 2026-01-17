# Persistence Layer - LLM Context

## Overview

Repository pattern implementation providing abstractions for data storage. Supports multiple backends (JSON files, SQLite, PostgreSQL) via a Repository Factory pattern.

## Architecture

```
interfaces.ts                    # Contracts (IAsyncUserRepository, etc.)
    ↓
RepositoryFactory.ts             # Backend selection based on STORAGE_BACKEND
    ├── AsyncFile*Repository.ts  # JSON file storage (development)
    └── Kysely*Repository.ts     # SQLite/PostgreSQL (production)

mappers/                         # Field conversion (snake_case ↔ camelCase)
    ├── userMapper.ts            # User ↔ database
    ├── roomMapper.ts            # Room template ↔ database
    ├── roomStateMapper.ts       # Room state ↔ database
    ├── itemMapper.ts            # Item/instance ↔ database
    ├── npcMapper.ts             # NPC template ↔ database
    ├── adminMapper.ts           # Admin user ↔ database
    ├── bugReportMapper.ts       # Bug report ↔ database
    ├── merchantStateMapper.ts   # Merchant state ↔ database
    ├── abilityMapper.ts         # Ability template ↔ database
    └── snakeScoreMapper.ts      # Snake score ↔ database
```

## Repository Factory (Recommended)

**The factory is the single source of truth for storage backend selection.**

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
} from '../persistence';

// Returns appropriate implementation based on STORAGE_BACKEND env var
const userRepo = getUserRepository();
const roomRepo = getRoomRepository();
const itemRepo = getItemRepository();
const npcRepo = getNpcRepository();
const areaRepo = getAreaRepository();
const roomStateRepo = getRoomStateRepository();  // Room state persistence
const adminRepo = getAdminRepository();          // Admin users
const bugReportRepo = getBugReportRepository();  // Bug reports
const merchantRepo = getMerchantStateRepository(); // Merchant inventory state
const abilityRepo = getAbilityRepository();      // Ability templates
const snakeScoreRepo = getSnakeScoreRepository(); // Snake game scores
const mudConfigRepo = getMUDConfigRepository();   // MUD server config (singleton)
const timerConfigRepo = getGameTimerConfigRepository(); // Timer config (singleton)

// All repositories implement async interfaces
const users = await userRepo.findAll();
const user = await userRepo.findByUsername('admin');
const npcs = await npcRepo.findAll();
const hostileNpcs = await npcRepo.findHostile();
const roomStates = await roomStateRepo.findAll();
const admins = await adminRepo.findAll();
const bugs = await bugReportRepo.findUnsolved();

// Config repositories use singleton pattern (single config record)
const mudConfig = await mudConfigRepo.get();
const timerConfig = await timerConfigRepo.get();
```

## Key Files

### `RepositoryFactory.ts`

**Purpose**: Creates repository instances based on `STORAGE_BACKEND` config.

```typescript
import { getUserRepository } from '../persistence/RepositoryFactory';

// Returns AsyncFileUserRepository for 'json'
// Returns KyselyUserRepository for 'sqlite' or 'postgres'
const repo = getUserRepository();
```

### `interfaces.ts`

**Purpose**: Defines contracts for all repository types.

**Async Interfaces (preferred for new code)**:
```typescript
export interface IAsyncUserRepository {
  findAll(): Promise<User[]>;
  findByUsername(username: string): Promise<User | undefined>;
  exists(username: string): Promise<boolean>;
  save(user: User): Promise<void>;
  saveAll(users: User[]): Promise<void>;
  delete(username: string): Promise<void>;
  storageExists(): Promise<boolean>;
}

export interface IAsyncRoomRepository {
  findAll(): Promise<RoomData[]>;
  findById(id: string): Promise<RoomData | undefined>;
  save(room: RoomData): Promise<void>;
  saveAll(rooms: RoomData[]): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface IAsyncRoomStateRepository {
  // Handles mutable room data separately from templates
  findAll(): Promise<RoomState[]>;
  findByRoomId(roomId: string): Promise<RoomState | undefined>;
  save(state: RoomState): Promise<void>;
  saveAll(states: RoomState[]): Promise<void>;
  delete(roomId: string): Promise<void>;
}

export interface IAsyncItemRepository {
  findAllTemplates(): Promise<GameItem[]>;
  findTemplateById(id: string): Promise<GameItem | undefined>;
  findAllInstances(): Promise<ItemInstance[]>;
  findInstanceById(instanceId: string): Promise<ItemInstance | undefined>;
  findInstancesByTemplateId(templateId: string): Promise<ItemInstance[]>;
  saveTemplate(item: GameItem): Promise<void>;
  saveTemplates(items: GameItem[]): Promise<void>;
  deleteTemplate(id: string): Promise<void>;
  saveInstance(instance: ItemInstance): Promise<void>;
  saveInstances(instances: ItemInstance[]): Promise<void>;
  deleteInstance(instanceId: string): Promise<void>;
}

export interface IAsyncNpcRepository {
  findAll(): Promise<NPCData[]>;
  findById(id: string): Promise<NPCData | undefined>;
  findByName(name: string): Promise<NPCData | undefined>;
  findHostile(): Promise<NPCData[]>;
  findMerchants(): Promise<NPCData[]>;
  save(npc: NPCData): Promise<void>;
  saveAll(npcs: NPCData[]): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface IAsyncAreaRepository {
  findAll(): Promise<Area[]>;
  findById(id: string): Promise<Area | undefined>;
  save(area: Area): Promise<void>;
  saveAll(areas: Area[]): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface IAsyncAdminRepository {
  findAll(): Promise<AdminUser[]>;
  findByUsername(username: string): Promise<AdminUser | undefined>;
  exists(username: string): Promise<boolean>;
  save(admin: AdminUser): Promise<void>;
  saveAll(admins: AdminUser[]): Promise<void>;
  delete(username: string): Promise<void>;
  storageExists(): Promise<boolean>;
}

export interface IAsyncBugReportRepository {
  findAll(): Promise<BugReport[]>;
  findById(id: string): Promise<BugReport | undefined>;
  findByUser(username: string): Promise<BugReport[]>;
  findUnsolved(): Promise<BugReport[]>;
  save(report: BugReport): Promise<void>;
  saveAll(reports: BugReport[]): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface IAsyncMerchantStateRepository {
  findAll(): Promise<MerchantInventoryState[]>;
  findByTemplateId(templateId: string): Promise<MerchantInventoryState | undefined>;
  exists(templateId: string): Promise<boolean>;
  save(state: MerchantInventoryState): Promise<void>;
  saveAll(states: MerchantInventoryState[]): Promise<void>;
  delete(templateId: string): Promise<void>;
}

export interface IAsyncAbilityRepository {
  findAll(): Promise<AbilityTemplate[]>;
  findById(id: string): Promise<AbilityTemplate | undefined>;
  findByType(type: string): Promise<AbilityTemplate[]>;
  save(ability: AbilityTemplate): Promise<void>;
  saveAll(abilities: AbilityTemplate[]): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface IAsyncSnakeScoreRepository {
  findAll(): Promise<SnakeScoreEntry[]>;
  findByUsername(username: string): Promise<SnakeScoreEntry[]>;
  findTopScores(limit: number): Promise<SnakeScoreEntry[]>;
  save(score: SnakeScoreEntry): Promise<void>;
  saveAll(scores: SnakeScoreEntry[]): Promise<void>;
  deleteByUsername(username: string): Promise<void>;
}

// Configuration repositories - singleton pattern (only one record)

export interface IAsyncMUDConfigRepository {
  get(): Promise<MUDConfig>;
  save(config: MUDConfig): Promise<void>;
  updateGame(game: Partial<MUDConfig['game']>): Promise<void>;
  updateAdvanced(advanced: Partial<MUDConfig['advanced']>): Promise<void>;
  exists(): Promise<boolean>;
}

export interface IAsyncGameTimerConfigRepository {
  get(): Promise<GameTimerConfig>;
  save(config: GameTimerConfig): Promise<void>;
  exists(): Promise<boolean>;
}
```

### Config Repository Singleton Pattern

**⚠️ Important**: Configuration repositories use a singleton pattern where there's only one record in the database table, identified by `key='singleton'`. This differs from entity repositories that store multiple records.

```typescript
// Config repos return a single config object, not an array
const mudConfig = await getMUDConfigRepository().get();
const timerConfig = await getGameTimerConfigRepository().get();

// Save replaces the entire config (upsert with key='singleton')
await getMUDConfigRepository().save(updatedConfig);
```

### `Kysely*Repository.ts` files

**Purpose**: Database implementations using Kysely ORM.

**Core Repositories**:
- `KyselyUserRepository` - SQLite/PostgreSQL user storage
- `KyselyRoomRepository` - SQLite/PostgreSQL room storage
- `KyselyRoomStateRepository` - SQLite/PostgreSQL room state storage
- `KyselyItemRepository` - SQLite/PostgreSQL item storage
- `KyselyNpcRepository` - SQLite/PostgreSQL NPC template storage
- `KyselyAreaRepository` - SQLite/PostgreSQL area/zone storage

**New Repositories (Phase 2-5)**:
- `KyselyAdminRepository` - Admin user management
- `KyselyBugReportRepository` - Bug report storage
- `KyselyMerchantStateRepository` - Merchant inventory state
- `KyselyAbilityRepository` - Ability templates
- `KyselySnakeScoreRepository` - Snake game leaderboard

**Config Repositories (Singleton Pattern)**:
- `KyselyMUDConfigRepository` - MUD server configuration (key='singleton')
- `KyselyGameTimerConfigRepository` - Game timer configuration (key='singleton')

**Usage**:
```typescript
import { KyselyUserRepository } from '../persistence/KyselyUserRepository';
import { KyselyNpcRepository } from '../persistence/KyselyNpcRepository';
import { KyselyAdminRepository } from '../persistence/KyselyAdminRepository';
import { getDb } from '../data/db';

const userRepo = new KyselyUserRepository(getDb());
const npcRepo = new KyselyNpcRepository(getDb());
const adminRepo = new KyselyAdminRepository(getDb());
const users = await userRepo.findAll();
const hostileNpcs = await npcRepo.findHostile();
const admins = await adminRepo.findAll();
```

### `AsyncFile*Repository.ts` files

**Purpose**: JSON file implementations with async interface.

**Core Repositories**:
- `AsyncFileUserRepository` - JSON file user storage
- `AsyncFileRoomRepository` - JSON file room template storage
- `AsyncFileRoomStateRepository` - JSON file room state storage (items, NPCs, currency)
- `AsyncFileItemRepository` - JSON file item storage
- `AsyncFileNpcRepository` - JSON file NPC template storage
- `AsyncFileAreaRepository` - JSON file area storage (data/areas.json)

**New Repositories (Phase 2-5)**:
- `AsyncFileAdminRepository` - Admin users (data/admin.json)
- `AsyncFileBugReportRepository` - Bug reports (data/bug-reports.json)
- `AsyncFileMerchantStateRepository` - Merchant state (data/merchant-state.json)
- `AsyncFileAbilityRepository` - Abilities (data/abilities.json)
- `AsyncFileSnakeScoreRepository` - Snake scores (data/snake-scores.json)

**Config Repositories**:
- `AsyncFileMUDConfigRepository` - MUD config (data/mud-config.json)
- `AsyncFileGameTimerConfigRepository` - Timer config (data/gametimer-config.json)

### `AsyncFileRoomStateRepository.ts`

**Purpose**: Persists mutable room state separately from templates.

```typescript
import { AsyncFileRoomStateRepository } from '../persistence/AsyncFileRoomStateRepository';
import { RoomState } from '../room/roomData';

const repo = new AsyncFileRoomStateRepository();

// Load all room states
const states = await repo.findAll();

// Get state for specific room
const state = await repo.findByRoomId('town-square');

// Save updated state
await repo.save({
  roomId: 'town-square',
  itemInstances: [{ instanceId: 'sword-001', templateId: 'sword-iron' }],
  npcTemplateIds: ['guard-1'],
  currency: { gold: 100, silver: 50, copper: 25 }
});
```

**Key Point**: This repository handles `room_state.json`, keeping mutable data separate from the immutable templates in `rooms.json`.

### `mappers/`

**Purpose**: Centralized field conversion between DB and domain objects.

```typescript
import { dbRowToUser, userToDbRow } from '../persistence/mappers';
import { dbRowToNPCData, npcDataToDbRow } from '../persistence/mappers';
import { dbRowToArea, areaToDbRow } from '../persistence/mappers';
import { dbRowToAdminUser, adminUserToDbRow } from '../persistence/mappers';
import { dbRowToBugReport, bugReportToDbRow } from '../persistence/mappers';

// Convert database row to User object
const user = dbRowToUser(dbRow);

// Convert User object to database row
const row = userToDbRow(user);

// Convert NPC database row (splits damage into damage_min/damage_max)
const npc = dbRowToNPCData(npcRow);  // damage field reconstructed as [min, max] tuple
const npcRow = npcDataToDbRow(npc);  // damage tuple split into damage_min/damage_max

// Convert Area database row (JSON parsing for complex fields)
const area = dbRowToArea(areaRow);   // levelRange, flags, configs parsed from JSON
const areaRow = areaToDbRow(area);   // Complex fields serialized to JSON

// Convert admin user
const admin = dbRowToAdminUser(adminRow);
const adminRow = adminUserToDbRow(admin);

// Convert bug report (handles nested logs object)
const report = dbRowToBugReport(reportRow);
const reportRow = bugReportToDbRow(report);
```

**Available Mappers**:
| Mapper | Domain Type | DB Columns |
|--------|-------------|------------|
| `userMapper` | `User` | `password_hash`, `max_health`, etc. |
| `roomMapper` | `RoomData` | `exits` (JSON), `currency_*`, etc. |
| `roomStateMapper` | `RoomState` | `room_id`, `item_instances` (JSON), etc. |
| `itemMapper` | `GameItem`, `ItemInstance` | `stats` (JSON), `template_id`, etc. |
| `npcMapper` | `NPCData` | `damage_min`, `damage_max`, etc. |
| `adminMapper` | `AdminUser` | `added_by`, `added_on` |
| `bugReportMapper` | `BugReport` | `logs_raw`, `logs_user`, `solved_*` |
| `merchantStateMapper` | `MerchantInventoryState` | `template_id`, `inventory` (JSON) |
| `abilityMapper` | `AbilityTemplate` | `cooldown_ms`, `effects` (JSON) |
| `snakeScoreMapper` | `SnakeScoreEntry` | `username`, `score`, `date` |

## Testing

### In-Memory SQLite for Tests

```typescript
import { setupTestDb, destroyTestDb } from '../testing/testDb';
import { KyselyUserRepository } from '../persistence/KyselyUserRepository';

describe('MyTest', () => {
  let db: Kysely<Database>;
  let repo: KyselyUserRepository;

  beforeEach(async () => {
    db = await setupTestDb();
    repo = new KyselyUserRepository(db);
  });

  afterEach(async () => {
    await destroyTestDb();
  });
});
```

### Legacy In-Memory Repositories

```typescript
import { InMemoryUserRepository } from '../persistence/inMemoryRepository';

const mockRepo = new InMemoryUserRepository();
mockRepo.setUsers([createMockUser({ username: 'test' })]);
```

## Conventions

### Using Repository Factory (Recommended)

```typescript
import { getUserRepository, IAsyncUserRepository } from '../persistence';

export class SomeManager {
  constructor(private userRepo: IAsyncUserRepository = getUserRepository()) {}
  
  async loadUsers() {
    this.users = await this.userRepo.findAll();
  }
}
```

### Legacy Pattern (Deprecated)

```typescript
// ❌ Don't check STORAGE_BACKEND directly in managers
if (STORAGE_BACKEND === 'json') {
  this.loadFromFile();
} else {
  this.loadFromDatabase();
}

// ✅ Use repository factory instead
const repo = getUserRepository();
await repo.findAll();
```

## Related Context

- [`../user/userManager.ts`](../user/userManager.ts) - Uses IAsyncUserRepository via getUserRepository()
- [`../room/roomManager.ts`](../room/roomManager.ts) - Uses IAsyncRoomRepository via getRoomRepository()
- [`../utils/itemManager.ts`](../utils/itemManager.ts) - Uses IAsyncItemRepository via getItemRepository()
- [`../combat/npc.ts`](../combat/npc.ts) - Uses IAsyncNpcRepository via getNpcRepository()
- [`../area/areaManager.ts`](../area/areaManager.ts) - Uses IAsyncAreaRepository via getAreaRepository()
- [`../data/db.ts`](../data/db.ts) - Kysely database connection
- [`../data/schema.ts`](../data/schema.ts) - Database table definitions
- [`../testing/testDb.ts`](../testing/testDb.ts) - In-memory SQLite for tests
