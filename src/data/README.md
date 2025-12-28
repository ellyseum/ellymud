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

The SQLite database file is located at `data/game.db`. Legacy JSON files in `data/` are still present for reference but are no longer the primary data source for users and rooms.

## Related

- [data/](../../data/) - Runtime data directory (contains game.db)
- [scripts/](../../scripts/) - Migration script for JSON to SQLite
- [src/user/](../user/) - UserManager using database methods
- [src/room/](../room/) - RoomManager using database methods
