# Room Services

Modular services for room operations. Each service handles one specific aspect of room functionality.

## Contents

| File | Purpose |
|------|---------|  
| `directionHelper.ts` | Normalize and validate direction strings |
| `entityRegistryService.ts` | Track entities (players, NPCs) per room |
| `npcInteractionService.ts` | NPC targeting, interaction, and spawning |
| `playerMovementService.ts` | Player navigation between rooms |
| `roomUINotificationService.ts` | Room-scoped message broadcasting |
| `teleportationService.ts` | Teleportation logic for admin commands |

## Service Responsibilities

**DirectionHelper**:
- Normalizes "n" to "north", "ne" to "northeast"
- Validates direction strings
- Returns opposite directions

**EntityRegistryService**:
- Tracks which entities are in each room
- Enables "who's here" queries
- Updates on entity movement

**NPCInteractionService**:
- Resolves NPC targets ("goblin" → NPC object)
- Handles NPC spawning in rooms
- Manages NPC aggro and reactions

**PlayerMovementService**:
- Validates exit availability
- Applies movement delays based on stats
- Handles movement messages ("X leaves north")
- Updates player location

**RoomUINotificationService**:
- Broadcasts messages to all in room
- Handles "X arrives" / "X leaves" messages
- Filters messages (exclude sender, etc.)

**TeleportationService**:
- Admin teleport command logic
- Validates destination rooms
- Handles cross-room movement without exits

## Design Pattern

Services use dependency injection:
- RoomManager creates and holds services
- Services receive dependencies in constructor
- Easy to test with mocks

## Related

- [roomManager.ts](../roomManager.ts) - Orchestrates these services
- [src/command/commands/move.command.ts](../../command/commands/move.command.ts) - Uses movement service
