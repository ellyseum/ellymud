# Game Data - LLM Context

## Overview

Game data storage with multi-backend support: JSON files, SQLite, or PostgreSQL.

### Storage Backends

Configured via `STORAGE_BACKEND` environment variable:
- `json` - Flat JSON files (default, development)
- `sqlite` - SQLite database at `data/game.db`
- `postgres` - PostgreSQL (requires `DATABASE_URL`)

### Auto-Migration

Data automatically migrates between backends on startup when `STORAGE_BACKEND` changes.
Backend state is tracked in `data/.backend-state`.

**Key files:**
- `src/data/autoMigrate.ts` - Auto-migration logic
- `src/data/db.ts` - Kysely database initialization
- `src/data/schema.ts` - Database schema definitions
- `scripts/data-migrate.ts` - CLI migration tool

**Commands:**
```bash
npm run data:status           # Check current backend
npm run data:export           # Database → JSON
npm run data:import           # JSON → Database
npm run data:switch postgres  # Switch to PostgreSQL
```

### Database Tables (Migrated)

| Table | JSON File | Status |
|-------|-----------|--------|
| `users` | `users.json` | ✅ Migrated |
| `rooms` | `rooms.json` | ✅ Migrated |
| `item_templates` | `items.json` | ✅ Migrated |
| `item_instances` | `itemInstances.json` | ✅ Migrated |

### Pending Migration (JSON-only)

| JSON File | Target Phase |
|-----------|--------------|
| `npcs.json` | Phase 3 |
| `merchant-state.json` | Phase 4 |
| `abilities.json` | Phase 6 |
| `admin.json` | Optional |
| `gametimer-config.json` | Optional |
| `mud-config.json` | Optional |

---

## File Reference

### `users.json`

**Purpose**: User accounts and character data

```json
[
  {
    "username": "player1",
    "passwordHash": "...",
    "salt": "...",
    "isAdmin": false,
    "currentRoomId": "town-square",
    "health": 100,
    "maxHealth": 100,
    "mana": 50,
    "maxMana": 50,
    "level": 1,
    "experience": 0,
    "strength": 10,
    "dexterity": 10,
    "intelligence": 10,
    "constitution": 10,
    "wisdom": 10,
    "charisma": 10,
    "gold": 100,
    "bank": { "gold": 1000, "silver": 0, "copper": 0 },
    "inventory": [],
    "equipment": {},
    "flags": [],
    "createdAt": "2024-01-01T00:00:00Z",
    "lastLogin": "2024-01-01T00:00:00Z",
    "playTime": 3600
  }
]
```

### `rooms.json`

**Purpose**: Room templates (static, immutable definitions)

```json
[
  {
    "id": "town-square",
    "name": "Town Square",
    "shortDescription": "A bustling town square",
    "longDescription": "You stand in the center of a busy town square...",
    "exits": [
      { "direction": "north", "targetRoomId": "market" },
      { "direction": "east", "targetRoomId": "tavern" }
    ],
    "flags": ["safe", "bank"],
    "areaId": "town",
    "gridX": 0,
    "gridY": 0
  }
]
```

**Note**: Room templates no longer contain runtime state (items, NPCs, currency). That data is now stored in `room_state.json`.

### `room_state.json`

**Purpose**: Mutable room runtime state (saved via autosave)

```json
[
  {
    "roomId": "town-square",
    "itemInstances": [
      { "instanceId": "sword-001", "templateId": "sword-iron" }
    ],
    "npcTemplateIds": ["guard-1", "merchant-1"],
    "currency": { "gold": 100, "silver": 50, "copper": 25 },
    "items": []
  }
]
```

**Fields**:
- `roomId` - Links to room template in rooms.json
- `itemInstances` - Items currently in the room (instanceId → templateId)
- `npcTemplateIds` - NPC templates to spawn in this room
- `currency` - Gold/silver/copper on the floor
- `items` - Legacy string-based items (deprecated)

**Migration**: Use `scripts/migrate-room-state.ts` to split existing rooms.json data.

### `items.json`

**Purpose**: Item templates (not instances)

```json
[
  {
    "id": "sword-iron",
    "name": "Iron Sword",
    "description": "A sturdy iron sword",
    "type": "weapon",
    "slot": "mainHand",
    "rarity": "common",
    "stats": {
      "attack": 5
    },
    "value": 50
  }
]
```

### `itemInstances.json`

**Purpose**: Instantiated items in the world

```json
[
  {
    "instanceId": "sword-iron-001",
    "templateId": "sword-iron",
    "customName": null,
    "location": { "type": "room", "id": "armory" },
    "condition": 100
  }
]
```

### `areas.json`

**Purpose**: Area definitions for grouping rooms with shared properties

```json
[
  {
    "id": "town-center",
    "name": "Town Center",
    "description": "The central hub of the town, with safe zones and shops",
    "levelRange": { "min": 1, "max": 5 },
    "flags": ["starter-zone", "safe"],
    "combatConfig": {
      "pvpEnabled": false,
      "dangerLevel": 1,
      "xpMultiplier": 1.0
    },
    "spawnConfig": [],
    "defaultRoomFlags": ["safe"],
    "created": "2026-01-10T00:00:00.000Z",
    "modified": "2026-01-10T00:00:00.000Z"
  }
]
```

**Area Fields**:
- `id` - Unique identifier (e.g., 'enchanted-forest')
- `name` - Display name
- `description` - Area description for world builders
- `levelRange` - Recommended level range `{ min, max }`
- `flags` - Area-level flags (e.g., 'no-recall', 'quest-zone')
- `combatConfig` - PvP settings, danger level, XP multipliers
- `spawnConfig` - NPC spawn rules per area
- `defaultRoomFlags` - Flags applied to new rooms in this area
- `created`/`modified` - ISO timestamps

### `npcs.json`

**Purpose**: NPC templates

```json
[
  {
    "id": "goblin",
    "name": "Goblin",
    "description": "A small, green creature",
    "health": 30,
    "maxHealth": 30,
    "attack": 5,
    "defense": 2,
    "level": 1,
    "experience": 10,
    "loot": ["gold:10-20", "item:dagger:0.1"],
    "respawnTime": 60,
    "aggressive": true,
    "merchant": false,
    "inventory": []
  }
]
```

### `abilities.json`

**Purpose**: Spell and ability definitions

```json
[
  {
    "id": "fireball",
    "name": "Fireball",
    "description": "Hurls a ball of fire at your enemy",
    "type": "standard",
    "mpCost": 15,
    "cooldownType": "rounds",
    "cooldownValue": 3,
    "targetType": "enemy",
    "effects": [
      {
        "effectType": "damage_over_time",
        "payload": { "damagePerTick": 5 },
        "durationTicks": 4,
        "tickInterval": 1,
        "name": "Burning",
        "description": "Taking fire damage"
      }
    ]
  }
]
```

**Ability Types**:
- `standard` - Cast via `cast <ability>` command
- `combat` - Replaces weapon attacks for N rounds
- `proc` - Triggers randomly on weapon hit
- `item` - Triggered via `use <item>` command

**Cooldown Types**:
- `rounds` - Combat rounds
- `seconds` - Real-time seconds
- `uses` - Limited number of uses

**Target Types**: `self`, `enemy`, `ally`, `room`

### `mud-config.json`

**Purpose**: Game configuration

```json
{
  "serverName": "EllyMUD",
  "maxPlayers": 100,
  "startingRoom": "start",
  "tickInterval": 2000,
  "autoSaveInterval": 300000,
  "combatEnabled": true,
  "pvpEnabled": false
}
```

### `gametimer-config.json`

**Purpose**: Timer and tick settings

```json
{
  "tickInterval": 2000,
  "combatTickInterval": 2000,
  "regenTickInterval": 10000,
  "autoSaveInterval": 300000
}
```

### `admin.json`

**Purpose**: Admin configuration

```json
{
  "superAdmins": ["admin"],
  "adminUsers": ["moderator1"],
  "bannedUsers": [],
  "maintenanceMode": false
}
```

### `bug-reports.json`

**Purpose**: Player bug reports

```json
[
  {
    "id": "bug-001",
    "reporter": "player1",
    "message": "Item disappeared after dropping",
    "timestamp": "2024-01-01T00:00:00Z",
    "status": "open"
  }
]
```

## Data Flow

```
Server Start
    ↓
Load JSON files → Validate with schemas
    ↓
Store in memory (Maps/Arrays)
    ↓
Modify during gameplay
    ↓
Save periodically or on change
    ↓
Server Shutdown → Final save
```

## Conventions

### Adding New Data

1. Define schema in `src/schemas/`
2. Create data file in `data/`
3. Add loader in appropriate manager
4. Handle validation errors gracefully

### Modifying Existing Data

```typescript
// ✅ Use manager methods (auto-saves)
userManager.updateUserStats(username, { health: 50 });

// ❌ Don't modify data directly
const user = userManager.getUser(username);
user.health = 50; // Won't persist!
```

## Gotchas & Warnings

- ⚠️ **Backup Before Editing**: Manual edits can corrupt data
- ⚠️ **JSON Syntax**: Invalid JSON prevents server start
- ⚠️ **ID Uniqueness**: IDs must be unique within each file
- ⚠️ **Schema Changes**: Update schema when changing data structure
- ⚠️ **File Locking**: Don't edit while server is running

## Related Context

- [`../src/schemas/`](../src/schemas/) - Validation schemas
- [`../src/user/userManager.ts`](../src/user/userManager.ts) - Loads users.json
- [`../src/room/roomManager.ts`](../src/room/roomManager.ts) - Loads rooms.json
- [`../src/utils/fileUtils.ts`](../src/utils/fileUtils.ts) - File loading
