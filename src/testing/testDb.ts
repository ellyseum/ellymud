/**
 * In-memory SQLite database for testing
 * Provides a clean, isolated database for each test run
 * @module testing/testDb
 */

import { Kysely, SqliteDialect } from 'kysely';
import Database from 'better-sqlite3';
import { Database as DatabaseSchema } from '../data/schema';

let testDb: Kysely<DatabaseSchema> | null = null;

/**
 * Create a fresh in-memory SQLite database for testing
 * Each call creates a new, clean database
 */
export function createTestDb(): Kysely<DatabaseSchema> {
  // Close existing test database if any
  if (testDb) {
    void testDb.destroy();
  }

  testDb = new Kysely<DatabaseSchema>({
    dialect: new SqliteDialect({
      database: new Database(':memory:'),
    }),
  });

  return testDb;
}

/**
 * Get the current test database instance
 * Throws if no test database has been created
 */
export function getTestDb(): Kysely<DatabaseSchema> {
  if (!testDb) {
    throw new Error('Test database not initialized. Call createTestDb() first.');
  }
  return testDb;
}

/**
 * Initialize test database tables
 * Creates the same schema as the production database
 */
export async function initializeTestDb(db: Kysely<DatabaseSchema>): Promise<void> {
  await db.schema
    .createTable('users')
    .ifNotExists()
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

  await db.schema
    .createTable('rooms')
    .ifNotExists()
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

  await db.schema
    .createTable('item_templates')
    .ifNotExists()
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

  await db.schema
    .createTable('item_instances')
    .ifNotExists()
    .addColumn('instance_id', 'text', (col) => col.primaryKey())
    .addColumn('template_id', 'text', (col) => col.notNull())
    .addColumn('created', 'text', (col) => col.notNull())
    .addColumn('created_by', 'text', (col) => col.notNull())
    .addColumn('properties', 'text')
    .addColumn('history', 'text')
    .execute();

  await db.schema
    .createTable('npc_templates')
    .ifNotExists()
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
}

/**
 * Clean up test database
 * Call this in afterEach or afterAll hooks
 */
export async function destroyTestDb(): Promise<void> {
  if (testDb) {
    await testDb.destroy();
    testDb = null;
  }
}

/**
 * Create and initialize a test database in one call
 * Convenience function for test setup
 */
export async function setupTestDb(): Promise<Kysely<DatabaseSchema>> {
  const db = createTestDb();
  await initializeTestDb(db);
  return db;
}
