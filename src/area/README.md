# Area Module

Manages game areas, which are collections of rooms with shared properties like spawn rules and combat configuration.

## Contents

| Path             | Description                                       |
| ---------------- | ------------------------------------------------- |
| `area.ts`        | Area interfaces, DTOs, and type definitions       |
| `areaManager.ts` | Singleton manager for area CRUD operations        |

## Overview

Areas group rooms together for organizational and gameplay purposes:

- **Level Range**: Suggested player level for the area
- **Combat Config**: PvP settings, danger level, XP multipliers
- **Spawn Rules**: NPC respawn configuration per area
- **Default Flags**: Flags applied to new rooms in the area

## AreaManager Operations

- `getAll()` - List all areas
- `getById(id)` - Get specific area
- `create(dto)` - Create new area
- `update(id, dto)` - Update area properties
- `delete(id)` - Remove area

## Area Structure

Each area has:

- `id` - Unique identifier
- `name` - Display name
- `description` - Area description
- `levelRange` - Min/max recommended level
- `flags` - Special area properties
- `combatConfig` - PvP, danger level, XP settings
- `spawnConfig` - NPC spawn rules

## Related

- [data/areas.json](../../data/areas.json) - Area data storage
- [src/room/](../room/) - Rooms belonging to areas
- [src/admin/adminApi.ts](../admin/adminApi.ts) - Area API endpoints
