# Room Management - LLM Context

## Overview

The room system manages the game world's spatial structure. Each room has an ID, description, exits to other rooms, and can contain items, NPCs, and players. The `RoomManager` singleton provides all room operations.

## Architecture

```
RoomManager (Singleton)
├── rooms: Map<string, Room>
├── templateRepository          - Load static templates (rooms.json)
├── stateRepository             - Save/load mutable state (room_state.json)
├── DirectionHelper             - Direction name normalization
├── EntityRegistryService       - Track entities in rooms
├── NPCInteractionService       - NPC targeting in rooms
├── PlayerMovementService       - Player navigation
├── RoomUINotificationService   - Room messages
└── TeleportationService        - Teleport players

Data Separation:
┌─────────────────────────────────────────────────────────────┐
│ RoomTemplate (roomTemplate.ts)      │ RoomState (roomState.ts) │
├─────────────────────────────────────┼──────────────────────────┤
│ id, name, description               │ itemInstances            │
│ exits, flags                        │ npcTemplateIds           │
│ areaId, gridX, gridY                │ currency                 │
│ (read-only from rooms.json)         │ (saved to room_state.json)│
└─────────────────────────────────────┴──────────────────────────┘
```

## File Reference

### `roomManager.ts`

**Purpose**: Singleton managing all room data and operations

**Key Exports**:

```typescript
export class RoomManager implements IRoomManager {
  static getInstance(clients: Map<string, ConnectedClient>): RoomManager;

  // Room access
  getRoom(roomId: string): Room | undefined;
  getAllRooms(): Map<string, Room>;
  getStartingRoomId(): string;

  // CRUD operations (for World Builder)
  createRoom(roomData: RoomData): Promise<Room>;
  updateRoomData(roomData: RoomData): Promise<void>;
  deleteRoom(roomId: string): Promise<void>;
  linkRooms(fromId: string, toId: string, direction: string): Promise<void>;
  unlinkRooms(roomId: string, direction: string): Promise<void>;

  // Player operations
  lookRoom(client: ConnectedClient): void;
  briefLookRoom(client: ConnectedClient): void;
  movePlayer(client: ConnectedClient, direction: string): boolean;
  teleportToStartingRoom(client: ConnectedClient): void;

  // Entity management
  addNPCToRoom(roomId: string, npc: NPC): void;
  removeNPCFromRoom(roomId: string, npcId: string): void;
  getNPCsInRoom(roomId: string): NPC[];

  // Item management
  addItemToRoom(roomId: string, item: Item): void;
  removeItemFromRoom(roomId: string, itemId: string): void;

  // State persistence (NEW)
  forceSaveState(): void;           // Trigger state save to room_state.json
  forceSaveTemplates(): void;       // Save templates to rooms.json (admin)
}
```

**Singleton Pattern with State Repository**:

```typescript
// ✅ Correct - uses default repositories
const roomManager = RoomManager.getInstance(clients);

// ✅ Correct - inject custom repositories (testing)
const roomManager = RoomManager.getInstance(
  clients,
  mockTemplateRepo,
  mockStateRepo
);

// ❌ Incorrect - constructor is private
const roomManager = new RoomManager(clients);
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
  description: string;
  exits: Exit[];
  items: Item[];
  npcs: Map<string, NPC>;
  players: string[]; // usernames
  flags: string[]; // e.g. ['safe', 'training']
  currency: Currency;
areaId?: string;  // Area this room belongs to
  gridX?: number;   // X coordinate for visual editor
  gridY?: number;   // Y coordinate for visual editor
  gridZ?: number;   // Floor/level (Z coordinate)
  hasChanged: boolean; // Track if state needs saving

  getExit(direction: string): Exit | undefined;
  addPlayer(username: string): void;
  removePlayer(username: string): void;
toData(): RoomData;  // Convert to plain data object
  addItemInstance(instanceId: string, templateId: string): void;
  removeItemInstance(instanceId: string): boolean;
}
```

### `roomTemplate.ts`

**Purpose**: Static room template interface (immutable data)

```typescript
// Core room template - loaded once, never saved
export interface RoomTemplate {
  id: string;
  name: string;
  description: string;
  exits: Exit[];
  flags: string[];
  areaId?: string;
  gridX?: number;
  gridY?: number;
}

// Extended with default spawns
export interface RoomTemplateWithDefaults extends RoomTemplate {
  defaultNpcs?: string[];
}
```

**Key Point**: Templates are loaded from `rooms.json` at startup and never modified during gameplay.

### `roomState.ts`

**Purpose**: Mutable room state interface (runtime data)

```typescript
// Minimal item reference for storage
export interface SerializedItemInstance {
  instanceId: string;
  templateId: string;
}

// Room state - saved periodically via autosave
export interface RoomState {
  roomId: string;
  itemInstances: SerializedItemInstance[];
  npcTemplateIds: string[];
  currency: Currency;
  items?: string[]; // Legacy field
}
```

**Key Point**: State is saved to `room_state.json` via autosave and loaded on startup.

### `roomData.ts`

**Purpose**: Centralized exports and shared interfaces

```typescript
// Re-exports for convenient imports
export { RoomTemplate, RoomTemplateWithDefaults } from './roomTemplate';
export { RoomState, RoomStateData, SerializedItemInstance } from './roomState';

// Plain data for serialization
export interface RoomData {
  id: string;
  // ... combined template + state fields
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

| File                           | Purpose                                   |
| ------------------------------ | ----------------------------------------- |
| `directionHelper.ts`           | Normalize direction input (n→north, etc.) |
| `entityRegistryService.ts`     | Track entities in rooms                   |
| `npcInteractionService.ts`     | Find/target NPCs in rooms                 |
| `playerMovementService.ts`     | Handle player movement                    |
| `roomUINotificationService.ts` | Send room messages                        |
| `teleportationService.ts`      | Teleport operations                       |

## Room Flags

Rooms can have special behaviors defined by flags in the `flags` array:

| Flag | Description |
|------|-------------|
| `safe` | No combat allowed. Players cannot attack or be attacked. |
| `training` | Allows use of the `train` command to improve stats. |
| `bank` | Allows use of `deposit`, `withdraw`, and `balance` commands. |
| `shop` | Indicates a trading area (often combined with merchant NPCs). |

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
  "currency": { "gold": 0, "silver": 0, "copper": 0 },
  "areaId": "town-center",
  "gridX": 5,
  "gridY": 5,
  "gridZ": 0
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

### Migrating Existing Room Data

If you have existing rooms with state embedded in `rooms.json`:

```bash
# Dry run - see what would change
npx ts-node scripts/migrate-room-state.ts --dry-run

# Create room_state.json from existing data
npx ts-node scripts/migrate-room-state.ts

# Optionally clean templates (remove state fields from rooms.json)
npx ts-node scripts/migrate-room-state.ts --clean-templates
```

## Gotchas & Warnings

- ⚠️ **Singleton**: Always use `getInstance()`, never `new RoomManager()`
- ⚠️ **Room Not Found**: `getRoom()` can return `undefined`—always check
- ⚠️ **Player Tracking**: Rooms track players by username, not client ID
- ⚠️ **Starting Room**: Default is `'start'`—must exist in rooms.json
- ⚠️ **Exit Validation**: Always validate exit exists before moving
- ⚠️ **Template vs State**: Templates are read-only; don't try to persist template changes via state repository
- ⚠️ **hasChanged Flag**: Room.hasChanged tracks state modifications; used by autosave to determine what needs saving

## Related Context

- [`../command/commands/look.command.ts`](../command/commands/look.command.ts) - Uses lookRoom
- [`../command/commands/move.command.ts`](../command/commands/move.command.ts) - Uses movePlayer
- [`../combat/combatSystem.ts`](../combat/combatSystem.ts) - Combat is room-scoped
- [`../../data/rooms.json`](../../data/rooms.json) - Room template definitions
- [`../../data/room_state.json`](../../data/room_state.json) - Runtime room state
- [`../area/`](../area/) - Area entities that group rooms
- [`../admin/adminApi.ts`](../admin/adminApi.ts) - Room CRUD API endpoints
- [`../persistence/AsyncFileRoomStateRepository.ts`](../persistence/AsyncFileRoomStateRepository.ts) - State persistence
