# Data Directory (src) - LLM Context

## Overview

This directory contains the database abstraction layer for EllyMUD. It provides type-safe database access using Kysely with support for both SQLite (local) and PostgreSQL (remote) backends. This replaces the legacy JSON file storage for users, rooms, and items.

**Key components**:
- **Schema definitions** - TypeScript interfaces matching database tables
- **Connection singleton** - Lazy-initialized database connection
- **Auto-migration** - Automatic data sync when backend changes
- **Jest mocks** - Prevents native module loading during tests

## Auto-Migration Coverage

The migration script (`scripts/migrate-json-to-sqlite.ts`) provides full coverage for all EllyMUD entities:

| Entity | JSON→DB | DB→JSON | Auto-Migrate | Notes |
|--------|---------|---------|--------------|-------|
| Users | ✅ | ✅ | ✅ | Full support |
| Rooms | ✅ | ✅ | ✅ | Full support |
| NPCs | ✅ | ✅ | ✅ | Full support |
| Items (templates) | ✅ | ✅ | ✅ | Full support |
| Item Instances | ✅ | ✅ | ✅ | Full support |
| Areas | ✅ | ✅ | ✅ | Full support |
| Abilities | ✅ | ✅ | ✅ | Full support |
| Room States | ✅ | ✅ | ✅ | Full support |
| Merchant States | ✅ | ✅ | ✅ | Full support |
| Admin Auth | ✅ | ✅ | ✅ | Full support |
| MUD Config | ✅ | ✅ | ✅ | Singleton pattern |
| Game Timer Config | ✅ | ✅ | ✅ | Singleton pattern |
| Bug Reports | ✅ | ✅ | ✅ | Low priority data |
| Snake Scores | ✅ | ✅ | ✅ | Mini-game data |

**Run migration**:
```bash
# Delete existing database and run fresh migration
rm -f data/game.db && npx ts-node scripts/migrate-json-to-sqlite.ts

# Or use npm script
npm run data:import
```

## Architecture

```
src/data/
├── schema.ts          # Table interfaces (UsersTable, RoomsTable, Database)
├── db.ts              # getDb(), initializeDatabase(), closeDatabase()
├── autoMigrate.ts     # Auto-sync data when storage backend changes
└── __mocks__/
    └── db.ts          # Jest mock with chainable query builders
```

## File Reference

### `schema.ts`

**Purpose**: Defines TypeScript interfaces for all database tables.

**Key Exports**:
```typescript
// Core tables
export interface UsersTable {
  username: string;           // Primary key
  password_hash: string;
  salt: string;
  health: number;
  // ... all user fields
}

export interface RoomsTable {
  id: string;                 // Primary key
  name: string;
  description: string;
  exits: string;              // JSON stringified
  // ... all room fields
}

export interface AreasTable {
  id: string;                 // Primary key
  name: string;
  description: string;
  level_range: string;        // JSON stringified {min, max}
  flags: string | null;       // JSON stringified array
  combat_config: string | null;  // JSON stringified AreaCombatConfig
  spawn_config: string;       // JSON stringified AreaSpawnConfig[]
  default_room_flags: string | null;  // JSON stringified array
  created: string;            // ISO date string
  modified: string;           // ISO date string
}

export interface RoomStatesTable {
  room_id: string;            // Primary key
  item_instances: string;     // JSON stringified
  npc_template_ids: string;   // JSON stringified
  currency_gold: number;
  currency_silver: number;
  currency_copper: number;
}

// New tables (Phase 2-5)
export interface AdminsTable {
  username: string;           // Primary key
  level: string;              // 'super' | 'admin' | 'mod'
  added_by: string;
  added_on: string;
}

export interface BugReportsTable {
  id: string;                 // Primary key
  user: string;
  datetime: string;
  report: string;
  logs_raw: string | null;
  logs_user: string | null;
  solved: number;             // 0 or 1
  solved_on: string | null;
  solved_by: string | null;
  solved_reason: string | null;
}

export interface MerchantStatesTable {
  template_id: string;        // Primary key
  inventory: string;          // JSON stringified
  last_restock: string | null;
}

export interface AbilitiesTable {
  id: string;                 // Primary key
  name: string;
  description: string;
  type: string;
  cooldown_ms: number;
  mana_cost: number;
  effects: string;            // JSON stringified
  requirements: string | null; // JSON stringified
}

export interface SnakeScoresTable {
  id: number;                 // Auto-increment primary key
  username: string;
  score: number;
  date: string;
}

export interface Database {
  users: UsersTable;
  rooms: RoomsTable;
  areas: AreasTable;
  room_states: RoomStatesTable;
  items: ItemsTable;
  item_instances: ItemInstancesTable;
  npcs: NpcsTable;
  admins: AdminsTable;
  bug_reports: BugReportsTable;
  merchant_states: MerchantStatesTable;
  abilities: AbilitiesTable;
  snake_scores: SnakeScoresTable;
}
```

**Usage**:
```typescript
import { Database } from './schema';
import { Kysely } from 'kysely';

const db: Kysely<Database> = getDb();
```

**Dependencies**: `kysely`
**Used By**: `db.ts`, `__mocks__/db.ts`, `scripts/data-migrate.ts`, `autoMigrate.ts`

### `db.ts`

**Purpose**: Database connection singleton with lazy initialization.

**Key Exports**:
```typescript
export function getDb(): Kysely<DatabaseSchema>
export async function initializeDatabase(): Promise<void>
export async function closeDatabase(): Promise<void>
```

**Usage**:
```typescript
import { getDb, initializeDatabase } from './db';

// At startup
await initializeDatabase();

// In managers
const db = getDb();
const user = await db.selectFrom('users')
  .selectAll()
  .where('username', '=', 'testuser')
  .executeTakeFirst();
```

**Database Location**: `data/game.db` (SQLite) or configured via `DATABASE_URL` (PostgreSQL)

**Dependencies**: `better-sqlite3` (SQLite), `pg` (PostgreSQL), `kysely`, `./schema`
**Used By**: `src/user/userManager.ts`, `src/room/roomManager.ts`, `src/utils/itemManager.ts`

### `__mocks__/db.ts`

**Purpose**: Jest mock that prevents native `better-sqlite3` and `pg` modules from loading during tests.

**What it provides**:
- Mock `getDb()` returning a chainable mock query builder
- Mock `initializeDatabase()` as no-op
- Mock `closeDatabase()` as no-op

**How it works**:
Jest automatically uses this mock when `jest.config.js` has a module mapper for `src/data/db`:
```javascript
moduleNameMapper: {
  '^(\\.\\./)*data/db$': '<rootDir>/src/data/__mocks__/db.ts',
}
```

## Conventions

### JSON Stringification

Complex fields (arrays, objects) are stored as JSON strings in the database:

```typescript
// ✅ Correct - stringify before insert
equipment: user.equipment ? JSON.stringify(user.equipment) : null

// ✅ Correct - parse after select
const equipment = JSON.parse(row.equipment || '{}');

// ❌ Incorrect - passing objects directly
equipment: user.equipment  // Will become "[object Object]"
```

### Boolean to Integer

SQLite has no native boolean type (PostgreSQL does). For cross-database compatibility, use 1/0:

```typescript
// ✅ Correct
in_combat: user.inCombat ? 1 : 0

// When reading
const inCombat = row.in_combat === 1;
```

### Null Handling

Use `null` for optional fields, not empty strings:

```typescript
// ✅ Correct
email: user.email || null

// ❌ Incorrect
email: user.email || ''
```

## Common Tasks

### Adding a New Table

1. Add interface to `schema.ts`:
```typescript
export interface NewTable {
  id: string;
  // fields...
}
```

2. Add to Database interface:
```typescript
export interface Database {
  users: UsersTable;
  rooms: RoomsTable;
  new_table: NewTable;  // Add here
}
```

3. Add table creation in `db.ts` `initializeDatabase()`:
```typescript
await database.schema.createTable('new_table').ifNotExists()
  .addColumn('id', 'text', (col) => col.primaryKey())
  // ... columns
  .execute();
```

4. Update the migration script to migrate data for the new table.

### Querying Data

```typescript
const db = getDb();

// Select one
const user = await db.selectFrom('users')
  .selectAll()
  .where('username', '=', name)
  .executeTakeFirst();

// Select many
const rooms = await db.selectFrom('rooms')
  .selectAll()
  .execute();

// Insert with upsert
await db.insertInto('users')
  .values(userData)
  .onConflict((oc) => oc.column('username').doUpdateSet(userData))
  .execute();
```

## Gotchas & Warnings

- ⚠️ **Native modules**: `better-sqlite3` and `pg` are native Node modules. Tests MUST use the mock to avoid loading them.
- ⚠️ **Connection singleton**: `getDb()` creates connection on first call. Don't create multiple instances.
- ⚠️ **Schema sync**: If you modify `schema.ts`, you must also update `initializeDatabase()` table creation.
- ⚠️ **Date handling**: Dates are stored as ISO strings. Parse with `new Date(row.join_date)`.
- ⚠️ **Snake case**: Database uses `snake_case` columns but TypeScript interfaces use `snake_case` too (not camelCase).
- ⚠️ **Backend switch**: When changing `STORAGE_BACKEND`, use `npm run data:switch <target>` or auto-migration will run at startup.

## Useful Commands

```bash
# View SQLite database structure
sqlite3 data/game.db ".schema"

# Query users (SQLite)
sqlite3 data/game.db "SELECT username, level FROM users"

# Query rooms (SQLite)
sqlite3 data/game.db "SELECT id, name FROM rooms"

# Backup database
cp data/game.db data/game.db.backup

# Data migration commands
npm run data:status     # Show current backend and data counts
npm run data:export     # Export database → JSON files
npm run data:import     # Import JSON files → database
npm run data:backup     # Create timestamped backup
npm run data:switch sqlite  # Switch to SQLite backend
npm run data:switch postgres  # Switch to PostgreSQL backend
```

## Related Context

- [`../../data/`](../../data/) - Contains `game.db` file and JSON files
- [`../user/`](../user/) - UserManager with database query methods
- [`../room/`](../room/) - RoomManager with database query methods
- [`../utils/itemManager.ts`](../utils/itemManager.ts) - ItemManager with database query methods
- [`../../scripts/data-migrate.ts`](../../scripts/data-migrate.ts) - Data migration CLI tool
