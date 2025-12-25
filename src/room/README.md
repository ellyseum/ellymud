# Room Management

Room data management, navigation, and room-scoped interactions for the MUD world.

## Contents

| Path             | Description                                       |
| ---------------- | ------------------------------------------------- |
| `roomManager.ts` | Singleton managing all room data and operations   |
| `room.ts`        | Room class definition with properties and methods |
| `interfaces.ts`  | Room-related TypeScript interfaces                |
| `services/`      | Modular room services for specific functionality  |

## What Rooms Do

Rooms are the spatial containers of the MUD world:

- **Player Location**: Every player is in exactly one room
- **Navigation**: Rooms connect via exits (north, south, east, west, up, down)
- **Content**: Rooms contain items, NPCs, and other players
- **Events**: Room-scoped messages, combat, and interactions

## RoomManager Operations

- `getRoom(roomId)` - Retrieve room by ID
- `getPlayersInRoom(roomId)` - List players in a room
- `getNPCsInRoom(roomId)` - List NPCs in a room
- `movePlayer(player, direction)` - Handle player movement
- `broadcastToRoom(roomId, message)` - Send message to all in room

## Room Structure

Each room has:

- `id` - Unique identifier
- `name` - Display name
- `description` - Full room description
- `exits` - Map of direction → destination room ID
- `items` - Items on the ground
- `npcs` - NPCs currently in the room
- `flags` - Special room properties (`safe`, `training`, `bank`, `shop`)

## Services

Room functionality is decomposed into services:

- **DirectionHelper**: Normalize direction strings
- **PlayerMovementService**: Handle navigation logic
- **EntityRegistryService**: Track entities per room
- **RoomUINotificationService**: Room-scoped messaging

## Related

- [src/command/commands/look.command.ts](../command/commands/look.command.ts) - View room
- [src/command/commands/move.command.ts](../command/commands/move.command.ts) - Navigate between rooms
- [data/rooms.json](../../data/rooms.json) - Room definitions
