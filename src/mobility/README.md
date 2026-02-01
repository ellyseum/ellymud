# Mobility Module

Automatic NPC movement system that makes NPCs wander between rooms.

## Purpose

Brings the game world to life by having NPCs move around naturally. Wolves prowl the forest, goblins patrol their territory, while merchants stay put at their shops.

## Features

- Per-NPC movement configuration
- Area-bounded movement (NPCs can stay in their spawn area)
- Combat-aware (NPCs don't wander during combat)
- Merchant protection (merchants never move)
- Arrival/departure messages for players

## Configuration

Movement settings are defined in NPC templates (`data/npcs.json`):

- `canMove` - Whether NPC wanders (default: false)
- `movementTicks` - Ticks between moves (default: 30)
- `staysInArea` - Stay in spawn area (default: true)

## Example

```json
{
  "id": "wolf",
  "name": "wolf",
  "canMove": true,
  "movementTicks": 15,
  "staysInArea": true
}
```

## Usage

MobilityManager is automatically initialized by GameTimerManager and processes on each game tick. NPCs spawned by SpawnManager are automatically registered for mobility tracking.

## Related

- See `src/spawn/` for NPC spawning
- See `data/npcs.json` for NPC templates
- See `AGENTS.md` for implementation details
