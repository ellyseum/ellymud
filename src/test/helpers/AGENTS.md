# Test Helpers - LLM Context

## Overview

Mock factory functions for creating test fixtures. These provide consistent, type-safe mock objects with sensible defaults.

## File Reference

### `mockFactories.ts`

**Purpose**: Factory functions for all mock object types.

**Key Exports**:
```typescript
// Users
export function createMockUser(overrides?: Partial<User>): User;

// Clients
export function createMockClient(options?: MockClientOptions): ConnectedClient;
export function createMockClientWithUser(overrides?: Partial<User>): ConnectedClient;

// Connections
export function createMockConnection(): IConnection;

// Rooms
export function createMockRoom(overrides?: Partial<RoomData>): Room;

// Items
export function createMockItem(overrides?: Partial<GameItem>): GameItem;
export function createMockItemInstance(overrides?: Partial<ItemInstance>): ItemInstance;
```

**Usage Examples**:
```typescript
// Basic user with defaults
const user = createMockUser();
// { username: 'testuser', health: 100, maxHealth: 100, level: 1, ... }

// User with specific overrides
const admin = createMockUser({ username: 'admin', level: 99 });

// Client with attached user
const client = createMockClientWithUser({ username: 'player1' });
expect(client.user?.username).toBe('player1');

// Client with mock connection
const client = createMockClient();
client.connection.write('test'); // Mock function, doesn't throw
```

## Conventions

### Adding New Mock Factories

1. Export a `createMock*` function
2. Accept `Partial<Type>` for overrides
3. Provide sensible defaults for all required fields
4. Return fully typed object

```typescript
export function createMockNPC(overrides?: Partial<NPC>): NPC {
  return {
    id: 'mock-npc-1',
    name: 'Test NPC',
    health: 100,
    maxHealth: 100,
    hostile: false,
    ...overrides,
  };
}
```

### Default Values

- Use predictable, test-friendly values
- Avoid random data unless specifically needed
- Make defaults obvious (e.g., `username: 'testuser'`)

## Gotchas & Warnings

- ⚠️ Mock connections don't actually write data - they're jest.fn() mocks
- ⚠️ Mock users don't have valid password hashes by default
- ⚠️ Always reset singleton managers in `afterEach` when using mocks

## Related Context

- [`../../types.ts`](../../types.ts) - Type definitions
- [`../../user/userManager.test.ts`](../../user/userManager.test.ts) - Example usage
- [`../persistence/inMemoryRepository.ts`](../persistence/inMemoryRepository.ts) - In-memory repos for testing
