/**
 * Auto-Migration Integration Tests
 *
 * Tests automatic data migration between storage backends:
 * - JSON → PostgreSQL
 * - PostgreSQL → JSON
 * - PostgreSQL → SQLite
 * - SQLite → PostgreSQL
 *
 * Each test uses isolated temporary data directories to avoid
 * modifying real data files.
 *
 * Run with: npm run test:integration -- automigrate
 */

import { Kysely, SqliteDialect, PostgresDialect } from 'kysely';
import Database from 'better-sqlite3';
import { Pool } from 'pg';
import path from 'path';
import fs from 'fs';
import os from 'os';
import type { Database as DatabaseSchema } from '../../src/data/schema';

// Test timeout for database operations
jest.setTimeout(30000);

// PostgreSQL connection string from environment
const POSTGRES_URL =
  process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/ellymud_test';

/**
 * Helper: Check if PostgreSQL is available
 */
async function isPostgresAvailable(): Promise<boolean> {
  try {
    const pool = new Pool({ connectionString: POSTGRES_URL, max: 1 });
    await pool.query('SELECT 1');
    await pool.end();
    return true;
  } catch {
    return false;
  }
}

/**
 * Helper: Create a temporary test data directory with sample JSON data
 */
function createTempDataDir(): {
  dataDir: string;
  cleanup: () => void;
} {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ellymud-automigrate-test-'));

  // Create sample users.json
  const users = [
    {
      username: 'testuser1',
      passwordHash: 'hash123',
      salt: 'salt123',
      health: 100,
      maxHealth: 100,
      mana: 50,
      maxMana: 50,
      experience: 0,
      level: 1,
      strength: 10,
      dexterity: 10,
      agility: 10,
      constitution: 10,
      wisdom: 10,
      intelligence: 10,
      charisma: 10,
      equipment: {},
      joinDate: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      totalPlayTime: 0,
      currentRoomId: 'town_square',
      inventory: { items: [], gold: 100, silver: 50, copper: 25 },
      bank: { gold: 0, silver: 0, copper: 0 },
      inCombat: false,
      isUnconscious: false,
      isResting: false,
      isMeditating: false,
      flags: { admin: false },
      pendingAdminMessages: [],
    },
    {
      username: 'testuser2',
      passwordHash: 'hash456',
      salt: 'salt456',
      health: 80,
      maxHealth: 120,
      mana: 40,
      maxMana: 60,
      experience: 500,
      level: 2,
      strength: 12,
      dexterity: 11,
      agility: 10,
      constitution: 13,
      wisdom: 10,
      intelligence: 9,
      charisma: 10,
      equipment: { mainHand: 'sword_basic' },
      joinDate: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      totalPlayTime: 3600,
      currentRoomId: 'forest_path',
      inventory: { items: ['potion_health'], gold: 50, silver: 0, copper: 0 },
      bank: { gold: 100, silver: 0, copper: 0 },
      inCombat: false,
      isUnconscious: false,
      isResting: true,
      isMeditating: false,
      flags: {},
      pendingAdminMessages: [],
    },
  ];
  fs.writeFileSync(path.join(dataDir, 'users.json'), JSON.stringify(users, null, 2));

  // Create sample rooms.json
  const rooms = [
    {
      id: 'town_square',
      name: 'Town Square',
      description: 'The central square of the town.',
      exits: { north: 'market', south: 'gate', east: 'tavern', west: 'temple' },
      currency: { gold: 0, silver: 0, copper: 0 },
      flags: { safe: true },
      npcs: ['npc_merchant'],
      itemInstances: [],
    },
    {
      id: 'forest_path',
      name: 'Forest Path',
      description: 'A winding path through the forest.',
      exits: { north: 'deep_forest', south: 'town_gate' },
      currency: { gold: 0, silver: 5, copper: 10 },
      flags: {},
      npcs: [],
      itemInstances: ['inst_001'],
    },
  ];
  fs.writeFileSync(path.join(dataDir, 'rooms.json'), JSON.stringify(rooms, null, 2));

  // Create sample items.json
  const items = [
    {
      id: 'sword_basic',
      name: 'Basic Sword',
      description: 'A simple iron sword.',
      type: 'weapon',
      weight: 5,
      value: 50,
      slot: 'mainHand',
      stats: { attack: 5 },
      requirements: { level: 1 },
    },
    {
      id: 'potion_health',
      name: 'Health Potion',
      description: 'Restores 25 health.',
      type: 'consumable',
      weight: 1,
      value: 10,
      slot: null,
      stats: { healAmount: 25 },
      requirements: {},
    },
  ];
  fs.writeFileSync(path.join(dataDir, 'items.json'), JSON.stringify(items, null, 2));

  // Create sample itemInstances.json
  const itemInstances = [
    {
      instanceId: 'inst_001',
      templateId: 'sword_basic',
      created: new Date().toISOString(),
      createdBy: 'system',
      properties: { durability: 100 },
      history: [{ event: 'created', timestamp: new Date().toISOString() }],
    },
  ];
  fs.writeFileSync(path.join(dataDir, 'itemInstances.json'), JSON.stringify(itemInstances, null, 2));

  const cleanup = () => {
    try {
      fs.rmSync(dataDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  };

  return { dataDir, cleanup };
}

/**
 * Helper: Create database schema for testing
 */
async function createDatabaseSchema(db: Kysely<DatabaseSchema>): Promise<void> {
  // Create users table
  await db.schema
    .createTable('users')
    .ifNotExists()
    .addColumn('username', 'text', (col) => col.primaryKey())
    .addColumn('password_hash', 'text', (col) => col.notNull())
    .addColumn('salt', 'text', (col) => col.notNull())
    .addColumn('health', 'integer', (col) => col.notNull().defaultTo(100))
    .addColumn('max_health', 'integer', (col) => col.notNull().defaultTo(100))
    .addColumn('mana', 'integer', (col) => col.notNull().defaultTo(50))
    .addColumn('max_mana', 'integer', (col) => col.notNull().defaultTo(50))
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
    .addColumn('join_date', 'text')
    .addColumn('last_login', 'text')
    .addColumn('total_play_time', 'integer', (col) => col.defaultTo(0))
    .addColumn('current_room_id', 'text')
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

  // Create rooms table
  await db.schema
    .createTable('rooms')
    .ifNotExists()
    .addColumn('id', 'text', (col) => col.primaryKey())
    .addColumn('name', 'text', (col) => col.notNull())
    .addColumn('description', 'text', (col) => col.notNull())
    .addColumn('exits', 'text')
    .addColumn('currency_gold', 'integer', (col) => col.defaultTo(0))
    .addColumn('currency_silver', 'integer', (col) => col.defaultTo(0))
    .addColumn('currency_copper', 'integer', (col) => col.defaultTo(0))
    .addColumn('flags', 'text')
    .addColumn('npc_template_ids', 'text')
    .addColumn('item_instances', 'text')
    .execute();

  // Create item_templates table
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

  // Create item_instances table
  await db.schema
    .createTable('item_instances')
    .ifNotExists()
    .addColumn('instance_id', 'text', (col) => col.primaryKey())
    .addColumn('template_id', 'text', (col) => col.notNull())
    .addColumn('created', 'text', (col) => col.notNull())
    .addColumn('created_by', 'text', (col) => col.notNull())
    .addColumn('properties', 'text')
    .addColumn('history', 'text')
    .addColumn('created_at', 'text')
    .addColumn('updated_at', 'text')
    .execute();
}

/**
 * Helper: Insert test data directly into database
 */
async function insertTestDataToDatabase(db: Kysely<DatabaseSchema>): Promise<void> {
  // Insert users
  await db
    .insertInto('users' as never)
    .values({
      username: 'dbuser1',
      password_hash: 'dbhash123',
      salt: 'dbsalt123',
      health: 95,
      max_health: 110,
      mana: 45,
      max_mana: 55,
      experience: 250,
      level: 2,
      strength: 11,
      dexterity: 10,
      agility: 12,
      constitution: 10,
      wisdom: 9,
      intelligence: 10,
      charisma: 11,
      equipment: JSON.stringify({ mainHand: 'db_sword' }),
      join_date: new Date().toISOString(),
      last_login: new Date().toISOString(),
      total_play_time: 1800,
      current_room_id: 'db_room_1',
      inventory_items: JSON.stringify(['db_potion']),
      inventory_gold: 75,
      inventory_silver: 30,
      inventory_copper: 15,
      bank_gold: 50,
      bank_silver: 25,
      bank_copper: 10,
      in_combat: 0,
      is_unconscious: 0,
      is_resting: 0,
      is_meditating: 1,
      flags: JSON.stringify({ admin: true }),
      pending_admin_messages: JSON.stringify([]),
    } as never)
    .execute();

  // Insert rooms
  await db
    .insertInto('rooms' as never)
    .values({
      id: 'db_room_1',
      name: 'Database Room',
      description: 'A room created in the database.',
      exits: JSON.stringify({ north: 'db_room_2' }),
      currency_gold: 10,
      currency_silver: 5,
      currency_copper: 2,
      flags: JSON.stringify({ dark: true }),
      npc_template_ids: JSON.stringify(['db_npc']),
      item_instances: JSON.stringify(['db_inst_001']),
    } as never)
    .execute();

  // Insert item templates
  await db
    .insertInto('item_templates' as never)
    .values({
      id: 'db_sword',
      name: 'Database Sword',
      description: 'A sword from the database.',
      type: 'weapon',
      slot: 'mainHand',
      value: 75,
      weight: 6,
      stats: JSON.stringify({ attack: 8 }),
      requirements: JSON.stringify({ level: 2 }),
    } as never)
    .execute();

  // Insert item instances
  await db
    .insertInto('item_instances' as never)
    .values({
      instance_id: 'db_inst_001',
      template_id: 'db_sword',
      created: new Date().toISOString(),
      created_by: 'database',
      properties: JSON.stringify({ enchanted: true }),
      history: JSON.stringify([{ event: 'db_created' }]),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as never)
    .execute();
}

/**
 * Helper: Read JSON file safely
 */
function readJsonFile<T>(filePath: string): T | null {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

describe('Auto-Migration Integration Tests', () => {
  let postgresAvailable: boolean;

  beforeAll(async () => {
    postgresAvailable = await isPostgresAvailable();
    if (!postgresAvailable) {
      console.warn(
        'PostgreSQL not available - some tests will be skipped. Run with docker-compose for full tests.'
      );
    }
  });

  describe('JSON → SQLite Migration', () => {
    let dataDir: string;
    let cleanup: () => void;
    let db: Kysely<DatabaseSchema>;
    let sqliteDb: Database.Database;

    beforeEach(async () => {
      const temp = createTempDataDir();
      dataDir = temp.dataDir;
      cleanup = temp.cleanup;

      // Create SQLite database
      const dbPath = path.join(dataDir, 'game.db');
      sqliteDb = new Database(dbPath);
      db = new Kysely<DatabaseSchema>({
        dialect: new SqliteDialect({ database: sqliteDb }),
      });
      await createDatabaseSchema(db);
    });

    afterEach(async () => {
      if (db) await db.destroy();
      cleanup();
    });

    it('should import users from JSON to SQLite', async () => {
      // Read original JSON
      const jsonUsers = readJsonFile<Array<{ username: string }>>(
        path.join(dataDir, 'users.json')
      );
      expect(jsonUsers).toHaveLength(2);

      // Import JSON data to SQLite (simulating what autoMigrate does)
      for (const user of jsonUsers || []) {
        await db
          .insertInto('users' as never)
          .values({
            username: user.username,
            password_hash: 'imported',
            salt: 'imported',
            health: 100,
            max_health: 100,
            mana: 50,
            max_mana: 50,
            experience: 0,
            level: 1,
            strength: 10,
            dexterity: 10,
            agility: 10,
            constitution: 10,
            wisdom: 10,
            intelligence: 10,
            charisma: 10,
          } as never)
          .execute();
      }

      // Verify data in SQLite
      const dbUsers = await db.selectFrom('users' as never).selectAll().execute() as Array<{ username: string }>;
      expect(dbUsers).toHaveLength(2);
      expect(dbUsers.map((u) => u.username).sort()).toEqual([
        'testuser1',
        'testuser2',
      ]);
    });

    it('should import rooms from JSON to SQLite', async () => {
      const jsonRooms = readJsonFile<Array<{ id: string; name: string }>>(
        path.join(dataDir, 'rooms.json')
      );
      expect(jsonRooms).toHaveLength(2);

      // Import rooms
      for (const room of jsonRooms || []) {
        await db
          .insertInto('rooms' as never)
          .values({
            id: room.id,
            name: room.name,
            description: 'Imported',
          } as never)
          .execute();
      }

      // Verify
      const dbRooms = await db.selectFrom('rooms' as never).selectAll().execute() as Array<{ id: string }>;
      expect(dbRooms).toHaveLength(2);
      expect(dbRooms.map((r) => r.id).sort()).toEqual([
        'forest_path',
        'town_square',
      ]);
    });

    it('should import items from JSON to SQLite', async () => {
      const jsonItems = readJsonFile<Array<{ id: string }>>(path.join(dataDir, 'items.json'));
      expect(jsonItems).toHaveLength(2);

      for (const item of jsonItems || []) {
        await db
          .insertInto('item_templates' as never)
          .values({
            id: item.id,
            name: 'Imported',
            description: 'Imported',
            type: 'weapon',
            value: 0,
          } as never)
          .execute();
      }

      const dbItems = await db.selectFrom('item_templates' as never).selectAll().execute();
      expect(dbItems).toHaveLength(2);
    });
  });

  describe('SQLite → JSON Migration', () => {
    let dataDir: string;
    let cleanup: () => void;
    let db: Kysely<DatabaseSchema>;
    let sqliteDb: Database.Database;

    beforeEach(async () => {
      const temp = createTempDataDir();
      dataDir = temp.dataDir;
      cleanup = temp.cleanup;

      // Remove existing JSON files to test export
      fs.unlinkSync(path.join(dataDir, 'users.json'));
      fs.unlinkSync(path.join(dataDir, 'rooms.json'));
      fs.unlinkSync(path.join(dataDir, 'items.json'));
      fs.unlinkSync(path.join(dataDir, 'itemInstances.json'));

      // Create SQLite with test data
      const dbPath = path.join(dataDir, 'game.db');
      sqliteDb = new Database(dbPath);
      db = new Kysely<DatabaseSchema>({
        dialect: new SqliteDialect({ database: sqliteDb }),
      });
      await createDatabaseSchema(db);
      await insertTestDataToDatabase(db);
    });

    afterEach(async () => {
      if (db) await db.destroy();
      cleanup();
    });

    it('should export users from SQLite to JSON', async () => {
      // Read from database
      const dbUsers = await db.selectFrom('users' as never).selectAll().execute();
      expect(dbUsers).toHaveLength(1);

      // Simulate export (what exportDatabaseToJson does)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const users = dbUsers.map((row: any) => ({
        username: row.username,
        passwordHash: row.password_hash,
        health: row.health,
        level: row.level,
      }));
      fs.writeFileSync(path.join(dataDir, 'users.json'), JSON.stringify(users, null, 2));

      // Verify JSON was created
      const jsonUsers = readJsonFile<Array<{ username: string }>>(
        path.join(dataDir, 'users.json')
      );
      expect(jsonUsers).toHaveLength(1);
      expect(jsonUsers?.[0].username).toBe('dbuser1');
    });

    it('should export rooms from SQLite to JSON', async () => {
      const dbRooms = await db.selectFrom('rooms' as never).selectAll().execute();
      expect(dbRooms).toHaveLength(1);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rooms = dbRooms.map((row: any) => ({
        id: row.id,
        name: row.name,
        description: row.description,
      }));
      fs.writeFileSync(path.join(dataDir, 'rooms.json'), JSON.stringify(rooms, null, 2));

      const jsonRooms = readJsonFile<Array<{ id: string }>>(path.join(dataDir, 'rooms.json'));
      expect(jsonRooms).toHaveLength(1);
      expect(jsonRooms?.[0].id).toBe('db_room_1');
    });

    it('should export item instances from SQLite to JSON', async () => {
      const dbInstances = await db.selectFrom('item_instances' as never).selectAll().execute();
      expect(dbInstances).toHaveLength(1);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const instances = dbInstances.map((row: any) => ({
        instanceId: row.instance_id,
        templateId: row.template_id,
      }));
      fs.writeFileSync(path.join(dataDir, 'itemInstances.json'), JSON.stringify(instances, null, 2));

      const jsonInstances = readJsonFile<Array<{ instanceId: string }>>(
        path.join(dataDir, 'itemInstances.json')
      );
      expect(jsonInstances).toHaveLength(1);
      expect(jsonInstances?.[0].instanceId).toBe('db_inst_001');
    });
  });

  describe('PostgreSQL → JSON Migration', () => {
    let dataDir: string;
    let cleanup: () => void;
    let db: Kysely<DatabaseSchema>;
    let pool: Pool;

    beforeAll(async function () {
      if (!postgresAvailable) {
        console.warn('Skipping PostgreSQL tests - database not available');
      }
    });

    beforeEach(async () => {
      if (!postgresAvailable) return;

      const temp = createTempDataDir();
      dataDir = temp.dataDir;
      cleanup = temp.cleanup;

      // Remove existing JSON files
      fs.unlinkSync(path.join(dataDir, 'users.json'));
      fs.unlinkSync(path.join(dataDir, 'rooms.json'));
      fs.unlinkSync(path.join(dataDir, 'items.json'));
      fs.unlinkSync(path.join(dataDir, 'itemInstances.json'));

      // Create PostgreSQL connection with test data
      pool = new Pool({ connectionString: POSTGRES_URL, max: 5 });
      db = new Kysely<DatabaseSchema>({
        dialect: new PostgresDialect({ pool }),
      });

      // Drop and recreate tables for clean test
      await db.schema.dropTable('item_instances').ifExists().execute();
      await db.schema.dropTable('item_templates').ifExists().execute();
      await db.schema.dropTable('rooms').ifExists().execute();
      await db.schema.dropTable('users').ifExists().execute();

      await createDatabaseSchema(db);
      await insertTestDataToDatabase(db);
    });

    afterEach(async () => {
      if (!postgresAvailable) return;
      if (db) await db.destroy();
      cleanup();
    });

    it('should export users from PostgreSQL to JSON', async () => {
      if (!postgresAvailable) return;

      const dbUsers = await db.selectFrom('users' as never).selectAll().execute();
      expect(dbUsers).toHaveLength(1);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const users = dbUsers.map((row: any) => ({
        username: row.username,
        passwordHash: row.password_hash,
        health: row.health,
        level: row.level,
        flags: JSON.parse(row.flags || '{}'),
      }));
      fs.writeFileSync(path.join(dataDir, 'users.json'), JSON.stringify(users, null, 2));

      const jsonUsers = readJsonFile<Array<{ username: string; flags: { admin: boolean } }>>(
        path.join(dataDir, 'users.json')
      );
      expect(jsonUsers).toHaveLength(1);
      expect(jsonUsers?.[0].username).toBe('dbuser1');
      expect(jsonUsers?.[0].flags.admin).toBe(true);
    });

    it('should export rooms from PostgreSQL to JSON', async () => {
      if (!postgresAvailable) return;

      const dbRooms = await db.selectFrom('rooms' as never).selectAll().execute();
      expect(dbRooms).toHaveLength(1);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rooms = dbRooms.map((row: any) => ({
        id: row.id,
        name: row.name,
        exits: JSON.parse(row.exits || '{}'),
        flags: JSON.parse(row.flags || '{}'),
      }));
      fs.writeFileSync(path.join(dataDir, 'rooms.json'), JSON.stringify(rooms, null, 2));

      const jsonRooms = readJsonFile<Array<{ id: string; flags: { dark: boolean } }>>(
        path.join(dataDir, 'rooms.json')
      );
      expect(jsonRooms).toHaveLength(1);
      expect(jsonRooms?.[0].id).toBe('db_room_1');
      expect(jsonRooms?.[0].flags.dark).toBe(true);
    });
  });

  describe('JSON → PostgreSQL Migration', () => {
    let dataDir: string;
    let cleanup: () => void;
    let db: Kysely<DatabaseSchema>;
    let pool: Pool;

    beforeEach(async () => {
      if (!postgresAvailable) return;

      const temp = createTempDataDir();
      dataDir = temp.dataDir;
      cleanup = temp.cleanup;

      // Create PostgreSQL connection
      pool = new Pool({ connectionString: POSTGRES_URL, max: 5 });
      db = new Kysely<DatabaseSchema>({
        dialect: new PostgresDialect({ pool }),
      });

      // Drop and recreate tables for clean test
      await db.schema.dropTable('item_instances').ifExists().execute();
      await db.schema.dropTable('item_templates').ifExists().execute();
      await db.schema.dropTable('rooms').ifExists().execute();
      await db.schema.dropTable('users').ifExists().execute();

      await createDatabaseSchema(db);
    });

    afterEach(async () => {
      if (!postgresAvailable) return;
      if (db) await db.destroy();
      cleanup();
    });

    it('should import users from JSON to PostgreSQL', async () => {
      if (!postgresAvailable) return;

      // Read JSON
      const jsonUsers = readJsonFile<
        Array<{
          username: string;
          passwordHash: string;
          salt: string;
          health: number;
          level: number;
        }>
      >(path.join(dataDir, 'users.json'));
      expect(jsonUsers).toHaveLength(2);

      // Import to PostgreSQL
      for (const user of jsonUsers || []) {
        await db
          .insertInto('users' as never)
          .values({
            username: user.username,
            password_hash: user.passwordHash,
            salt: user.salt,
            health: user.health,
            max_health: 100,
            mana: 50,
            max_mana: 50,
            experience: 0,
            level: user.level,
            strength: 10,
            dexterity: 10,
            agility: 10,
            constitution: 10,
            wisdom: 10,
            intelligence: 10,
            charisma: 10,
          } as never)
          .execute();
      }

      // Verify
      const dbUsers = await db.selectFrom('users' as never).selectAll().execute() as Array<{ username: string }>;
      expect(dbUsers).toHaveLength(2);
      expect(dbUsers.map((u) => u.username).sort()).toEqual([
        'testuser1',
        'testuser2',
      ]);
    });

    it('should import rooms from JSON to PostgreSQL with all fields', async () => {
      if (!postgresAvailable) return;

      interface JsonRoom {
        id: string;
        name: string;
        description: string;
        exits: Record<string, string>;
        currency: { gold: number; silver: number; copper: number };
        flags: Record<string, boolean>;
        npcs: string[];
        itemInstances: string[];
      }
      const jsonRooms = readJsonFile<JsonRoom[]>(path.join(dataDir, 'rooms.json'));
      expect(jsonRooms).toHaveLength(2);

      for (const room of jsonRooms || []) {
        await db
          .insertInto('rooms' as never)
          .values({
            id: room.id,
            name: room.name,
            description: room.description,
            exits: JSON.stringify(room.exits),
            currency_gold: room.currency?.gold ?? 0,
            currency_silver: room.currency?.silver ?? 0,
            currency_copper: room.currency?.copper ?? 0,
            flags: JSON.stringify(room.flags || {}),
            npc_template_ids: JSON.stringify(room.npcs || []),
            item_instances: JSON.stringify(room.itemInstances || []),
          } as never)
          .execute();
      }

      const dbRooms = await db.selectFrom('rooms' as never).selectAll().execute() as Array<{ id: string; name: string; flags: string }>;
      expect(dbRooms).toHaveLength(2);

      // Verify data integrity
      const townSquare = dbRooms.find((r) => r.id === 'town_square');
      expect(townSquare).toBeDefined();
      expect(townSquare!.name).toBe('Town Square');
      expect(JSON.parse(townSquare!.flags)).toEqual({ safe: true });
    });

    it('should import item templates from JSON to PostgreSQL', async () => {
      if (!postgresAvailable) return;

      interface JsonItem {
        id: string;
        name: string;
        description: string;
        type: string;
        weight: number;
        value: number;
        slot: string | null;
        stats: Record<string, number>;
        requirements: Record<string, number>;
      }
      const jsonItems = readJsonFile<JsonItem[]>(path.join(dataDir, 'items.json'));
      expect(jsonItems).toHaveLength(2);

      for (const item of jsonItems || []) {
        await db
          .insertInto('item_templates' as never)
          .values({
            id: item.id,
            name: item.name,
            description: item.description,
            type: item.type,
            slot: item.slot,
            value: item.value,
            weight: item.weight,
            stats: JSON.stringify(item.stats || {}),
            requirements: JSON.stringify(item.requirements || {}),
          } as never)
          .execute();
      }

      const dbItems = await db.selectFrom('item_templates' as never).selectAll().execute() as Array<{ id: string; name: string; value: number; stats: string }>;
      expect(dbItems).toHaveLength(2);

      const sword = dbItems.find((i) => i.id === 'sword_basic');
      expect(sword).toBeDefined();
      expect(sword!.name).toBe('Basic Sword');
      expect(sword!.value).toBe(50);
      expect(JSON.parse(sword!.stats)).toEqual({ attack: 5 });
    });
  });

  describe('Cross-Database Migration (SQLite ↔ PostgreSQL)', () => {
    let dataDir: string;
    let cleanup: () => void;
    let sqliteDb: Kysely<DatabaseSchema>;
    let pgDb: Kysely<DatabaseSchema>;
    let sqliteConn: Database.Database;
    let pool: Pool;

    beforeEach(async () => {
      if (!postgresAvailable) return;

      const temp = createTempDataDir();
      dataDir = temp.dataDir;
      cleanup = temp.cleanup;

      // Create SQLite database
      const dbPath = path.join(dataDir, 'game.db');
      sqliteConn = new Database(dbPath);
      sqliteDb = new Kysely<DatabaseSchema>({
        dialect: new SqliteDialect({ database: sqliteConn }),
      });
      await createDatabaseSchema(sqliteDb);

      // Create PostgreSQL connection
      pool = new Pool({ connectionString: POSTGRES_URL, max: 5 });
      pgDb = new Kysely<DatabaseSchema>({
        dialect: new PostgresDialect({ pool }),
      });

      // Clean PostgreSQL tables
      await pgDb.schema.dropTable('item_instances').ifExists().execute();
      await pgDb.schema.dropTable('item_templates').ifExists().execute();
      await pgDb.schema.dropTable('rooms').ifExists().execute();
      await pgDb.schema.dropTable('users').ifExists().execute();
      await createDatabaseSchema(pgDb);
    });

    afterEach(async () => {
      if (!postgresAvailable) return;
      if (sqliteDb) await sqliteDb.destroy();
      if (pgDb) await pgDb.destroy();
      cleanup();
    });

    it('should migrate data from SQLite to PostgreSQL via JSON intermediate', async () => {
      if (!postgresAvailable) return;

      // Step 1: Insert data into SQLite
      await insertTestDataToDatabase(sqliteDb);

      // Verify SQLite has data
      const sqliteUsers = await sqliteDb.selectFrom('users' as never).selectAll().execute();
      expect(sqliteUsers).toHaveLength(1);

      // Step 2: Export SQLite to JSON (simulating exportDatabaseToJson)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const users = sqliteUsers.map((row: any) => ({
        username: row.username,
        passwordHash: row.password_hash,
        salt: row.salt,
        health: row.health,
        maxHealth: row.max_health,
        level: row.level,
      }));
      fs.writeFileSync(path.join(dataDir, 'users.json'), JSON.stringify(users, null, 2));

      // Step 3: Import JSON to PostgreSQL (simulating importJsonToDatabase)
      const jsonUsers = readJsonFile<
        Array<{
          username: string;
          passwordHash: string;
          salt: string;
          health: number;
          maxHealth: number;
          level: number;
        }>
      >(path.join(dataDir, 'users.json'));

      for (const user of jsonUsers || []) {
        await pgDb
          .insertInto('users' as never)
          .values({
            username: user.username,
            password_hash: user.passwordHash,
            salt: user.salt,
            health: user.health,
            max_health: user.maxHealth,
            level: user.level,
            mana: 50,
            max_mana: 50,
            experience: 0,
            strength: 10,
            dexterity: 10,
            agility: 10,
            constitution: 10,
            wisdom: 10,
            intelligence: 10,
            charisma: 10,
          } as never)
          .execute();
      }

      // Verify PostgreSQL has the migrated data
      const pgUsers = await pgDb.selectFrom('users' as never).selectAll().execute();
      expect(pgUsers).toHaveLength(1);
      expect((pgUsers[0] as { username: string }).username).toBe('dbuser1');
    });

    it('should migrate data from PostgreSQL to SQLite via JSON intermediate', async () => {
      if (!postgresAvailable) return;

      // Step 1: Insert data into PostgreSQL
      await insertTestDataToDatabase(pgDb);

      // Verify PostgreSQL has data
      const pgRooms = await pgDb.selectFrom('rooms' as never).selectAll().execute();
      expect(pgRooms).toHaveLength(1);

      // Step 2: Export PostgreSQL to JSON
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rooms = pgRooms.map((row: any) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        exits: JSON.parse(row.exits || '{}'),
      }));
      fs.writeFileSync(path.join(dataDir, 'rooms.json'), JSON.stringify(rooms, null, 2));

      // Step 3: Import JSON to SQLite
      interface ExportedRoom {
        id: string;
        name: string;
        description: string;
        exits: Record<string, string>;
      }
      const jsonRooms = readJsonFile<ExportedRoom[]>(path.join(dataDir, 'rooms.json'));

      for (const room of jsonRooms || []) {
        await sqliteDb
          .insertInto('rooms' as never)
          .values({
            id: room.id,
            name: room.name,
            description: room.description,
            exits: JSON.stringify(room.exits),
          } as never)
          .execute();
      }

      // Verify SQLite has the migrated data
      const sqliteRooms = await sqliteDb.selectFrom('rooms' as never).selectAll().execute();
      expect(sqliteRooms).toHaveLength(1);
      expect((sqliteRooms[0] as { id: string }).id).toBe('db_room_1');
    });

    it('should preserve complex data during cross-database migration', async () => {
      if (!postgresAvailable) return;

      // Insert item with complex properties
      await pgDb
        .insertInto('item_instances' as never)
        .values({
          instance_id: 'complex_inst',
          template_id: 'magic_sword',
          created: new Date().toISOString(),
          created_by: 'wizard',
          properties: JSON.stringify({
            enchantments: ['fire', 'ice'],
            durability: { current: 85, max: 100 },
            soulbound: true,
          }),
          history: JSON.stringify([
            { event: 'created', by: 'wizard', at: '2025-01-01' },
            { event: 'enchanted', by: 'mage', at: '2025-01-02' },
          ]),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as never)
        .execute();

      // Export to JSON
      const pgInstances = await pgDb.selectFrom('item_instances' as never).selectAll().execute();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const instances = pgInstances.map((row: any) => ({
        instanceId: row.instance_id,
        templateId: row.template_id,
        created: row.created,
        createdBy: row.created_by,
        properties: JSON.parse(row.properties || '{}'),
        history: JSON.parse(row.history || '[]'),
      }));
      fs.writeFileSync(path.join(dataDir, 'itemInstances.json'), JSON.stringify(instances, null, 2));

      // Import to SQLite
      interface ExportedInstance {
        instanceId: string;
        templateId: string;
        created: string;
        createdBy: string;
        properties: {
          enchantments: string[];
          durability: { current: number; max: number };
          soulbound: boolean;
        };
        history: Array<{ event: string; by: string; at: string }>;
      }
      const jsonInstances = readJsonFile<ExportedInstance[]>(
        path.join(dataDir, 'itemInstances.json')
      );

      for (const inst of jsonInstances || []) {
        await sqliteDb
          .insertInto('item_instances' as never)
          .values({
            instance_id: inst.instanceId,
            template_id: inst.templateId,
            created: inst.created,
            created_by: inst.createdBy,
            properties: JSON.stringify(inst.properties),
            history: JSON.stringify(inst.history),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as never)
          .execute();
      }

      // Verify complex data preserved
      const sqliteInstances = await sqliteDb
        .selectFrom('item_instances' as never)
        .selectAll()
        .execute();
      expect(sqliteInstances).toHaveLength(1);

      const inst = sqliteInstances[0] as { properties: string; history: string };
      const props = JSON.parse(inst.properties);
      expect(props.enchantments).toEqual(['fire', 'ice']);
      expect(props.durability.current).toBe(85);
      expect(props.soulbound).toBe(true);

      const history = JSON.parse(inst.history);
      expect(history).toHaveLength(2);
      expect(history[0].event).toBe('created');
    });
  });
});
