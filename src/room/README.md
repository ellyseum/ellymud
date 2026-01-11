# Room Management

Room data management, navigation, and room-scoped interactions for the MUD world.

## Contents

| Path              | Description                                       |
| ----------------- | ------------------------------------------------- |
| `roomManager.ts`  | Singleton managing all room data and operations   |
| `room.ts`         | Room class definition with properties and methods |
| `roomTemplate.ts` | Static room template interface (immutable)        |
| `roomState.ts`    | Mutable room state interface (items, NPCs)        |
| `roomData.ts`     | Shared data interfaces and re-exports             |
| `interfaces.ts`   | Room-related TypeScript interfaces                |
| `services/`       | Modular room services for specific functionality  |

## What Rooms Do

Rooms are the spatial containers of the MUD world:

- **Player Location**: Every player is in exactly one room
- **Navigation**: Rooms connect via exits (north, south, east, west, up, down)
- **Content**: Rooms contain items, NPCs, and other players
- **Events**: Room-scoped messages, combat, and interactions

## Architecture: Templates vs State

Room data is split into two categories:

- **Templates** (immutable): Static room definitions loaded from `rooms.json`
  - Includes: id, name, description, exits, flags, areaId, grid coordinates
  - Also includes spawn defaults: `spawnItems`, `spawnNpcs`, `spawnCurrency`
- **State** (mutable): Runtime data saved to `room_state.json` via autosave
  - Includes: current items, NPCs, and currency in the room

This separation allows templates to remain stable while state changes persist across restarts. The spawn defaults define what gets restored when `resetRoom()` is called.

## RoomManager Operations

- `getRoom(roomId)` - Retrieve room by ID
- `getPlayersInRoom(roomId)` - List players in a room
- `getNPCsInRoom(roomId)` - List NPCs in a room
- `movePlayer(player, direction)` - Handle player movement
- `broadcastToRoom(roomId, message)` - Send message to all in room
- `createRoom(roomData)` - Create new room (World Builder API)
- `updateRoomData(roomData)` - Update room properties (World Builder API)
- `deleteRoom(roomId)` - Remove room (World Builder API)
- `linkRooms(fromId, toId, direction)` - Create exit between rooms
- `unlinkRooms(roomId, direction)` - Remove exit from room
- `resetRoom(roomId)` - Reset room to spawn defaults (respawn items, NPCs, currency)
- `forceSaveState()` - Save runtime state to room_state.json
- `forceSaveTemplates()` - Save templates to rooms.json (admin only)

## Room Structure

Each room has:

- `id` - Unique identifier
- `name` - Display name
- `description` - Full room description
- `exits` - Map of direction → destination room ID
- `items` - Items on the ground
- `npcs` - NPCs currently in the room
- `flags` - Special room properties (`safe`, `training`, `bank`, `shop`)
- `areaId` - Optional area this room belongs to
- `gridX`, `gridY`, `gridZ` - Grid coordinates for visual editor
- `spawnItems` - Item template IDs to spawn when room is reset
- `spawnNpcs` - NPC template IDs to spawn when room is reset
- `spawnCurrency` - Starting currency when room is reset

## Services

Room functionality is decomposed into services:

- **DirectionHelper**: Normalize direction strings
- **PlayerMovementService**: Handle navigation logic
- **EntityRegistryService**: Track entities per room
- **RoomUINotificationService**: Room-scoped messaging

## Related

- [src/command/commands/look.command.ts](../command/commands/look.command.ts) - View room
- [src/command/commands/move.command.ts](../command/commands/move.command.ts) - Navigate between rooms
- [src/area/](../area/) - Area management (groups of rooms)
- [data/rooms.json](../../data/rooms.json) - Room definitions
