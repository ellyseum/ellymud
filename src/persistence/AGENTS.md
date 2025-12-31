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
    └── itemMapper.ts
```

## Repository Factory (Recommended)

**The factory is the single source of truth for storage backend selection.**

```typescript
import { getUserRepository, getRoomRepository, getItemRepository } from '../persistence';

// Returns appropriate implementation based on STORAGE_BACKEND env var
const userRepo = getUserRepository();
const roomRepo = getRoomRepository();
const itemRepo = getItemRepository();

// All repositories implement async interfaces
const users = await userRepo.findAll();
const user = await userRepo.findByUsername('admin');
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
```

### `Kysely*Repository.ts` files

**Purpose**: Database implementations using Kysely ORM.

- `KyselyUserRepository` - SQLite/PostgreSQL user storage
- `KyselyRoomRepository` - SQLite/PostgreSQL room storage
- `KyselyItemRepository` - SQLite/PostgreSQL item storage

**Usage**:
```typescript
import { KyselyUserRepository } from '../persistence/KyselyUserRepository';
import { getDb } from '../data/db';

const repo = new KyselyUserRepository(getDb());
const users = await repo.findAll();
```

### `AsyncFile*Repository.ts` files

**Purpose**: JSON file implementations with async interface.

- `AsyncFileUserRepository` - JSON file user storage
- `AsyncFileRoomRepository` - JSON file room storage
- `AsyncFileItemRepository` - JSON file item storage

### `mappers/`

**Purpose**: Centralized field conversion between DB and domain objects.

```typescript
import { dbRowToUser, userToDbRow } from '../persistence/mappers';

// Convert database row to User object
const user = dbRowToUser(dbRow);

// Convert User object to database row
const row = userToDbRow(user);
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

- [`../user/userManager.ts`](../user/userManager.ts) - Uses IUserRepository (legacy)
- [`../room/roomManager.ts`](../room/roomManager.ts) - Uses IRoomRepository (legacy)
- [`../utils/itemManager.ts`](../utils/itemManager.ts) - Uses IItemRepository (legacy)
- [`../data/db.ts`](../data/db.ts) - Kysely database connection
- [`../data/schema.ts`](../data/schema.ts) - Database table definitions
- [`../testing/testDb.ts`](../testing/testDb.ts) - In-memory SQLite for tests
