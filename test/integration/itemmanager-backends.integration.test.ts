/**
 * ItemManager Storage Backend Integration Tests
 *
 * Tests ItemManager persistence across different backends:
 * - JSON flat files
 * - SQLite
 * - PostgreSQL
 *
 * Run with: npm run test:integration -- --with-postgres
 */

import { Kysely, SqliteDialect, PostgresDialect } from 'kysely';
import Database from 'better-sqlite3';
import { Pool } from 'pg';
import path from 'path';
import fs from 'fs';
import os from 'os';
import {
  Database as DatabaseSchema,
  ItemTemplatesTable,
  ItemInstancesTable,
} from '../../src/data/schema';
import { EquipmentSlot } from '../../src/types';

// Test data for item templates
const testItemTemplate: ItemTemplatesTable = {
  id: 'integration_test_sword',
  name: 'Test Sword',
  description: 'A sword for integration testing',
  type: 'weapon',
  slot: EquipmentSlot.MAIN_HAND,
  value: 100,
  weight: 5,
  global_limit: null,
  stats: JSON.stringify({ attack: 10, strength: 2 }),
  requirements: JSON.stringify({ level: 1, strength: 5 }),
};

const testItemTemplate2: ItemTemplatesTable = {
  id: 'integration_test_shield',
  name: 'Test Shield',
  description: 'A shield for integration testing',
  type: 'armor',
  slot: EquipmentSlot.OFF_HAND,
  value: 75,
  weight: 4,
  global_limit: 10,
  stats: JSON.stringify({ defense: 5 }),
  requirements: null,
};

// Test data for item instances
const testItemInstance: ItemInstancesTable = {
  instance_id: 'inst_integration_test_001',
  template_id: 'integration_test_sword',
  created: new Date().toISOString(),
  created_by: 'integration_tester',
  properties: JSON.stringify({ enchanted: true, durability: 100 }),
  history: JSON.stringify([
    { timestamp: new Date().toISOString(), event: 'created', details: 'Integration test' },
  ]),
};

const testItemInstance2: ItemInstancesTable = {
  instance_id: 'inst_integration_test_002',
  template_id: 'integration_test_shield',
  created: new Date().toISOString(),
  created_by: 'integration_tester',
  properties: null,
  history: null,
};

/**
 * Creates item tables schema (same as db.ts initializeDatabase)
 */
async function createItemTables(db: Kysely<DatabaseSchema>): Promise<void> {
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
}

/**
 * Runs item template CRUD operations test against a database
 */
async function runItemTemplateCrudTests(
  db: Kysely<DatabaseSchema>,
  backendName: string
): Promise<void> {
  // Clean up any existing test data
  await db.deleteFrom('item_templates').where('id', 'like', 'integration_test_%').execute();

  // Test INSERT
  await db.insertInto('item_templates').values(testItemTemplate).execute();
  await db.insertInto('item_templates').values(testItemTemplate2).execute();

  // Test SELECT
  const item = await db
    .selectFrom('item_templates')
    .selectAll()
    .where('id', '=', testItemTemplate.id)
    .executeTakeFirst();

  expect(item).toBeDefined();
  expect(item?.id).toBe(testItemTemplate.id);
  expect(item?.name).toBe(testItemTemplate.name);
  expect(item?.type).toBe(testItemTemplate.type);
  expect(item?.value).toBe(testItemTemplate.value);
  expect(item?.slot).toBe(testItemTemplate.slot);

  // Verify JSON fields
  const stats = JSON.parse(item!.stats!);
  expect(stats.attack).toBe(10);
  expect(stats.strength).toBe(2);

  // Test SELECT ALL
  const allItems = await db
    .selectFrom('item_templates')
    .selectAll()
    .where('id', 'like', 'integration_test_%')
    .execute();

  expect(allItems.length).toBe(2);

  // Test UPDATE
  await db
    .updateTable('item_templates')
    .set({ value: 150, weight: 6 })
    .where('id', '=', testItemTemplate.id)
    .execute();

  const updatedItem = await db
    .selectFrom('item_templates')
    .selectAll()
    .where('id', '=', testItemTemplate.id)
    .executeTakeFirst();

  expect(updatedItem?.value).toBe(150);
  expect(updatedItem?.weight).toBe(6);

  // Test UPSERT (insert on conflict)
  const upsertItem = { ...testItemTemplate, value: 200 };
  await db
    .insertInto('item_templates')
    .values(upsertItem)
    .onConflict((oc) => oc.column('id').doUpdateSet({ value: 200 }))
    .execute();

  const upsertedItem = await db
    .selectFrom('item_templates')
    .selectAll()
    .where('id', '=', testItemTemplate.id)
    .executeTakeFirst();

  expect(upsertedItem?.value).toBe(200);

  // Test DELETE
  await db.deleteFrom('item_templates').where('id', 'like', 'integration_test_%').execute();

  const deletedItem = await db
    .selectFrom('item_templates')
    .selectAll()
    .where('id', '=', testItemTemplate.id)
    .executeTakeFirst();

  expect(deletedItem).toBeUndefined();

  console.log(`✅ ${backendName}: Item template CRUD operations passed`);
}

/**
 * Runs item instance CRUD operations test against a database
 */
async function runItemInstanceCrudTests(
  db: Kysely<DatabaseSchema>,
  backendName: string
): Promise<void> {
  // Clean up any existing test data
  await db.deleteFrom('item_instances').where('instance_id', 'like', 'inst_integration_test_%').execute();

  // Test INSERT
  await db.insertInto('item_instances').values(testItemInstance).execute();
  await db.insertInto('item_instances').values(testItemInstance2).execute();

  // Test SELECT
  const instance = await db
    .selectFrom('item_instances')
    .selectAll()
    .where('instance_id', '=', testItemInstance.instance_id)
    .executeTakeFirst();

  expect(instance).toBeDefined();
  expect(instance?.instance_id).toBe(testItemInstance.instance_id);
  expect(instance?.template_id).toBe(testItemInstance.template_id);
  expect(instance?.created_by).toBe(testItemInstance.created_by);

  // Verify JSON fields
  const properties = JSON.parse(instance!.properties!);
  expect(properties.enchanted).toBe(true);
  expect(properties.durability).toBe(100);

  const history = JSON.parse(instance!.history!);
  expect(history.length).toBe(1);
  expect(history[0].event).toBe('created');

  // Test SELECT ALL
  const allInstances = await db
    .selectFrom('item_instances')
    .selectAll()
    .where('instance_id', 'like', 'inst_integration_test_%')
    .execute();

  expect(allInstances.length).toBe(2);

  // Test instance without optional fields
  const minimalInstance = await db
    .selectFrom('item_instances')
    .selectAll()
    .where('instance_id', '=', testItemInstance2.instance_id)
    .executeTakeFirst();

  expect(minimalInstance).toBeDefined();
  expect(minimalInstance?.properties).toBeNull();
  expect(minimalInstance?.history).toBeNull();

  // Test UPDATE
  const newHistory = JSON.stringify([
    { timestamp: new Date().toISOString(), event: 'created', details: 'Integration test' },
    { timestamp: new Date().toISOString(), event: 'traded', details: 'Transferred ownership' },
  ]);
  await db
    .updateTable('item_instances')
    .set({ history: newHistory })
    .where('instance_id', '=', testItemInstance.instance_id)
    .execute();

  const updatedInstance = await db
    .selectFrom('item_instances')
    .selectAll()
    .where('instance_id', '=', testItemInstance.instance_id)
    .executeTakeFirst();

  const updatedHistory = JSON.parse(updatedInstance!.history!);
  expect(updatedHistory.length).toBe(2);

  // Test DELETE
  await db.deleteFrom('item_instances').where('instance_id', 'like', 'inst_integration_test_%').execute();

  const deletedInstance = await db
    .selectFrom('item_instances')
    .selectAll()
    .where('instance_id', '=', testItemInstance.instance_id)
    .executeTakeFirst();

  expect(deletedInstance).toBeUndefined();

  console.log(`✅ ${backendName}: Item instance CRUD operations passed`);
}

/**
 * Test transaction support for items
 */
async function runItemTransactionTest(
  db: Kysely<DatabaseSchema>,
  backendName: string
): Promise<void> {
  // Clean up first
  await db.deleteFrom('item_templates').where('id', 'like', 'tx_item_test_%').execute();
  await db.deleteFrom('item_instances').where('instance_id', 'like', 'tx_inst_test_%').execute();

  // Test successful transaction - create template and instance together
  await db.transaction().execute(async (trx) => {
    await trx
      .insertInto('item_templates')
      .values({ ...testItemTemplate, id: 'tx_item_test_1' })
      .execute();
    await trx
      .insertInto('item_instances')
      .values({ ...testItemInstance, instance_id: 'tx_inst_test_1', template_id: 'tx_item_test_1' })
      .execute();
  });

  const txTemplate = await db
    .selectFrom('item_templates')
    .selectAll()
    .where('id', '=', 'tx_item_test_1')
    .executeTakeFirst();

  const txInstance = await db
    .selectFrom('item_instances')
    .selectAll()
    .where('instance_id', '=', 'tx_inst_test_1')
    .executeTakeFirst();

  expect(txTemplate).toBeDefined();
  expect(txInstance).toBeDefined();
  expect(txInstance?.template_id).toBe('tx_item_test_1');

  // Clean up
  await db.deleteFrom('item_instances').where('instance_id', 'like', 'tx_inst_test_%').execute();
  await db.deleteFrom('item_templates').where('id', 'like', 'tx_item_test_%').execute();

  console.log(`✅ ${backendName}: Item transaction test passed`);
}

// ============================================================================
// SQLite Tests
// ============================================================================

describe('SQLite Storage Backend - Items', () => {
  let db: Kysely<DatabaseSchema>;
  let tempDbPath: string;

  beforeAll(async () => {
    // Create temp database file
    tempDbPath = path.join(os.tmpdir(), `ellymud-item-test-${Date.now()}.db`);
    const sqliteDb = new Database(tempDbPath);
    db = new Kysely<DatabaseSchema>({
      dialect: new SqliteDialect({ database: sqliteDb }),
    });
    await createItemTables(db);
  });

  afterAll(async () => {
    await db.destroy();
    // Clean up temp file
    if (fs.existsSync(tempDbPath)) {
      fs.unlinkSync(tempDbPath);
    }
  });

  it('should perform item template CRUD operations', async () => {
    await runItemTemplateCrudTests(db, 'SQLite');
  });

  it('should perform item instance CRUD operations', async () => {
    await runItemInstanceCrudTests(db, 'SQLite');
  });

  it('should support transactions for items', async () => {
    await runItemTransactionTest(db, 'SQLite');
  });

  it('should handle complex JSON in stats and requirements', async () => {
    const complexItem: ItemTemplatesTable = {
      id: 'complex_json_test',
      name: 'Complex Item',
      description: 'Item with complex JSON fields',
      type: 'weapon',
      slot: EquipmentSlot.MAIN_HAND,
      value: 500,
      weight: 10,
      global_limit: 1,
      stats: JSON.stringify({
        attack: 25,
        strength: 5,
        special: {
          fire_damage: 10,
          frost_damage: 5,
          effects: ['burn', 'freeze'],
        },
      }),
      requirements: JSON.stringify({
        level: 20,
        strength: 15,
        class: ['warrior', 'paladin'],
        quests: ['dragon_slayer'],
      }),
    };

    await db.deleteFrom('item_templates').where('id', '=', 'complex_json_test').execute();
    await db.insertInto('item_templates').values(complexItem).execute();

    const loaded = await db
      .selectFrom('item_templates')
      .selectAll()
      .where('id', '=', 'complex_json_test')
      .executeTakeFirst();

    expect(loaded).toBeDefined();
    const stats = JSON.parse(loaded!.stats!);
    expect(stats.special.fire_damage).toBe(10);
    expect(stats.special.effects).toContain('burn');

    const reqs = JSON.parse(loaded!.requirements!);
    expect(reqs.class).toContain('warrior');
    expect(reqs.quests).toContain('dragon_slayer');

    await db.deleteFrom('item_templates').where('id', '=', 'complex_json_test').execute();

    console.log('✅ SQLite: Complex JSON test passed');
  });

  it('should handle item instance history tracking', async () => {
    const historyInstance: ItemInstancesTable = {
      instance_id: 'history_test_inst',
      template_id: 'sword-001',
      created: new Date('2024-01-01').toISOString(),
      created_by: 'system',
      properties: JSON.stringify({ durability: 100 }),
      history: JSON.stringify([
        { timestamp: '2024-01-01T00:00:00Z', event: 'created', details: 'Spawned in dungeon' },
        { timestamp: '2024-01-02T12:00:00Z', event: 'looted', details: 'Picked up by player1' },
        { timestamp: '2024-01-03T18:30:00Z', event: 'traded', details: 'Sold to merchant' },
        { timestamp: '2024-01-04T09:00:00Z', event: 'purchased', details: 'Bought by player2' },
      ]),
    };

    await db.deleteFrom('item_instances').where('instance_id', '=', 'history_test_inst').execute();
    await db.insertInto('item_instances').values(historyInstance).execute();

    const loaded = await db
      .selectFrom('item_instances')
      .selectAll()
      .where('instance_id', '=', 'history_test_inst')
      .executeTakeFirst();

    expect(loaded).toBeDefined();
    const history = JSON.parse(loaded!.history!);
    expect(history.length).toBe(4);
    expect(history[1].event).toBe('looted');
    expect(history[3].details).toBe('Bought by player2');

    await db.deleteFrom('item_instances').where('instance_id', '=', 'history_test_inst').execute();

    console.log('✅ SQLite: Item history tracking test passed');
  });
});

// ============================================================================
// PostgreSQL Tests (conditional - only run if TEST_DATABASE_URL is set)
// ============================================================================

const POSTGRES_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;

const describePostgres = POSTGRES_URL ? describe : describe.skip;

describePostgres('PostgreSQL Storage Backend - Items', () => {
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
    await db.schema.dropTable('item_instances').ifExists().execute();
    await db.schema.dropTable('item_templates').ifExists().execute();

    await createItemTables(db);
  });

  afterAll(async () => {
    // Clean up test tables
    await db.schema.dropTable('item_instances').ifExists().execute();
    await db.schema.dropTable('item_templates').ifExists().execute();
    // db.destroy() also closes the pool
    await db.destroy();
  });

  it('should perform item template CRUD operations', async () => {
    await runItemTemplateCrudTests(db, 'PostgreSQL');
  });

  it('should perform item instance CRUD operations', async () => {
    await runItemInstanceCrudTests(db, 'PostgreSQL');
  });

  it('should support transactions for items', async () => {
    await runItemTransactionTest(db, 'PostgreSQL');
  });

  it('should handle complex JSON in stats and requirements', async () => {
    const complexItem: ItemTemplatesTable = {
      id: 'complex_json_test_pg',
      name: 'Complex Item',
      description: 'Item with complex JSON fields',
      type: 'weapon',
      slot: EquipmentSlot.MAIN_HAND,
      value: 500,
      weight: 10,
      global_limit: 1,
      stats: JSON.stringify({
        attack: 25,
        strength: 5,
        special: {
          fire_damage: 10,
          frost_damage: 5,
          effects: ['burn', 'freeze'],
        },
      }),
      requirements: JSON.stringify({
        level: 20,
        strength: 15,
        class: ['warrior', 'paladin'],
        quests: ['dragon_slayer'],
      }),
    };

    await db.deleteFrom('item_templates').where('id', '=', 'complex_json_test_pg').execute();
    await db.insertInto('item_templates').values(complexItem).execute();

    const loaded = await db
      .selectFrom('item_templates')
      .selectAll()
      .where('id', '=', 'complex_json_test_pg')
      .executeTakeFirst();

    expect(loaded).toBeDefined();
    const stats = JSON.parse(loaded!.stats!);
    expect(stats.special.fire_damage).toBe(10);

    await db.deleteFrom('item_templates').where('id', '=', 'complex_json_test_pg').execute();

    console.log('✅ PostgreSQL: Complex JSON test passed');
  });
});

// ============================================================================
// JSON File Backend Tests - Items
// ============================================================================

describe('JSON File Storage Backend - Items', () => {
  let tempDir: string;
  let itemsFile: string;
  let itemInstancesFile: string;

  beforeAll(() => {
    tempDir = path.join(os.tmpdir(), `ellymud-json-item-test-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });
    itemsFile = path.join(tempDir, 'items.json');
    itemInstancesFile = path.join(tempDir, 'itemInstances.json');
  });

  afterAll(() => {
    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
  });

  it('should write and read items JSON file', () => {
    const items = [
      {
        id: 'sword-001',
        name: 'Iron Sword',
        description: 'A sturdy iron sword.',
        type: 'weapon',
        slot: 'mainHand',
        value: 50,
        weight: 5,
        stats: { attack: 5, strength: 2 },
        requirements: { level: 1, strength: 5 },
      },
      {
        id: 'shield-001',
        name: 'Wooden Shield',
        description: 'A basic wooden shield.',
        type: 'armor',
        slot: 'offHand',
        value: 30,
        weight: 4,
        stats: { defense: 3 },
      },
      {
        id: 'potion-health-001',
        name: 'Health Potion',
        description: 'Restores 50 health.',
        type: 'consumable',
        value: 25,
        weight: 1,
      },
    ];

    fs.writeFileSync(itemsFile, JSON.stringify(items, null, 2));
    const loaded = JSON.parse(fs.readFileSync(itemsFile, 'utf8'));

    expect(loaded).toHaveLength(3);
    expect(loaded[0].id).toBe('sword-001');
    expect(loaded[0].stats.attack).toBe(5);
    expect(loaded[1].slot).toBe('offHand');
    expect(loaded[2].type).toBe('consumable');

    console.log('✅ JSON: Items file read/write test passed');
  });

  it('should write and read itemInstances JSON file', () => {
    const instances = [
      {
        instanceId: 'inst-001',
        templateId: 'sword-001',
        created: new Date('2024-01-01').toISOString(),
        createdBy: 'system',
        properties: { durability: 100 },
        history: [
          { timestamp: '2024-01-01T00:00:00Z', event: 'created' },
        ],
      },
      {
        instanceId: 'inst-002',
        templateId: 'potion-health-001',
        created: new Date('2024-01-02').toISOString(),
        createdBy: 'player1',
      },
    ];

    fs.writeFileSync(itemInstancesFile, JSON.stringify(instances, null, 2));
    const loaded = JSON.parse(fs.readFileSync(itemInstancesFile, 'utf8'));

    expect(loaded).toHaveLength(2);
    expect(loaded[0].instanceId).toBe('inst-001');
    expect(loaded[0].properties.durability).toBe(100);
    expect(loaded[1].templateId).toBe('potion-health-001');

    console.log('✅ JSON: ItemInstances file read/write test passed');
  });

  it('should handle atomic file updates for items', () => {
    const items = [{ id: 'atomic_test_item', name: 'Atomic Test', type: 'misc', value: 1 }];

    // Simulate atomic write (write to temp, then rename)
    const tempFile = `${itemsFile}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(items));
    fs.renameSync(tempFile, itemsFile);

    const loaded = JSON.parse(fs.readFileSync(itemsFile, 'utf8'));
    expect(loaded[0].id).toBe('atomic_test_item');

    console.log('✅ JSON: Atomic file update test passed');
  });

  it('should handle items with global limits', () => {
    const items = [
      {
        id: 'legendary-sword',
        name: 'Legendary Sword of Testing',
        description: 'A unique legendary weapon.',
        type: 'weapon',
        slot: 'mainHand',
        value: 10000,
        weight: 8,
        globalLimit: 1, // Only one can exist in the game
        stats: { attack: 50, strength: 10 },
      },
      {
        id: 'rare-ring',
        name: 'Ring of Integration',
        description: 'A rare magical ring.',
        type: 'armor',
        slot: 'ring1',
        value: 5000,
        weight: 0,
        globalLimit: 5, // Only 5 can exist
        stats: { intelligence: 5 },
      },
    ];

    fs.writeFileSync(itemsFile, JSON.stringify(items, null, 2));
    const loaded = JSON.parse(fs.readFileSync(itemsFile, 'utf8'));

    expect(loaded[0].globalLimit).toBe(1);
    expect(loaded[1].globalLimit).toBe(5);

    console.log('✅ JSON: Global limit test passed');
  });
});
