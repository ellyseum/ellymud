# Game Data

JSON data files for game persistence.

## Contents

| File | Description |
|------|-------------|
| `users.json` | User accounts and character data |
| `rooms.json` | Room definitions and exits |
| `items.json` | Item templates |
| `itemInstances.json` | Instantiated items in world |
| `npcs.json` | NPC templates |
| `mud-config.json` | Game configuration |
| `gametimer-config.json` | Timer settings |
| `admin.json` | Admin configuration |
| `bug-reports.json` | Player bug reports |
| `snake-scores.json` | Snake game high scores |
| `admin/` | Admin-specific data |

## Overview

All game state is persisted in JSON files. Data is loaded on server start and saved periodically or on changes. Files are validated against schemas in `src/schemas/`.

## Related

- [`../src/schemas/`](../src/schemas/) - Validation schemas
- [`../src/user/userManager.ts`](../src/user/userManager.ts) - User data access
- [`../src/room/roomManager.ts`](../src/room/roomManager.ts) - Room data access
