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
    ├── userMapper.ts
    ├── roomMapper.ts
    ├── itemMapper.ts
    └── npcMapper.ts
```

## Repository Factory (Recommended)

**The factory is the single source of truth for storage backend selection.**

```typescript
import { getUserRepository, getRoomRepository, getItemRepository, getNpcRepository, getAreaRepository } from '../persistence';

// Returns appropriate implementation based on STORAGE_BACKEND env var
const userRepo = getUserRepository();
const roomRepo = getRoomRepository();
const itemRepo = getItemRepository();
const npcRepo = getNpcRepository();
const areaRepo = getAreaRepository();

// All repositories implement async interfaces
const users = await userRepo.findAll();
const user = await userRepo.findByUsername('admin');
const npcs = await npcRepo.findAll();
const hostileNpcs = await npcRepo.findHostile();
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
```

### `Kysely*Repository.ts` files

**Purpose**: Database implementations using Kysely ORM.

- `KyselyUserRepository` - SQLite/PostgreSQL user storage
- `KyselyRoomRepository` - SQLite/PostgreSQL room storage
- `KyselyItemRepository` - SQLite/PostgreSQL item storage
- `KyselyNpcRepository` - SQLite/PostgreSQL NPC template storage

**Usage**:
```typescript
import { KyselyUserRepository } from '../persistence/KyselyUserRepository';
import { KyselyNpcRepository } from '../persistence/KyselyNpcRepository';
import { getDb } from '../data/db';

const userRepo = new KyselyUserRepository(getDb());
const npcRepo = new KyselyNpcRepository(getDb());
const users = await userRepo.findAll();
const hostileNpcs = await npcRepo.findHostile();
```

### `AsyncFile*Repository.ts` files

**Purpose**: JSON file implementations with async interface.

- `AsyncFileUserRepository` - JSON file user storage
- `AsyncFileRoomRepository` - JSON file room storage
- `AsyncFileItemRepository` - JSON file item storage
- `AsyncFileNpcRepository` - JSON file NPC template storage
- `AsyncFileAreaRepository` - JSON file area storage (data/areas.json)

### `mappers/`

**Purpose**: Centralized field conversion between DB and domain objects.

```typescript
import { dbRowToUser, userToDbRow } from '../persistence/mappers';
import { dbRowToNPCData, npcDataToDbRow } from '../persistence/mappers';

// Convert database row to User object
const user = dbRowToUser(dbRow);

// Convert User object to database row
const row = userToDbRow(user);

// Convert NPC database row (splits damage into damage_min/damage_max)
const npc = dbRowToNPCData(npcRow);  // damage field reconstructed as [min, max] tuple
const npcRow = npcDataToDbRow(npc);  // damage tuple split into damage_min/damage_max
```

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
- [`../data/db.ts`](../data/db.ts) - Kysely database connection
- [`../data/schema.ts`](../data/schema.ts) - Database table definitions
- [`../testing/testDb.ts`](../testing/testDb.ts) - In-memory SQLite for tests
