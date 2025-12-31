# Data Directory (Source)

Database schema and connection utilities for the Kysely persistence layer with support for SQLite and PostgreSQL.

## Contents

| Path            | Description                                       |
| --------------- | ------------------------------------------------- |
| `schema.ts`     | TypeScript interfaces for database tables         |
| `db.ts`         | Database connection singleton and initialization  |
| `autoMigrate.ts`| Auto-sync data when storage backend changes       |
| `__mocks__/`    | Jest mocks for database testing                   |

## Overview

This directory contains the database layer that provides an alternative to JSON file storage. The system uses Kysely as a type-safe query builder with support for both SQLite (local) and PostgreSQL (remote) backends. The SQLite database file (`game.db`) is stored in the root `data/` directory.

## Game Data Location

- **SQLite**: Database file at `data/game.db`
- **PostgreSQL**: Configured via `DATABASE_URL` environment variable

In `sqlite` or `postgres` storage-backend mode, the database is the primary data source for users, rooms, and items. In the default `auto` mode, JSON files remain the initial synchronous source of truth, with the database being loaded and synchronized asynchronously afterward.

## Data Migration

Use the data migration tool to sync data between backends:

```bash
npm run data:status     # Show current backend and data counts
npm run data:export     # Export database → JSON files
npm run data:import     # Import JSON files → database
npm run data:switch sqlite   # Switch to SQLite
npm run data:switch postgres # Switch to PostgreSQL
```

**Auto-migration**: When `STORAGE_BACKEND` changes from `json` to a database backend, data is automatically imported on server startup.

## Related

- [data/](../../data/) - Runtime data directory (contains game.db and JSON files)
- [scripts/data-migrate.ts](../../scripts/data-migrate.ts) - Data migration CLI tool
- [src/user/](../user/) - UserManager using database methods
- [src/room/](../room/) - RoomManager using database methods
- [src/utils/itemManager.ts](../utils/itemManager.ts) - ItemManager using database methods
