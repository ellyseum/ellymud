# Game Data - LLM Context

## Overview

JSON files containing all persistent game data. Modified at runtime and saved periodically. When developing features that change data structures, update both the schema and the data files.

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

**Purpose**: Room definitions

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
    "items": [],
    "npcs": [],
    "currency": { "gold": 0, "silver": 0, "copper": 0 }
  }
]
```

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
    "aggressive": true
  }
]
```

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
