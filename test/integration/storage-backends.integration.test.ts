/**
 * Storage Backend Integration Tests
 *
 * Tests the storage backend abstraction across different backends:
 * - JSON flat files
 * - SQLite
 * - PostgreSQL
 *
 * Run with: npm run test:integration
 */

import { Kysely, SqliteDialect, PostgresDialect } from 'kysely';
import Database from 'better-sqlite3';
import { Pool } from 'pg';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { Database as DatabaseSchema, UsersTable, RoomsTable } from '../../src/data/schema';

// Test data
const testUser: Omit<UsersTable, 'username'> & { username: string } = {
  username: 'integration_test_user',
  password_hash: 'testhash123',
  salt: 'testsalt123',
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
  equipment: null,
  join_date: new Date().toISOString(),
  last_login: new Date().toISOString(),
  total_play_time: 0,
  current_room_id: 'start',
  inventory_items: null,
  inventory_gold: 0,
  inventory_silver: 0,
  inventory_copper: 0,
  bank_gold: 0,
  bank_silver: 0,
  bank_copper: 0,
  in_combat: 0,
  is_unconscious: 0,
  is_resting: 0,
  is_meditating: 0,
  flags: null,
  pending_admin_messages: null,
  email: null,
  description: null,
};

const testRoom: RoomsTable = {
  id: 'integration_test_room',
  name: 'Test Room',
  description: 'A room for integration testing',
  exits: JSON.stringify([{ direction: 'north', targetRoomId: 'start' }]),
  currency_gold: 0,
  currency_silver: 0,
  currency_copper: 0,
  flags: null,
  npc_template_ids: null,
  item_instances: null,
};

/**
 * Creates table schema (same as db.ts initializeDatabase)
 */
async function createTables(db: Kysely<DatabaseSchema>): Promise<void> {
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
}

/**
 * Runs CRUD operations test against a database
 */
async function runCrudTests(db: Kysely<DatabaseSchema>, backendName: string): Promise<void> {
  // Clean up any existing test data
  await db.deleteFrom('users').where('username', '=', testUser.username).execute();
  await db.deleteFrom('rooms').where('id', '=', testRoom.id).execute();

  // Test INSERT
  await db.insertInto('users').values(testUser).execute();
  await db.insertInto('rooms').values(testRoom).execute();

  // Test SELECT
  const user = await db
    .selectFrom('users')
    .selectAll()
    .where('username', '=', testUser.username)
    .executeTakeFirst();

  expect(user).toBeDefined();
  expect(user?.username).toBe(testUser.username);
  expect(user?.health).toBe(testUser.health);
  expect(user?.level).toBe(testUser.level);

  const room = await db
    .selectFrom('rooms')
    .selectAll()
    .where('id', '=', testRoom.id)
    .executeTakeFirst();

  expect(room).toBeDefined();
  expect(room?.id).toBe(testRoom.id);
  expect(room?.name).toBe(testRoom.name);

  // Test UPDATE
  await db
    .updateTable('users')
    .set({ level: 5, experience: 1000 })
    .where('username', '=', testUser.username)
    .execute();

  const updatedUser = await db
    .selectFrom('users')
    .selectAll()
    .where('username', '=', testUser.username)
    .executeTakeFirst();

  expect(updatedUser?.level).toBe(5);
  expect(updatedUser?.experience).toBe(1000);

  // Test UPSERT (insert on conflict)
  const upsertUser = { ...testUser, level: 10 };
  await db
    .insertInto('users')
    .values(upsertUser)
    .onConflict((oc) => oc.column('username').doUpdateSet({ level: 10 }))
    .execute();

  const upsertedUser = await db
    .selectFrom('users')
    .selectAll()
    .where('username', '=', testUser.username)
    .executeTakeFirst();

  expect(upsertedUser?.level).toBe(10);

  // Test DELETE
  await db.deleteFrom('users').where('username', '=', testUser.username).execute();
  await db.deleteFrom('rooms').where('id', '=', testRoom.id).execute();

  const deletedUser = await db
    .selectFrom('users')
    .selectAll()
    .where('username', '=', testUser.username)
    .executeTakeFirst();

  expect(deletedUser).toBeUndefined();

  console.log(`✅ ${backendName}: All CRUD operations passed`);
}

/**
 * Test transaction support
 */
async function runTransactionTest(db: Kysely<DatabaseSchema>, backendName: string): Promise<void> {
  // Clean up first
  await db.deleteFrom('users').where('username', 'like', 'tx_test_%').execute();

  // Test successful transaction
  await db.transaction().execute(async (trx) => {
    await trx
      .insertInto('users')
      .values({ ...testUser, username: 'tx_test_1' })
      .execute();
    await trx
      .insertInto('users')
      .values({ ...testUser, username: 'tx_test_2' })
      .execute();
  });

  const txUsers = await db
    .selectFrom('users')
    .selectAll()
    .where('username', 'like', 'tx_test_%')
    .execute();

  expect(txUsers.length).toBe(2);

  // Clean up
  await db.deleteFrom('users').where('username', 'like', 'tx_test_%').execute();

  console.log(`✅ ${backendName}: Transaction test passed`);
}

// ============================================================================
// SQLite Tests
// ============================================================================

describe('SQLite Storage Backend', () => {
  let db: Kysely<DatabaseSchema>;
  let tempDbPath: string;

  beforeAll(async () => {
    // Create temp database file
    tempDbPath = path.join(os.tmpdir(), `ellymud-test-${Date.now()}.db`);
    const sqliteDb = new Database(tempDbPath);
    db = new Kysely<DatabaseSchema>({
      dialect: new SqliteDialect({ database: sqliteDb }),
    });
    await createTables(db);
  });

  afterAll(async () => {
    await db.destroy();
    // Clean up temp file
    if (fs.existsSync(tempDbPath)) {
      fs.unlinkSync(tempDbPath);
    }
  });

  it('should perform CRUD operations', async () => {
    await runCrudTests(db, 'SQLite');
  });

  it('should support transactions', async () => {
    await runTransactionTest(db, 'SQLite');
  });

  it('should handle JSON serialization in text columns', async () => {
    const jsonData = { items: ['sword', 'shield'], nested: { value: 123 } };
    const username = 'json_test_user';

    await db.deleteFrom('users').where('username', '=', username).execute();

    await db
      .insertInto('users')
      .values({
        ...testUser,
        username,
        equipment: JSON.stringify(jsonData),
        inventory_items: JSON.stringify(['item1', 'item2']),
      })
      .execute();

    const user = await db
      .selectFrom('users')
      .selectAll()
      .where('username', '=', username)
      .executeTakeFirst();

    expect(user?.equipment).toBe(JSON.stringify(jsonData));
    const parsed = JSON.parse(user!.equipment!);
    expect(parsed.items).toContain('sword');

    await db.deleteFrom('users').where('username', '=', username).execute();

    console.log('✅ SQLite: JSON serialization test passed');
  });
});

// ============================================================================
// PostgreSQL Tests (conditional - only run if DATABASE_URL is set)
// ============================================================================

const POSTGRES_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;

const describePostgres = POSTGRES_URL ? describe : describe.skip;

describePostgres('PostgreSQL Storage Backend', () => {
  let db: Kysely<DatabaseSchema>;
  let pool: Pool;

  beforeAll(async () => {
    pool = new Pool({
      connectionString: POSTGRES_URL,
      max: 5,
    });

    db = new Kysely<DatabaseSchema>({
      dialect: new PostgresDialect({ pool }),
    });

    // Drop tables first for clean state (test database only!)
    await db.schema.dropTable('users').ifExists().execute();
    await db.schema.dropTable('rooms').ifExists().execute();

    await createTables(db);
  });

  afterAll(async () => {
    // Clean up test tables
    await db.schema.dropTable('users').ifExists().execute();
    await db.schema.dropTable('rooms').ifExists().execute();
    // db.destroy() also closes the pool, so no need to call pool.end()
    await db.destroy();
  });

  it('should perform CRUD operations', async () => {
    await runCrudTests(db, 'PostgreSQL');
  });

  it('should support transactions', async () => {
    await runTransactionTest(db, 'PostgreSQL');
  });

  it('should handle JSON serialization in text columns', async () => {
    const jsonData = { items: ['sword', 'shield'], nested: { value: 123 } };
    const username = 'json_test_user_pg';

    await db.deleteFrom('users').where('username', '=', username).execute();

    await db
      .insertInto('users')
      .values({
        ...testUser,
        username,
        equipment: JSON.stringify(jsonData),
        inventory_items: JSON.stringify(['item1', 'item2']),
      })
      .execute();

    const user = await db
      .selectFrom('users')
      .selectAll()
      .where('username', '=', username)
      .executeTakeFirst();

    expect(user?.equipment).toBe(JSON.stringify(jsonData));
    const parsed = JSON.parse(user!.equipment!);
    expect(parsed.items).toContain('sword');

    await db.deleteFrom('users').where('username', '=', username).execute();

    console.log('✅ PostgreSQL: JSON serialization test passed');
  });
});

// ============================================================================
// JSON File Backend Tests
// ============================================================================

describe('JSON File Storage Backend', () => {
  let tempDir: string;
  let usersFile: string;
  let roomsFile: string;

  beforeAll(() => {
    tempDir = path.join(os.tmpdir(), `ellymud-json-test-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });
    usersFile = path.join(tempDir, 'users.json');
    roomsFile = path.join(tempDir, 'rooms.json');
  });

  afterAll(() => {
    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
  });

  it('should write and read users JSON file', () => {
    const users = [
      {
        username: 'test1',
        passwordHash: 'hash1',
        salt: 'salt1',
        health: 100,
        maxHealth: 100,
        mana: 50,
        maxMana: 50,
        level: 1,
        experience: 0,
      },
      {
        username: 'test2',
        passwordHash: 'hash2',
        salt: 'salt2',
        health: 80,
        maxHealth: 100,
        mana: 30,
        maxMana: 50,
        level: 5,
        experience: 1000,
      },
    ];

    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
    const loaded = JSON.parse(fs.readFileSync(usersFile, 'utf8'));

    expect(loaded).toHaveLength(2);
    expect(loaded[0].username).toBe('test1');
    expect(loaded[1].level).toBe(5);

    console.log('✅ JSON: Users file read/write test passed');
  });

  it('should write and read rooms JSON file', () => {
    const rooms = [
      {
        id: 'start',
        name: 'Starting Room',
        description: 'You are in the starting room.',
        exits: [{ direction: 'north', targetRoomId: 'room2' }],
      },
      {
        id: 'room2',
        name: 'Second Room',
        description: 'This is the second room.',
        exits: [{ direction: 'south', targetRoomId: 'start' }],
      },
    ];

    fs.writeFileSync(roomsFile, JSON.stringify(rooms, null, 2));
    const loaded = JSON.parse(fs.readFileSync(roomsFile, 'utf8'));

    expect(loaded).toHaveLength(2);
    expect(loaded[0].id).toBe('start');
    expect(loaded[1].exits[0].direction).toBe('south');

    console.log('✅ JSON: Rooms file read/write test passed');
  });

  it('should handle atomic file updates', () => {
    const users = [{ username: 'atomic_test', level: 1 }];

    // Simulate atomic write (write to temp, then rename)
    const tempFile = `${usersFile}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(users));
    fs.renameSync(tempFile, usersFile);

    const loaded = JSON.parse(fs.readFileSync(usersFile, 'utf8'));
    expect(loaded[0].username).toBe('atomic_test');

    console.log('✅ JSON: Atomic file update test passed');
  });
});
