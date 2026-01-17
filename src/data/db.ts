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

  await database.schema.createTable('npc_templates').ifNotExists()
    .addColumn('id', 'text', (col) => col.primaryKey())
    .addColumn('name', 'text', (col) => col.notNull())
    .addColumn('description', 'text', (col) => col.notNull())
    .addColumn('health', 'integer', (col) => col.notNull())
    .addColumn('max_health', 'integer', (col) => col.notNull())
    .addColumn('damage_min', 'integer', (col) => col.notNull())
    .addColumn('damage_max', 'integer', (col) => col.notNull())
    .addColumn('is_hostile', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('is_passive', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('experience_value', 'integer', (col) => col.notNull().defaultTo(50))
    .addColumn('attack_texts', 'text', (col) => col.notNull())
    .addColumn('death_messages', 'text', (col) => col.notNull())
    .addColumn('merchant', 'integer')
    .addColumn('inventory', 'text')
    .addColumn('stock_config', 'text')
    .execute();

  await database.schema.createTable('areas').ifNotExists()
    .addColumn('id', 'text', (col) => col.primaryKey())
    .addColumn('name', 'text', (col) => col.notNull())
    .addColumn('description', 'text', (col) => col.notNull())
    .addColumn('level_range', 'text', (col) => col.notNull())
    .addColumn('flags', 'text')
    .addColumn('combat_config', 'text')
    .addColumn('spawn_config', 'text', (col) => col.notNull())
    .addColumn('default_room_flags', 'text')
    .addColumn('created', 'text', (col) => col.notNull())
    .addColumn('modified', 'text', (col) => col.notNull())
    .execute();

  await database.schema.createTable('room_states').ifNotExists()
    .addColumn('room_id', 'text', (col) => col.primaryKey())
    .addColumn('item_instances', 'text', (col) => col.notNull().defaultTo('[]'))
    .addColumn('npc_template_ids', 'text', (col) => col.notNull().defaultTo('[]'))
    .addColumn('currency_gold', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('currency_silver', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('currency_copper', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('items', 'text')
    .execute();

  await database.schema.createTable('admins').ifNotExists()
    .addColumn('username', 'text', (col) => col.primaryKey())
    .addColumn('level', 'text', (col) => col.notNull())
    .addColumn('added_by', 'text', (col) => col.notNull())
    .addColumn('added_on', 'text', (col) => col.notNull())
    .execute();

  await database.schema.createTable('bug_reports').ifNotExists()
    .addColumn('id', 'text', (col) => col.primaryKey())
    .addColumn('user', 'text', (col) => col.notNull())
    .addColumn('datetime', 'text', (col) => col.notNull())
    .addColumn('report', 'text', (col) => col.notNull())
    .addColumn('logs_raw', 'text')
    .addColumn('logs_user', 'text')
    .addColumn('solved', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('solved_on', 'text')
    .addColumn('solved_by', 'text')
    .addColumn('solved_reason', 'text')
    .execute();

  await database.schema.createTable('merchant_states').ifNotExists()
    .addColumn('npc_template_id', 'text', (col) => col.primaryKey())
    .addColumn('npc_instance_id', 'text', (col) => col.notNull())
    .addColumn('actual_inventory', 'text', (col) => col.notNull().defaultTo('[]'))
    .addColumn('stock_config', 'text', (col) => col.notNull().defaultTo('[]'))
    .execute();

  await database.schema.createTable('abilities').ifNotExists()
    .addColumn('id', 'text', (col) => col.primaryKey())
    .addColumn('name', 'text', (col) => col.notNull())
    .addColumn('description', 'text', (col) => col.notNull())
    .addColumn('type', 'text', (col) => col.notNull())
    .addColumn('mp_cost', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('cooldown_type', 'text', (col) => col.notNull())
    .addColumn('cooldown_value', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('target_type', 'text', (col) => col.notNull())
    .addColumn('effects', 'text', (col) => col.notNull().defaultTo('[]'))
    .addColumn('requirements', 'text')
    .addColumn('proc_chance', 'real')
    .addColumn('consumes_item', 'integer')
    .execute();

  await database.schema.createTable('snake_scores').ifNotExists()
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('username', 'text', (col) => col.notNull())
    .addColumn('score', 'integer', (col) => col.notNull())
    .addColumn('date', 'text', (col) => col.notNull())
    .execute();

  await database.schema.createTable('mud_config').ifNotExists()
    .addColumn('key', 'text', (col) => col.primaryKey())
    .addColumn('data_files', 'text', (col) => col.notNull())
    .addColumn('game_starting_room', 'text', (col) => col.notNull().defaultTo('town-square'))
    .addColumn('game_max_players', 'integer', (col) => col.notNull().defaultTo(100))
    .addColumn('game_idle_timeout', 'integer', (col) => col.notNull().defaultTo(30))
    .addColumn('game_max_password_attempts', 'integer', (col) => col.notNull().defaultTo(5))
    .addColumn('advanced_debug_mode', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('advanced_allow_registration', 'integer', (col) => col.notNull().defaultTo(1))
    .addColumn('advanced_backup_interval', 'integer', (col) => col.notNull().defaultTo(6))
    .addColumn('advanced_log_level', 'text', (col) => col.notNull().defaultTo('info'))
    .execute();

  await database.schema.createTable('gametimer_config').ifNotExists()
    .addColumn('key', 'text', (col) => col.primaryKey())
    .addColumn('tick_interval', 'integer', (col) => col.notNull().defaultTo(6000))
    .addColumn('save_interval', 'integer', (col) => col.notNull().defaultTo(10))
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
