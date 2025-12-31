# Data Directory (Source)

Database schema and connection utilities for the Kysely/SQLite persistence layer.

## Contents

| Path         | Description                                      |
| ------------ | ------------------------------------------------ |
| `schema.ts`  | TypeScript interfaces for database tables        |
| `db.ts`      | Database connection singleton and initialization |
| `__mocks__/` | Jest mocks for database testing                  |

## Overview

This directory contains the database layer that replaces the legacy JSON file storage. The system uses Kysely as a type-safe query builder with SQLite as the backend. The actual database file (`game.db`) is stored in the root `data/` directory.

## Game Data Location

The SQLite database file is located at `data/game.db`. In `sqlite` storage-backend mode this database is the primary data source for users, rooms, and items and the legacy JSON files in `data/` are only used for reference. In the default `auto` mode, the JSON files remain the initial synchronous source of truth for users, rooms, and items, with SQLite being loaded and synchronized asynchronously afterward.

## Related

- [data/](../../data/) - Runtime data directory (contains game.db)
- [scripts/](../../scripts/) - Migration script for JSON to SQLite
- [src/user/](../user/) - UserManager using database methods
- [src/room/](../room/) - RoomManager using database methods
- [src/utils/itemManager.ts](../utils/itemManager.ts) - ItemManager using database methods
