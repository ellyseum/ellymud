# Unit Test Abstraction Recommendations Report

## Executive Summary

After analyzing the EllyMUD codebase during unit test creation, I've identified several classes that are "too complicated" to test effectively. The primary issues are:

1. **Singleton patterns with hard-coded dependencies**
2. **Direct file system access in constructors**
3. **Tight coupling between managers**
4. **Static method dependencies that can't be mocked**
5. **Missing dependency injection**

This report outlines specific abstractions that would significantly improve testability.

---

## Classes Requiring Abstraction

### 1. ItemManager (`src/utils/itemManager.ts`)

**Current Issues:**
- Constructor directly reads from filesystem (`loadItems()`, `loadItemInstances()`)
- Singleton pattern makes it hard to reset state between tests
- No way to inject mock data without touching the filesystem

**Current Code Pattern:**
```typescript
private constructor() {
  this.loadItems();        // Reads from disk
  this.loadItemInstances(); // Reads from disk
}
```

**Recommended Abstractions:**

1. **Extract File I/O Interface:**
```typescript
interface IItemRepository {
  loadItems(): GameItem[];
  loadItemInstances(): ItemInstance[];
  saveItems(items: GameItem[]): void;
  saveItemInstances(instances: ItemInstance[]): void;
}

class FileItemRepository implements IItemRepository { /* ... */ }
class InMemoryItemRepository implements IItemRepository { /* for tests */ }
```

2. **Constructor Injection:**
```typescript
class ItemManager {
  constructor(private repository: IItemRepository) {
    const items = repository.loadItems();
    // ...
  }
  
  // Factory for production
  static createDefault(): ItemManager {
    return new ItemManager(new FileItemRepository());
  }
}
```

**Impact:** Would reduce mock complexity from 10+ methods to 4 simple ones.

---

### 2. UserManager (`src/user/userManager.ts`)

**Current Issues:**
- Constructor loads users from filesystem
- Password hashing is internal (can't test auth without testing crypto)
- Multiple responsibilities: user storage, session management, authentication, snake scores

**Recommended Abstractions:**

1. **Extract Password Service:**
```typescript
interface IPasswordService {
  hash(password: string): { hash: string; salt: string };
  verify(password: string, salt: string, hash: string): boolean;
}
```

2. **Extract User Repository:**
```typescript
interface IUserRepository {
  loadUsers(): User[];
  saveUsers(users: User[]): void;
}
```

3. **Split into Focused Managers:**
```typescript
// UserStorageManager - handles persistence
// UserSessionManager - handles active sessions  
// UserAuthService - handles authentication
// SnakeScoreManager - handles game scores (separate concern)
```

**Impact:** Each focused class becomes trivially testable.

---

### 3. CommandRegistry (`src/command/commandRegistry.ts`)

**Current Issues:**
- Constructor instantiates 40+ command classes directly
- Each command has different constructor signatures
- Hard to test command registration without all dependencies

**Current Pattern:**
```typescript
private constructor(clients, userManager, roomManager, combatSystem) {
  // 40+ lines of new Command(...) calls
  this.commands.set('say', new SayCommand(clients));
  this.commands.set('heal', new HealCommand(userManager, clients));
  // etc...
}
```

**Recommended Abstractions:**

1. **Command Factory Pattern:**
```typescript
interface ICommandFactory {
  createCommand(name: string): Command | null;
}

class DefaultCommandFactory implements ICommandFactory {
  constructor(
    private clients: Map<string, ConnectedClient>,
    private userManager: UserManager,
    // ...
  ) {}
  
  createCommand(name: string): Command | null {
    switch(name) {
      case 'say': return new SayCommand(this.clients);
      // ...
    }
  }
}
```

2. **Command Registry becomes simple:**
```typescript
class CommandRegistry {
  constructor(private commandFactory: ICommandFactory) {}
  
  registerCommand(name: string): void {
    const cmd = this.commandFactory.createCommand(name);
    if (cmd) this.commands.set(name, cmd);
  }
}
```

**Impact:** Can test registry logic without instantiating real commands.

---

### 4. CombatSystem (`src/combat/combatSystem.ts`)

**Current Issues:**
- Already better (uses component pattern) but still has direct dependencies
- `getInstance()` creates components internally
- Hard to inject mock EntityTracker, CombatProcessor, etc.

**Good Current Pattern:**
```typescript
// Already has component separation:
private entityTracker: EntityTracker;
private combatProcessor: CombatProcessor;
private combatNotifier: CombatNotifier;
```

**Recommended Improvement:**

```typescript
interface ICombatSystemDependencies {
  entityTracker: EntityTracker;
  combatProcessor: CombatProcessor;
  combatNotifier: CombatNotifier;
  playerDeathHandler: PlayerDeathHandler;
  eventBus: CombatEventBus;
}

class CombatSystem {
  constructor(
    private userManager: UserManager,
    private roomManager: RoomManager,
    private deps: ICombatSystemDependencies
  ) {}
  
  static createDefault(userManager: UserManager, roomManager: RoomManager): CombatSystem {
    return new CombatSystem(userManager, roomManager, {
      entityTracker: new EntityTracker(roomManager),
      combatProcessor: new CombatProcessor(...),
      // ...
    });
  }
}
```

**Impact:** Tests can inject mock components directly.

---

### 5. RoomManager (`src/room/roomManager.ts`)

**Current Issues:**
- Good service separation but services created in constructor
- File I/O in constructor
- Services have circular dependencies via `this` binding

**Current Pattern:**
```typescript
private initializeServices(): void {
  this.roomUINotificationService = new RoomUINotificationService(
    {
      getRoom: this.getRoom.bind(this),  // Circular!
      getStartingRoomId: this.getStartingRoomId.bind(this),
    },
    // ...
  );
}
```

**Recommended Abstractions:**

1. **Extract Room Repository:**
```typescript
interface IRoomRepository {
  loadRooms(): Map<string, Room>;
  saveRooms(rooms: Map<string, Room>): void;
}
```

2. **Service Factory:**
```typescript
interface IRoomServiceFactory {
  createDirectionHelper(): DirectionHelper;
  createPlayerMovementService(roomManager: IRoomManager): PlayerMovementService;
  // ...
}
```

---

### 6. Debug/Effect/Pickup Commands

**Common Issue:** These commands directly instantiate managers in constructor.

**Current Pattern:**
```typescript
class DebugCommand {
  constructor(
    private roomManager: RoomManager,  // Direct dependency
    private userManager: UserManager,
    private combatSystem: CombatSystem
  ) {
    this.itemManager = ItemManager.getInstance(); // Static call!
  }
}
```

**Problem:** Can't easily mock `ItemManager.getInstance()`.

**Recommended Pattern:**
```typescript
class DebugCommand {
  constructor(
    private roomManager: RoomManager,
    private userManager: UserManager,
    private combatSystem: CombatSystem,
    private itemManager: ItemManager = ItemManager.getInstance()
  ) {}
}
```

This allows default production behavior but enables test injection.

---

## Cross-Cutting Recommendations

### 1. Replace Singleton `.getInstance()` with Factory Functions

**Before:**
```typescript
class Manager {
  private static instance: Manager;
  static getInstance(): Manager {
    if (!Manager.instance) Manager.instance = new Manager();
    return Manager.instance;
  }
}
```

**After:**
```typescript
class Manager {
  constructor(private deps: ManagerDeps) {}
}

// Factory module
let defaultManager: Manager | null = null;

export function getManager(): Manager {
  if (!defaultManager) defaultManager = new Manager(defaultDeps);
  return defaultManager;
}

export function createManager(deps: ManagerDeps): Manager {
  return new Manager(deps);
}

// For tests
export function resetManager(): void {
  defaultManager = null;
}
```

### 2. Create Test Doubles Module

```typescript
// src/test/doubles/index.ts
export const createMockUserManager = (): jest.Mocked<UserManager> => ({
  getUser: jest.fn(),
  userExists: jest.fn(),
  // ...all methods
});

export const createMockRoomManager = (): jest.Mocked<RoomManager> => ({
  getRoom: jest.fn(),
  // ...
});
```

### 3. Extract File I/O to Dedicated Layer

Create a `src/persistence/` directory:
```
src/persistence/
├── interfaces.ts       # Repository interfaces
├── fileRepository.ts   # File-based implementations
├── inMemoryRepository.ts  # Test implementations
└── index.ts
```

---

## Priority Matrix

| Class | Effort | Impact | Priority |
|-------|--------|--------|----------|
| ItemManager | Medium | High | 1 |
| UserManager | High | High | 2 |
| CommandRegistry | Medium | Medium | 3 |
| RoomManager | Medium | Medium | 4 |
| CombatSystem | Low | Medium | 5 |
| Individual Commands | Low | Low | 6 |

---

## Quick Wins (Can Do Now)

1. **Add optional dependency injection to command constructors** - allows test injection without breaking production code

2. **Add `resetInstance()` methods to all singletons** - already present in some, needed universally

3. **Create `src/test/helpers/managerMocks.ts`** - centralize mock creation

4. **Add `setTestMode(true)` calls** - UserManager already has this, extend to others

---

## Conclusion

The primary testability issues stem from:
1. Direct filesystem access in constructors
2. Singleton patterns without injection points
3. Large classes with multiple responsibilities

The recommended abstractions follow SOLID principles:
- **S**ingle Responsibility: Split managers into focused services
- **O**pen/Closed: Use interfaces for extension
- **L**iskov Substitution: Test doubles can substitute real implementations
- **I**nterface Segregation: Small, focused interfaces
- **D**ependency Inversion: Depend on abstractions, not concretions

Implementing these changes would reduce test setup from 50+ lines of mocks to ~10 lines per test file.
