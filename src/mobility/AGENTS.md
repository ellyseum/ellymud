# Mobility Module - LLM Context

## Overview

The Mobility module handles automatic NPC movement between rooms. NPCs with `canMove: true` will periodically move through exits to adjacent rooms, making the game world feel more alive.

## Files

| File | Purpose |
|------|---------|
| `mobilityManager.ts` | Singleton manager for NPC movement |
| `mobilityManager.test.ts` | Unit tests |

## How It Works

1. **Initialization**: MobilityManager scans all rooms for NPCs with `canMove: true`
2. **Registration**: Tracks each mobile NPC's position and movement timer
3. **Game Tick**: On each tick, checks if NPCs should move
4. **Movement**: Picks random valid exit and moves NPC

## NPC Template Mobility Config

```typescript
interface NPCData {
  // ... other fields
  canMove?: boolean;       // Whether NPC wanders (default: false)
  movementTicks?: number;  // Ticks between moves (default: 30, ~3 minutes)
  staysInArea?: boolean;   // Stay in spawn area (default: true)
}
```

## Example NPC Config

```json
{
  "id": "wolf",
  "name": "wolf",
  "canMove": true,
  "movementTicks": 15,
  "staysInArea": true
}
```

## Key Methods

```typescript
// Get singleton instance
const mobilityManager = MobilityManager.getInstance(roomManager);

// Initialize (called by GameTimerManager)
mobilityManager.initialize();

// Process on each game tick (called by GameTimerManager)
mobilityManager.processTick(currentTick);

// Register new NPC (called via SpawnManager callback)
mobilityManager.registerNPC(npc, room);

// Unregister NPC (when killed)
mobilityManager.unregisterNPC(instanceId);

// Get status for debugging
const status = mobilityManager.getStatus();
```

## Integration Points

- **GameTimerManager**: Calls `processTick()` every game tick
- **SpawnManager**: Registers newly spawned NPCs via callback
- **RoomManager**: Provides room access and exit information
- **ClientManager**: Used to broadcast movement messages to players

## Movement Logic

1. Check if `movementTicks` have elapsed since last move
2. Skip if NPC is in combat (has aggressors)
3. Skip if NPC is a merchant
4. Get valid exits (respecting `staysInArea`)
5. Pick random exit and move NPC
6. Broadcast departure/arrival messages

## Messages

Players see movement messages:
- Departure: "A wolf leaves north."
- Arrival: "A wolf arrives from the south."

## Gotchas

- NPCs in combat won't move (check `getAllAggressors()`)
- Merchants never move (check `isMerchant()`)
- `staysInArea` only works if rooms have matching `areaId`
- Movement registration happens via SpawnManager callback for spawned NPCs
- Existing NPCs are registered during `initialize()` room scan
