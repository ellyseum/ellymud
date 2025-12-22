# Room Management - LLM Context

## Overview

The room system manages the game world's spatial structure. Each room has an ID, description, exits to other rooms, and can contain items, NPCs, and players. The `RoomManager` singleton provides all room operations.

## Architecture

```
RoomManager (Singleton)
├── rooms: Map<string, Room>
├── DirectionHelper         - Direction name normalization
├── EntityRegistryService   - Track entities in rooms
├── NPCInteractionService   - NPC targeting in rooms
├── PlayerMovementService   - Player navigation
├── RoomUINotificationService - Room messages
└── TeleportationService    - Teleport players
```

## File Reference

### `roomManager.ts`

**Purpose**: Singleton managing all room data and operations

**Key Exports**:
```typescript
export class RoomManager implements IRoomManager {
  static getInstance(clients: Map<string, ConnectedClient>): RoomManager
  
  // Room access
  getRoom(roomId: string): Room | undefined
  getAllRooms(): Map<string, Room>
  getStartingRoomId(): string
  
  // Player operations
  lookRoom(client: ConnectedClient): void
  briefLookRoom(client: ConnectedClient): void
  movePlayer(client: ConnectedClient, direction: string): boolean
  teleportToStartingRoom(client: ConnectedClient): void
  
  // Entity management
  addNPCToRoom(roomId: string, npc: NPC): void
  removeNPCFromRoom(roomId: string, npcId: string): void
  getNPCsInRoom(roomId: string): NPC[]
  
  // Item management
  addItemToRoom(roomId: string, item: Item): void
  removeItemFromRoom(roomId: string, itemId: string): void
}
```

**Singleton Pattern**:
```typescript
// ✅ Correct
const roomManager = RoomManager.getInstance(clients);

// ❌ Incorrect - constructor is private
const roomManager = new RoomManager(clients);
```

### `room.ts`

**Purpose**: Room class definition

```typescript
export class Room {
  id: string;
  name: string;
  shortDescription: string;
  longDescription: string;
  exits: Exit[];
  items: Item[];
  npcs: NPC[];
  players: string[];  // usernames
  currency: Currency;
  
  getExit(direction: string): Exit | undefined
  addPlayer(username: string): void
  removePlayer(username: string): void
}
```

### `interfaces.ts`

**Purpose**: TypeScript interfaces for room system

```typescript
export interface IRoomManager {
  getRoom(roomId: string): Room | undefined;
  // ...
}

export interface Exit {
  direction: string;
  targetRoomId: string;
  description?: string;
}
```

### `services/` Directory

Modular services for room operations:

| File | Purpose |
|------|---------|
| `directionHelper.ts` | Normalize direction input (n→north, etc.) |
| `entityRegistryService.ts` | Track entities in rooms |
| `npcInteractionService.ts` | Find/target NPCs in rooms |
| `playerMovementService.ts` | Handle player movement |
| `roomUINotificationService.ts` | Send room messages |
| `teleportationService.ts` | Teleport operations |

## Room Data

Rooms are stored in `data/rooms.json`:

```json
{
  "id": "town-square",
  "name": "Town Square",
  "shortDescription": "A bustling town square",
  "longDescription": "You stand in the center of a busy town square...",
  "exits": [
    { "direction": "north", "targetRoomId": "market" },
    { "direction": "east", "targetRoomId": "tavern" }
  ],
  "items": [],
  "npcs": ["merchant-1"],
  "currency": { "gold": 0, "silver": 0, "copper": 0 }
}
```

## Direction System

```
      N (north)
      |
W ----+---- E
      |
      S (south)

Also: NE, NW, SE, SW, UP, DOWN
```

Direction aliases:
- `n` → `north`
- `s` → `south`
- `e` → `east`
- `w` → `west`
- `u` → `up`
- `d` → `down`
- `ne` → `northeast`
- etc.

## Conventions

### Looking at a Room

```typescript
// Full look (shows long description)
roomManager.lookRoom(client);

// Brief look (shows short description)
roomManager.briefLookRoom(client);
```

### Moving a Player

```typescript
// Returns true if move successful
const moved = roomManager.movePlayer(client, 'north');
if (!moved) {
  writeMessageToClient(client, "You can't go that way.\r\n");
}
```

### Teleporting

```typescript
// Teleport to specific room
roomManager.teleportPlayer(client, 'town-square');

// Teleport to starting room
roomManager.teleportToStartingRoom(client);
```

### Room Notifications

```typescript
// Notify all players in room
roomManager.notifyRoom(roomId, 'Something happens!', [excludeUsername]);

// Notify on player arrival
roomManager.notifyPlayerArrival(client, fromDirection);

// Notify on player departure  
roomManager.notifyPlayerDeparture(client, direction);
```

## Common Tasks

### Adding a New Room

1. Edit `data/rooms.json`
2. Add room object with unique ID
3. Connect via exits from existing rooms

### Getting NPCs in a Room

```typescript
const npcs = roomManager.getNPCsInRoom(client.user.currentRoomId);
for (const npc of npcs) {
  // Do something with NPC
}
```

### Adding Item to Room

```typescript
roomManager.addItemToRoom(roomId, item);
```

## Gotchas & Warnings

- ⚠️ **Singleton**: Always use `getInstance()`, never `new RoomManager()`
- ⚠️ **Room Not Found**: `getRoom()` can return `undefined`—always check
- ⚠️ **Player Tracking**: Rooms track players by username, not client ID
- ⚠️ **Starting Room**: Default is `'start'`—must exist in rooms.json
- ⚠️ **Exit Validation**: Always validate exit exists before moving

## Related Context

- [`../command/commands/look.command.ts`](../command/commands/look.command.ts) - Uses lookRoom
- [`../command/commands/move.command.ts`](../command/commands/move.command.ts) - Uses movePlayer
- [`../combat/combatSystem.ts`](../combat/combatSystem.ts) - Combat is room-scoped
- [`../../data/rooms.json`](../../data/rooms.json) - Room definitions
