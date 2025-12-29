# Persistence Layer - LLM Context

## Overview

Repository pattern implementation providing abstractions for data storage. This enables dependency injection, testability, and future backend flexibility.

## Architecture

```
interfaces.ts          # Contracts (IUserRepository, IRoomRepository, etc.)
    ↓
fileRepository.ts      # Production: reads/writes JSON files
inMemoryRepository.ts  # Testing: stores data in memory
passwordService.ts     # Password hashing abstraction
```

## File Reference

### `interfaces.ts`

**Purpose**: Defines contracts for all repository types.

**Key Interfaces**:
```typescript
export interface IUserRepository {
  loadUsers(): User[];
  saveUsers(users: User[]): void;
  storageExists(): boolean;
}

export interface IRoomRepository {
  loadRooms(): RoomData[];
  saveRooms(rooms: RoomData[]): void;
  storageExists(): boolean;
}

export interface IItemRepository {
  loadItems(): GameItem[];
  loadItemInstances(): ItemInstance[];
  saveItems(items: GameItem[]): void;
  saveItemInstances(instances: ItemInstance[]): void;
}

export interface IPasswordService {
  hash(password: string): { hash: string; salt: string };
  verify(password: string, hash: string, salt: string): boolean;
}

export interface RepositoryConfig {
  dataDir?: string;
}
```

### `fileRepository.ts`

**Purpose**: Production implementations reading/writing JSON files.

**Classes**:
- `FileUserRepository` - Reads/writes `users.json`
- `FileRoomRepository` - Reads/writes `rooms.json`
- `FileItemRepository` - Reads/writes `items.json`, `itemInstances.json`

**Usage**:
```typescript
import { FileUserRepository } from '../persistence/fileRepository';

const repo = new FileUserRepository({ dataDir: '/custom/path' });
const users = repo.loadUsers();
```

### `inMemoryRepository.ts`

**Purpose**: Test implementations that store data in memory.

**Usage in Tests**:
```typescript
import { InMemoryUserRepository } from '../persistence/inMemoryRepository';

const mockRepo = new InMemoryUserRepository();
mockRepo.setUsers([createMockUser({ username: 'test' })]);

const userManager = UserManager.createWithDependencies(mockRepo);
```

### `passwordService.ts`

**Purpose**: Password hashing abstraction using PBKDF2.

**Key Functions**:
```typescript
export function getPasswordService(): IPasswordService;
```

## Conventions

### Creating New Repositories

1. Define interface in `interfaces.ts`
2. Implement `File*Repository` in `fileRepository.ts`
3. Implement `InMemory*Repository` in `inMemoryRepository.ts`
4. Inject via manager's constructor or factory method

### Using in Managers

```typescript
export class SomeManager {
  private repository: ISomeRepository;
  
  private constructor(repository?: ISomeRepository) {
    this.repository = repository ?? new FileSomeRepository();
  }
  
  public static createWithRepository(repo: ISomeRepository): SomeManager {
    return new SomeManager(repo);
  }
}
```

## Related Context

- [`../user/userManager.ts`](../user/userManager.ts) - Uses IUserRepository
- [`../room/roomManager.ts`](../room/roomManager.ts) - Uses IRoomRepository
- [`../utils/itemManager.ts`](../utils/itemManager.ts) - Uses IItemRepository
- [`../data/`](../data/) - Database layer (alternative to file repositories)
