# Game Data

JSON files containing all persistent game data including users, rooms, items, NPCs, and configuration.

## Contents

| Path | Description |
|------|-------------|
| `users.json` | User accounts and character data |
| `rooms.json` | World room definitions with exits and contents |
| `items.json` | Item templates defining all item types |
| `itemInstances.json` | Instantiated items in the world |
| `npcs.json` | NPC templates and behaviors |
| `mud-config.json` | Core game configuration |
| `gametimer-config.json` | Timer and tick settings |
| `admin.json` | Admin and moderation configuration |
| `bug-reports.json` | Player-submitted bug reports |
| `snake-scores.json` | Snake minigame high scores |
| `admin/` | Admin-specific data files |

## Overview

All data files are JSON format and are loaded at server startup. Data is modified during gameplay and saved periodically. Manual edits should only be made while the server is stopped.

## Related

- [`../src/schemas/`](../src/schemas/) - JSON validation schemas
- [`../src/user/`](../src/user/) - User data management
- [`../src/room/`](../src/room/) - Room data management
