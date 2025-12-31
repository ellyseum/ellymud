/**
 * Kysely database connection for EllyMUD
 * Supports SQLite (local) and PostgreSQL (remote) backends
 */
import { Kysely, SqliteDialect, PostgresDialect } from 'kysely';
import path from 'path';
import { Database as DatabaseSchema } from './schema';
import { systemLogger } from '../utils/logger';
import { STORAGE_BACKEND, DATABASE_URL } from '../config';

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'game.db');

let db: Kysely<DatabaseSchema> | null = null;
let initializationPromise: Promise<void> | null = null;

/**
 * Creates the appropriate Kysely dialect based on storage backend configuration
 */
function createDialect(): SqliteDialect | PostgresDialect {
  if (STORAGE_BACKEND === 'postgres') {
    if (!DATABASE_URL) {
      throw new Error('DATABASE_URL is required when using postgres storage backend');
    }
    // Dynamic import to avoid loading pg when not needed
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Pool } = require('pg');
    systemLogger.info(`[Database] Using PostgreSQL dialect`);
    return new PostgresDialect({
      pool: new Pool({
        connectionString: DATABASE_URL,
        max: 10, // Connection pool size
      }),
    });
  }

  // Default to SQLite for 'sqlite' and 'auto' modes
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Database = require('better-sqlite3');
  systemLogger.info(`[Database] Using SQLite dialect: ${DB_PATH}`);
  return new SqliteDialect({ database: new Database(DB_PATH) });
}

export function getDb(): Kysely<DatabaseSchema> {
  if (!db) {
    db = new Kysely<DatabaseSchema>({
      dialect: createDialect(),
    });
    
    // Initialize tables on first connection
    if (!initializationPromise) {
      initializationPromise = initializeDatabase().catch((error) => {
        systemLogger.error('[Database] Failed to initialize tables:', error);
        throw error; // Re-throw so callers can handle initialization failures
      });
    }
  }
  return db;
}

/**
 * Ensures database tables are initialized before use.
 * Call this before performing any database operations.
 */
export async function ensureInitialized(): Promise<void> {
  getDb(); // Ensure connection is created
  if (initializationPromise) {
    await initializationPromise;
  }
}

export async function initializeDatabase(): Promise<void> {
  const database = getDb();
  
  await database.schema.createTable('users').ifNotExists()
    .addColumn('username', 'text', (col) => col.primaryKey())
    .addColumn('password_hash', 'text', (col) => col.notNull())
    .addColumn('salt', 'text', (col) => col.notNull())
    .addColumn('health', 'integer', (col) => col.notNull().defaultTo(100))
    .addColumn('max_health', 'integer', (col) => col.notNull().defaultTo(100))
    .addColumn('mana', 'integer', (col) => col.notNull().defaultTo(100))
    .addColumn('max_mana', 'integer', (col) => col.notNull().defaultTo(100))
    .addColumn('experience', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('level', 'integer', (col) => col.notNull().defaultTo(1))
    .addColumn('strength', 'integer', (col) => col.notNull().defaultTo(10))
    .addColumn('dexterity', 'integer', (col) => col.notNull().defaultTo(10))
    .addColumn('agility', 'integer', (col) => col.notNull().defaultTo(10))
    .addColumn('constitution', 'integer', (col) => col.notNull().defaultTo(10))
    .addColumn('wisdom', 'integer', (col) => col.notNull().defaultTo(10))
    .addColumn('intelligence', 'integer', (col) => col.notNull().defaultTo(10))
    .addColumn('charisma', 'integer', (col) => col.notNull().defaultTo(10))
    .addColumn('equipment', 'text')
    .addColumn('join_date', 'text', (col) => col.notNull())
    .addColumn('last_login', 'text', (col) => col.notNull())
    .addColumn('total_play_time', 'integer', (col) => col.defaultTo(0))
    .addColumn('current_room_id', 'text', (col) => col.notNull())
    .addColumn('inventory_items', 'text')
    .addColumn('inventory_gold', 'integer', (col) => col.defaultTo(0))
    .addColumn('inventory_silver', 'integer', (col) => col.defaultTo(0))
    .addColumn('inventory_copper', 'integer', (col) => col.defaultTo(0))
    .addColumn('bank_gold', 'integer', (col) => col.defaultTo(0))
    .addColumn('bank_silver', 'integer', (col) => col.defaultTo(0))
    .addColumn('bank_copper', 'integer', (col) => col.defaultTo(0))
    .addColumn('in_combat', 'integer', (col) => col.defaultTo(0))
    .addColumn('is_unconscious', 'integer', (col) => col.defaultTo(0))
    .addColumn('is_resting', 'integer', (col) => col.defaultTo(0))
    .addColumn('is_meditating', 'integer', (col) => col.defaultTo(0))
    .addColumn('flags', 'text')
    .addColumn('pending_admin_messages', 'text')
    .addColumn('email', 'text')
    .addColumn('description', 'text')
    .execute();

  await database.schema.createTable('rooms').ifNotExists()
    .addColumn('id', 'text', (col) => col.primaryKey())
    .addColumn('name', 'text', (col) => col.notNull())
    .addColumn('description', 'text', (col) => col.notNull())
    .addColumn('exits', 'text', (col) => col.notNull())
    .addColumn('currency_gold', 'integer', (col) => col.defaultTo(0))
    .addColumn('currency_silver', 'integer', (col) => col.defaultTo(0))
    .addColumn('currency_copper', 'integer', (col) => col.defaultTo(0))
    .addColumn('flags', 'text')
    .addColumn('npc_template_ids', 'text')
    .addColumn('item_instances', 'text')
    .execute();

  await database.schema.createTable('item_templates').ifNotExists()
    .addColumn('id', 'text', (col) => col.primaryKey())
    .addColumn('name', 'text', (col) => col.notNull())
    .addColumn('description', 'text', (col) => col.notNull())
    .addColumn('type', 'text', (col) => col.notNull())
    .addColumn('slot', 'text')
    .addColumn('value', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('weight', 'integer')
    .addColumn('global_limit', 'integer')
    .addColumn('stats', 'text')
    .addColumn('requirements', 'text')
    .execute();

  await database.schema.createTable('item_instances').ifNotExists()
    .addColumn('instance_id', 'text', (col) => col.primaryKey())
    .addColumn('template_id', 'text', (col) => col.notNull())
    .addColumn('created', 'text', (col) => col.notNull())
    .addColumn('created_by', 'text', (col) => col.notNull())
    .addColumn('properties', 'text')
    .addColumn('history', 'text')
    .execute();

  systemLogger.info('[Database] Tables initialized');
}

export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.destroy();
    db = null;
    systemLogger.info('[Database] Connection closed');
  }
}
