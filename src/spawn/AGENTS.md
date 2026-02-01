# Spawn Module - LLM Context

## Overview

The Spawn module handles automatic NPC spawning based on area configurations. NPCs respawn automatically after being killed, maintaining world population according to area rules.

## Files

| File | Purpose |
|------|---------|
| `spawnManager.ts` | Singleton manager for automatic NPC spawning |
| `spawnManager.test.ts` | Unit tests |

## How It Works

1. **Initialization**: SpawnManager reads `spawnConfig` from each area
2. **Tracking**: Creates a tracker for each NPC type in each area
3. **Game Tick**: On each tick, checks if spawning is needed
4. **Spawning**: Creates NPCs in random rooms within the area

## Area SpawnConfig Format

```typescript
interface AreaSpawnConfig {
  npcTemplateId: string;      // NPC template from data/npcs.json
  maxInstances: number;       // Max concurrent NPCs of this type
  respawnTicks: number;       // Ticks between spawns (6 ticks = 36 seconds)
  spawnRooms?: string[];      // Specific rooms, or all rooms if empty
}
```

## Example Area Config

```json
{
  "id": "forest-edge",
  "spawnConfig": [
    {
      "npcTemplateId": "wolf",
      "maxInstances": 3,
      "respawnTicks": 60
    },
    {
      "npcTemplateId": "goblin",
      "maxInstances": 2,
      "respawnTicks": 120
    }
  ]
}
```

## Key Methods

```typescript
// Get singleton instance
const spawnManager = SpawnManager.getInstance(areaManager, roomManager);

// Initialize from area configs (called by GameTimerManager)
await spawnManager.initialize();

// Process on each game tick (called by GameTimerManager)
spawnManager.processTick(currentTick);

// Notify when NPC dies (for faster respawn tracking)
spawnManager.notifyNPCDeath(areaId, npcTemplateId, instanceId);

// Get spawn status for debugging
const status = spawnManager.getStatus();
```

## Integration Points

- **GameTimerManager**: Calls `processTick()` every game tick
- **AreaManager**: Provides area spawn configurations
- **RoomManager**: Provides rooms for NPC placement
- **NPC**: Uses `NPC.loadNPCData()` to get NPC templates

## Spawn Logic

1. Check if NPC count is below `maxInstances`
2. Check if `respawnTicks` have passed since last spawn
3. Pick a random room in the area (or from `spawnRooms` if specified)
4. Create NPC (handles both regular NPCs and Merchants)
5. Add to room and update tracker

## Gotchas

- Rooms must have an `areaId` matching the area for spawns to work
- Empty `spawnConfig` means no auto-spawning for that area
- Spawn trackers are reset on `reload()` - call after area updates
- Merchants are auto-initialized with inventory when spawned
