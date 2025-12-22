# Room Services - LLM Context

## Overview

Room functionality is decomposed into modular services following Single Responsibility Principle. Each service handles one aspect of room operations.

## File Reference

### `directionHelper.ts`

**Purpose**: Normalize direction strings and handle aliases

```typescript
export class DirectionHelper {
  normalizeDirection(input: string): string
  getOppositeDirection(direction: string): string
  isValidDirection(direction: string): boolean
}
```

**Direction Mapping**:
```typescript
'n' → 'north'
's' → 'south'
'e' → 'east'
'w' → 'west'
'u' → 'up'
'd' → 'down'
'ne' → 'northeast'
'nw' → 'northwest'
'se' → 'southeast'
'sw' → 'southwest'
```

### `entityRegistryService.ts`

**Purpose**: Track players, NPCs, and items in each room

```typescript
export class EntityRegistryService {
  addPlayerToRoom(roomId: string, username: string): void
  removePlayerFromRoom(roomId: string, username: string): void
  getPlayersInRoom(roomId: string): string[]
  
  addNPCToRoom(roomId: string, npc: NPC): void
  removeNPCFromRoom(roomId: string, npcId: string): void
  getNPCsInRoom(roomId: string): NPC[]
}
```

### `npcInteractionService.ts`

**Purpose**: Find and target NPCs in rooms

```typescript
export class NPCInteractionService {
  findNPCByName(roomId: string, name: string): NPC | undefined
  findNPCById(roomId: string, id: string): NPC | undefined
  getNPCsForDisplay(roomId: string): string[]
}
```

### `playerMovementService.ts`

**Purpose**: Handle player navigation between rooms

```typescript
export class PlayerMovementService {
  movePlayer(client: ConnectedClient, direction: string): boolean
  canMove(client: ConnectedClient, direction: string): boolean
  getExitDescription(roomId: string, direction: string): string
}
```

**Movement Flow**:
1. Validate direction
2. Check exit exists
3. Check movement restrictions (rooted, in combat)
4. Remove from old room
5. Add to new room
6. Notify both rooms
7. Show new room

### `roomUINotificationService.ts`

**Purpose**: Send messages to players in rooms

```typescript
export class RoomUINotificationService {
  notifyRoom(roomId: string, message: string, exclude?: string[]): void
  notifyPlayerArrival(client: ConnectedClient, fromDirection: string): void
  notifyPlayerDeparture(client: ConnectedClient, toDirection: string): void
}
```

### `teleportationService.ts`

**Purpose**: Teleport players between rooms

```typescript
export class TeleportationService {
  teleportPlayer(client: ConnectedClient, targetRoomId: string): boolean
  teleportToStartingRoom(client: ConnectedClient): void
}
```

## Conventions

### Using Services

Services are accessed through RoomManager:

```typescript
// Don't instantiate services directly
// Use through roomManager
roomManager.movePlayer(client, 'north');
roomManager.notifyRoom(roomId, 'Message');
```

### Adding a New Service

1. Create service class in this directory
2. Add property to RoomManager
3. Initialize in `initializeServices()`
4. Expose methods through RoomManager

## Gotchas & Warnings

- ⚠️ **Service Dependencies**: Services should not import each other directly
- ⚠️ **Room State**: Always check room exists before operations
- ⚠️ **Client Lookup**: Services use `findClientByUsername()` for notifications

## Related Context

- [`../roomManager.ts`](../roomManager.ts) - Parent that orchestrates services
- [`../../utils/socketWriter.ts`](../../utils/socketWriter.ts) - Notification output
