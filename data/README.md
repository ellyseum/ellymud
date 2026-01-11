# Game Data

Game data storage supporting multiple backends: JSON files, SQLite, or PostgreSQL.

## Storage Backends

The server supports three storage backends via `STORAGE_BACKEND` environment variable:

| Backend | Config Value | Description |
|---------|-------------|-------------|
| JSON Files | `json` | Default - flat JSON files in this directory |
| SQLite | `sqlite` | Single-file database at `game.db` |
| PostgreSQL | `postgres` | External database (requires `DATABASE_URL`) |

## Auto-Migration

When switching backends, data automatically migrates on startup. The last-used backend is tracked in `.backend-state`.

**Commands:**
```bash
npm run data:status   # Check current backend state
npm run data:export   # Export database to JSON files
npm run data:import   # Import JSON files to database
npm run data:backup   # Create timestamped backup
npm run data:switch <backend>  # Switch backend with migration
```

## Contents

| File | Description | DB Table |
|------|-------------|----------|
| `users.json` | User accounts, stats, inventory | `users` ✅ |
| `rooms.json` | Room templates (static definitions) | `rooms` ✅ |
| `room_state.json` | Room runtime state (items, NPCs, currency) | - (file-only) |
| `items.json` | Item templates (weapons, armor, etc.) | `item_templates` ✅ |
| `itemInstances.json` | Instantiated items in the world | `item_instances` ✅ |
| `areas.json` | Area definitions (groups of rooms) | - (JSON only) |
| `npcs.json` | NPC templates and behaviors | - (Phase 3) |
| `abilities.json` | Spell and ability definitions | - (Phase 6) |
| `merchant-state.json` | Merchant inventory state | - (Phase 4) |
| `mud-config.json` | Core game configuration | - (optional) |
| `gametimer-config.json` | Timer and tick settings | - (optional) |
| `admin.json` | Admin configuration | - (optional) |
| `bug-reports.json` | Player bug reports | - (optional) |
| `snake-scores.json` | Snake minigame scores | - (optional) |
| `game.db` | SQLite database (when using sqlite backend) | - |
| `.backend-state` | Tracks current storage backend | - |

## Overview

- **JSON mode**: Files are loaded at startup and saved periodically
- **Database mode**: Data stored in SQLite/PostgreSQL with JSON as backup
- Manual edits to JSON should only be made while server is stopped
- Use `npm run data:export` to sync database → JSON before editing

## Related

- [`../src/data/`](../src/data/) - Database layer (Kysely)
- [`../src/data/autoMigrate.ts`](../src/data/autoMigrate.ts) - Auto-migration logic
- [`../scripts/data-migrate.ts`](../scripts/data-migrate.ts) - Migration CLI
