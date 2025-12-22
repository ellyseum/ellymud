# Room Management

Room data management, navigation, and room-scoped interactions.

## Contents

| Path | Description |
|------|-------------|
| `roomManager.ts` | Singleton managing all room data and operations |
| `room.ts` | Room class definition |
| `interfaces.ts` | Room-related interfaces |
| `services/` | Modular room services |

## Overview

Rooms are the spatial containers of the MUD world. Players exist in rooms, move between rooms via exits, and interact with items and NPCs within rooms. The `RoomManager` singleton handles all room operations.

## Related

- [`../command/commands/look.command.ts`](../command/commands/look.command.ts) - View room
- [`../command/commands/move.command.ts`](../command/commands/move.command.ts) - Navigate
- [`../../data/rooms.json`](../../data/rooms.json) - Room definitions
