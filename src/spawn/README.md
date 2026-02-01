# Spawn Module

Automatic NPC spawning system based on area configurations.

## Purpose

Maintains world population by automatically respawning NPCs according to area rules. When NPCs are killed, they respawn after a configurable delay.

## Features

- Area-based spawn rules
- Configurable spawn rates and limits
- Tracks NPC instances per area
- Supports merchant NPCs
- Optional room-specific spawning

## Configuration

Spawn rules are defined in area data under `spawnConfig`:

- `npcTemplateId` - Which NPC to spawn
- `maxInstances` - Maximum concurrent NPCs
- `respawnTicks` - Delay between spawns
- `spawnRooms` - Optional specific rooms

## Usage

The SpawnManager is automatically initialized by GameTimerManager and processes on each game tick. No manual intervention required.

## Related

- See `src/area/` for area configuration
- See `data/areas.json` for spawn config examples
- See `AGENTS.md` for implementation details
