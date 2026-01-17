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

// PostgreSQL connection string from environment (check both TEST_DATABASE_URL and DATABASE_URL)
const POSTGRES_URL =
  process.env.TEST_DATABASE_URL ||
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/ellymud_test';

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

  // Create sample npcs.json
  const npcs = [
    {
      id: 'goblin_1',
      name: 'Goblin',
      description: 'A sneaky goblin.',
      health: 30,
      maxHealth: 30,
      damage: [3, 6],
      isHostile: true,
      isPassive: false,
      experienceValue: 25,
      attackTexts: ['slashes at you', 'stabs at you'],
      deathMessages: ['The goblin falls!'],
      merchant: false,
      inventory: [],
      stockConfig: [],
    },
  ];
  fs.writeFileSync(path.join(dataDir, 'npcs.json'), JSON.stringify(npcs, null, 2));

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

  // Create sample areas.json
  const areas = [
    {
      id: 'town-center',
      name: 'Town Center',
      description: 'The central hub of the town.',
      levelRange: { min: 1, max: 5 },
      flags: ['starter-zone', 'safe'],
      combatConfig: { pvpEnabled: false, dangerLevel: 1, xpMultiplier: 1.0 },
      spawnConfig: [],
      defaultRoomFlags: ['safe'],
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
    },
    {
      id: 'forest-edge',
      name: 'Forest Edge',
      description: 'The outskirts of the dark forest.',
      levelRange: { min: 3, max: 10 },
      flags: ['wilderness'],
      combatConfig: { pvpEnabled: false, dangerLevel: 3, xpMultiplier: 1.2 },
      spawnConfig: [{ npcTemplateId: 'wolf', maxInstances: 3, respawnTicks: 60 }],
      defaultRoomFlags: [],
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
    },
  ];
  fs.writeFileSync(path.join(dataDir, 'areas.json'), JSON.stringify(areas, null, 2));

  // Create sample abilities.json
  const abilities = [
    {
      id: 'fireball',
      name: 'Fireball',
      description: 'Hurls a ball of fire.',
      type: 'standard',
      mpCost: 15,
      cooldownType: 'rounds',
      cooldownValue: 2,
      targetType: 'enemy',
      effects: [{ effectType: 'instant_damage', payload: { damageAmount: 20 } }],
      requirements: { level: 3, intelligence: 12 },
    },
    {
      id: 'heal',
      name: 'Heal',
      description: 'Restores health.',
      type: 'standard',
      mpCost: 10,
      cooldownType: 'rounds',
      cooldownValue: 1,
      targetType: 'self',
      effects: [{ effectType: 'instant_heal', payload: { healAmount: 25 } }],
      requirements: { level: 1 },
    },
  ];
  fs.writeFileSync(path.join(dataDir, 'abilities.json'), JSON.stringify(abilities, null, 2));

  // Create sample room_state.json
  const roomStates = [
    {
      roomId: 'town_square',
      itemInstances: [],
      npcTemplateIds: ['npc_merchant'],
      currency: { gold: 0, silver: 0, copper: 0 },
      items: [],
    },
    {
      roomId: 'forest_path',
      itemInstances: ['inst_001'],
      npcTemplateIds: [],
      currency: { gold: 5, silver: 10, copper: 20 },
      items: [],
    },
  ];
  fs.writeFileSync(path.join(dataDir, 'room_state.json'), JSON.stringify(roomStates, null, 2));

  // Create sample merchant-state.json
  const merchantStates = [
    {
      npcTemplateId: 'merchant_1',
      npcInstanceId: 'merchant_1_inst',
      actualInventory: ['potion_health_inst_1', 'sword_basic_inst_1'],
      stockConfig: [
        { templateId: 'potion_health', maxStock: 5, restockAmount: 5, restockPeriod: 24 },
      ],
    },
  ];
  fs.writeFileSync(path.join(dataDir, 'merchant-state.json'), JSON.stringify(merchantStates, null, 2));

  // Create sample admin.json
  const adminData = {
    admins: [
      {
        username: 'admin',
        level: 'super',
        addedBy: 'system',
        addedOn: new Date().toISOString(),
      },
      {
        username: 'moderator',
        level: 'mod',
        addedBy: 'admin',
        addedOn: new Date().toISOString(),
      },
    ],
  };
  fs.writeFileSync(path.join(dataDir, 'admin.json'), JSON.stringify(adminData, null, 2));

  // Create sample bug-reports.json
  const bugReportsData = {
    reports: [
      {
        id: 'bug_001',
        user: 'testuser1',
        datetime: new Date().toISOString(),
        report: 'Found a bug in combat system.',
        logs: { raw: 'error log', user: 'user action log' },
        solved: false,
        solvedOn: null,
        solvedBy: null,
        solvedReason: null,
      },
    ],
  };
  fs.writeFileSync(path.join(dataDir, 'bug-reports.json'), JSON.stringify(bugReportsData, null, 2));

  // Create sample snake-scores.json
  const snakeScoresData = {
    scores: [
      { username: 'testuser1', score: 150, date: new Date().toISOString() },
      { username: 'testuser2', score: 200, date: new Date().toISOString() },
    ],
  };
  fs.writeFileSync(path.join(dataDir, 'snake-scores.json'), JSON.stringify(snakeScoresData, null, 2));

  // Create sample mud-config.json
  const mudConfig = {
    dataFiles: { players: './data/users.json', rooms: './data/rooms.json' },
    game: { startingRoom: 'town_square', maxPlayers: 100, idleTimeout: 30, maxPasswordAttempts: 5 },
    advanced: { debugMode: true, allowRegistration: true, backupInterval: 6, logLevel: 'info' },
  };
  fs.writeFileSync(path.join(dataDir, 'mud-config.json'), JSON.stringify(mudConfig, null, 2));

  // Create sample gametimer-config.json
  const gametimerConfig = { tickInterval: 6000, saveInterval: 10 };
  fs.writeFileSync(path.join(dataDir, 'gametimer-config.json'), JSON.stringify(gametimerConfig, null, 2));

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

  // Create npc_templates table
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
    .execute();

  // Create areas table
  await db.schema
    .createTable('areas')
    .ifNotExists()
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

  // Create abilities table
  await db.schema
    .createTable('abilities')
    .ifNotExists()
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

  // Create room_states table
  await db.schema
    .createTable('room_states')
    .ifNotExists()
    .addColumn('room_id', 'text', (col) => col.primaryKey())
    .addColumn('item_instances', 'text', (col) => col.notNull().defaultTo('[]'))
    .addColumn('npc_template_ids', 'text', (col) => col.notNull().defaultTo('[]'))
    .addColumn('currency_gold', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('currency_silver', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('currency_copper', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('items', 'text')
    .execute();

  // Create merchant_states table
  await db.schema
    .createTable('merchant_states')
    .ifNotExists()
    .addColumn('npc_template_id', 'text', (col) => col.primaryKey())
    .addColumn('npc_instance_id', 'text', (col) => col.notNull())
    .addColumn('actual_inventory', 'text', (col) => col.notNull().defaultTo('[]'))
    .addColumn('stock_config', 'text', (col) => col.notNull().defaultTo('[]'))
    .execute();

  // Create admins table
  await db.schema
    .createTable('admins')
    .ifNotExists()
    .addColumn('username', 'text', (col) => col.primaryKey())
    .addColumn('level', 'text', (col) => col.notNull())
    .addColumn('added_by', 'text', (col) => col.notNull())
    .addColumn('added_on', 'text', (col) => col.notNull())
    .execute();

  // Create bug_reports table
  await db.schema
    .createTable('bug_reports')
    .ifNotExists()
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

  // Create snake_scores table
  // Note: Using composite primary key (username + date) instead of auto_increment for PostgreSQL compatibility
  await db.schema
    .createTable('snake_scores')
    .ifNotExists()
    .addColumn('username', 'text', (col) => col.notNull())
    .addColumn('score', 'integer', (col) => col.notNull())
    .addColumn('date', 'text', (col) => col.notNull())
    .addPrimaryKeyConstraint('snake_scores_pk', ['username', 'date'])
    .execute();

  // Create mud_config table (singleton)
  await db.schema
    .createTable('mud_config')
    .ifNotExists()
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

  // Create gametimer_config table (singleton)
  await db.schema
    .createTable('gametimer_config')
    .ifNotExists()
    .addColumn('key', 'text', (col) => col.primaryKey())
    .addColumn('tick_interval', 'integer', (col) => col.notNull().defaultTo(6000))
    .addColumn('save_interval', 'integer', (col) => col.notNull().defaultTo(10))
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

  // Insert NPC templates
  await db
    .insertInto('npc_templates' as never)
    .values({
      id: 'db_goblin',
      name: 'Database Goblin',
      description: 'A goblin from the database.',
      health: 40,
      max_health: 40,
      damage_min: 4,
      damage_max: 8,
      is_hostile: 1,
      is_passive: 0,
      experience_value: 30,
      attack_texts: JSON.stringify(['attacks', 'bites']),
      death_messages: JSON.stringify(['falls dead']),
      merchant: 0,
      inventory: JSON.stringify([]),
      stock_config: JSON.stringify([]),
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
    } as never)
    .execute();

  // Insert areas
  await db
    .insertInto('areas' as never)
    .values({
      id: 'db_area_1',
      name: 'Database Area',
      description: 'An area from the database.',
      level_range: JSON.stringify({ min: 1, max: 10 }),
      flags: JSON.stringify(['test-area']),
      combat_config: JSON.stringify({ pvpEnabled: false, dangerLevel: 2 }),
      spawn_config: JSON.stringify([]),
      default_room_flags: JSON.stringify([]),
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
    } as never)
    .execute();

  // Insert abilities
  await db
    .insertInto('abilities' as never)
    .values({
      id: 'db_fireball',
      name: 'DB Fireball',
      description: 'A fireball from the database.',
      type: 'standard',
      mp_cost: 20,
      cooldown_type: 'rounds',
      cooldown_value: 2,
      target_type: 'enemy',
      effects: JSON.stringify([{ effectType: 'instant_damage', payload: { damageAmount: 25 } }]),
      requirements: JSON.stringify({ level: 5 }),
    } as never)
    .execute();

  // Insert room states
  await db
    .insertInto('room_states' as never)
    .values({
      room_id: 'db_room_1',
      item_instances: JSON.stringify(['db_inst_001']),
      npc_template_ids: JSON.stringify(['db_goblin']),
      currency_gold: 10,
      currency_silver: 5,
      currency_copper: 2,
      items: JSON.stringify([]),
    } as never)
    .execute();

  // Insert merchant states
  await db
    .insertInto('merchant_states' as never)
    .values({
      npc_template_id: 'db_merchant',
      npc_instance_id: 'db_merchant_inst',
      actual_inventory: JSON.stringify(['item_1', 'item_2']),
      stock_config: JSON.stringify([{ templateId: 'potion', maxStock: 10 }]),
    } as never)
    .execute();

  // Insert admins
  await db
    .insertInto('admins' as never)
    .values({
      username: 'db_admin',
      level: 'super',
      added_by: 'system',
      added_on: new Date().toISOString(),
    } as never)
    .execute();

  // Insert bug reports
  await db
    .insertInto('bug_reports' as never)
    .values({
      id: 'db_bug_001',
      user: 'dbuser1',
      datetime: new Date().toISOString(),
      report: 'Found a bug in the database layer.',
      logs_raw: 'raw log data',
      logs_user: 'user log data',
      solved: 0,
      solved_on: null,
      solved_by: null,
      solved_reason: null,
    } as never)
    .execute();

  // Insert snake scores
  await db
    .insertInto('snake_scores' as never)
    .values({
      username: 'dbuser1',
      score: 300,
      date: new Date().toISOString(),
    } as never)
    .execute();

  // Insert MUD config (singleton)
  await db
    .insertInto('mud_config' as never)
    .values({
      key: 'singleton',
      data_files: JSON.stringify({ players: './data/users.json' }),
      game_starting_room: 'db_room_1',
      game_max_players: 50,
      game_idle_timeout: 60,
      game_max_password_attempts: 3,
      advanced_debug_mode: 1,
      advanced_allow_registration: 1,
      advanced_backup_interval: 12,
      advanced_log_level: 'debug',
    } as never)
    .execute();

  // Insert gametimer config (singleton)
  await db
    .insertInto('gametimer_config' as never)
    .values({
      key: 'singleton',
      tick_interval: 5000,
      save_interval: 15,
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

      // Drop and recreate all tables for clean test
      const tablesToDrop = [
        'gametimer_config', 'mud_config', 'snake_scores', 'bug_reports',
        'admins', 'merchant_states', 'room_states', 'abilities', 'areas',
        'item_instances', 'item_templates', 'npc_templates', 'rooms', 'users'
      ];
      for (const table of tablesToDrop) {
        await db.schema.dropTable(table).ifExists().execute();
      }

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

      // Drop and recreate all tables for clean test
      const tablesToDrop = [
        'gametimer_config', 'mud_config', 'snake_scores', 'bug_reports',
        'admins', 'merchant_states', 'room_states', 'abilities', 'areas',
        'item_instances', 'item_templates', 'npc_templates', 'rooms', 'users'
      ];
      for (const table of tablesToDrop) {
        await db.schema.dropTable(table).ifExists().execute();
      }

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

      // Clean PostgreSQL tables - drop all 14 tables
      const tablesToDrop = [
        'gametimer_config', 'mud_config', 'snake_scores', 'bug_reports',
        'admins', 'merchant_states', 'room_states', 'abilities', 'areas',
        'item_instances', 'item_templates', 'npc_templates', 'rooms', 'users'
      ];
      for (const table of tablesToDrop) {
        await pgDb.schema.dropTable(table).ifExists().execute();
      }
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

  describe('New Entity Migrations (Areas, Abilities, Room States, etc.)', () => {
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

    it('should import areas from JSON to SQLite', async () => {
      const jsonAreas = readJsonFile<Array<{
        id: string;
        name: string;
        description: string;
        levelRange: { min: number; max: number };
        flags: string[];
        combatConfig: Record<string, unknown>;
        spawnConfig: unknown[];
        defaultRoomFlags: string[];
        created: string;
        modified: string;
      }>>(path.join(dataDir, 'areas.json'));
      expect(jsonAreas).toHaveLength(2);

      for (const area of jsonAreas || []) {
        await db
          .insertInto('areas' as never)
          .values({
            id: area.id,
            name: area.name,
            description: area.description,
            level_range: JSON.stringify(area.levelRange),
            flags: JSON.stringify(area.flags || []),
            combat_config: JSON.stringify(area.combatConfig || {}),
            spawn_config: JSON.stringify(area.spawnConfig || []),
            default_room_flags: JSON.stringify(area.defaultRoomFlags || []),
            created: area.created,
            modified: area.modified,
          } as never)
          .execute();
      }

      const dbAreas = await db.selectFrom('areas' as never).selectAll().execute() as Array<{
        id: string;
        name: string;
        level_range: string;
        flags: string;
      }>;
      expect(dbAreas).toHaveLength(2);

      const townCenter = dbAreas.find((a) => a.id === 'town-center');
      expect(townCenter).toBeDefined();
      expect(townCenter!.name).toBe('Town Center');
      expect(JSON.parse(townCenter!.level_range)).toEqual({ min: 1, max: 5 });
      expect(JSON.parse(townCenter!.flags)).toContain('starter-zone');
    });

    it('should import abilities from JSON to SQLite', async () => {
      const jsonAbilities = readJsonFile<Array<{
        id: string;
        name: string;
        description: string;
        type: string;
        mpCost: number;
        cooldownType: string;
        cooldownValue: number;
        targetType: string;
        effects: unknown[];
        requirements?: Record<string, number>;
      }>>(path.join(dataDir, 'abilities.json'));
      expect(jsonAbilities).toHaveLength(2);

      for (const ability of jsonAbilities || []) {
        await db
          .insertInto('abilities' as never)
          .values({
            id: ability.id,
            name: ability.name,
            description: ability.description,
            type: ability.type,
            mp_cost: ability.mpCost,
            cooldown_type: ability.cooldownType,
            cooldown_value: ability.cooldownValue,
            target_type: ability.targetType,
            effects: JSON.stringify(ability.effects || []),
            requirements: JSON.stringify(ability.requirements || {}),
          } as never)
          .execute();
      }

      const dbAbilities = await db.selectFrom('abilities' as never).selectAll().execute() as Array<{
        id: string;
        name: string;
        mp_cost: number;
        effects: string;
      }>;
      expect(dbAbilities).toHaveLength(2);

      const fireball = dbAbilities.find((a) => a.id === 'fireball');
      expect(fireball).toBeDefined();
      expect(fireball!.name).toBe('Fireball');
      expect(fireball!.mp_cost).toBe(15);
      const effects = JSON.parse(fireball!.effects);
      expect(effects[0].effectType).toBe('instant_damage');
    });

    it('should import room states from JSON to SQLite', async () => {
      const jsonRoomStates = readJsonFile<Array<{
        roomId: string;
        itemInstances: string[];
        npcTemplateIds: string[];
        currency: { gold: number; silver: number; copper: number };
        items: unknown[];
      }>>(path.join(dataDir, 'room_state.json'));
      expect(jsonRoomStates).toHaveLength(2);

      for (const state of jsonRoomStates || []) {
        await db
          .insertInto('room_states' as never)
          .values({
            room_id: state.roomId,
            item_instances: JSON.stringify(state.itemInstances || []),
            npc_template_ids: JSON.stringify(state.npcTemplateIds || []),
            currency_gold: state.currency?.gold ?? 0,
            currency_silver: state.currency?.silver ?? 0,
            currency_copper: state.currency?.copper ?? 0,
            items: JSON.stringify(state.items || []),
          } as never)
          .execute();
      }

      const dbRoomStates = await db.selectFrom('room_states' as never).selectAll().execute() as Array<{
        room_id: string;
        currency_gold: number;
        npc_template_ids: string;
      }>;
      expect(dbRoomStates).toHaveLength(2);

      const forestPath = dbRoomStates.find((s) => s.room_id === 'forest_path');
      expect(forestPath).toBeDefined();
      expect(forestPath!.currency_gold).toBe(5);
    });

    it('should import merchant states from JSON to SQLite', async () => {
      const jsonMerchantStates = readJsonFile<Array<{
        npcTemplateId: string;
        npcInstanceId: string;
        actualInventory: string[];
        stockConfig: unknown[];
      }>>(path.join(dataDir, 'merchant-state.json'));
      expect(jsonMerchantStates).toHaveLength(1);

      for (const state of jsonMerchantStates || []) {
        await db
          .insertInto('merchant_states' as never)
          .values({
            npc_template_id: state.npcTemplateId,
            npc_instance_id: state.npcInstanceId,
            actual_inventory: JSON.stringify(state.actualInventory || []),
            stock_config: JSON.stringify(state.stockConfig || []),
          } as never)
          .execute();
      }

      const dbMerchantStates = await db.selectFrom('merchant_states' as never).selectAll().execute() as Array<{
        npc_template_id: string;
        actual_inventory: string;
      }>;
      expect(dbMerchantStates).toHaveLength(1);
      expect(dbMerchantStates[0].npc_template_id).toBe('merchant_1');
      expect(JSON.parse(dbMerchantStates[0].actual_inventory)).toHaveLength(2);
    });

    it('should import admin users from JSON to SQLite', async () => {
      const jsonAdminData = readJsonFile<{ admins: Array<{
        username: string;
        level: string;
        addedBy: string;
        addedOn: string;
      }> }>(path.join(dataDir, 'admin.json'));
      expect(jsonAdminData?.admins).toHaveLength(2);

      for (const admin of jsonAdminData?.admins || []) {
        await db
          .insertInto('admins' as never)
          .values({
            username: admin.username,
            level: admin.level,
            added_by: admin.addedBy,
            added_on: admin.addedOn,
          } as never)
          .execute();
      }

      const dbAdmins = await db.selectFrom('admins' as never).selectAll().execute() as Array<{
        username: string;
        level: string;
      }>;
      expect(dbAdmins).toHaveLength(2);
      expect(dbAdmins.find((a) => a.username === 'admin')?.level).toBe('super');
      expect(dbAdmins.find((a) => a.username === 'moderator')?.level).toBe('mod');
    });

    it('should import bug reports from JSON to SQLite', async () => {
      const jsonBugData = readJsonFile<{ reports: Array<{
        id: string;
        user: string;
        datetime: string;
        report: string;
        logs?: { raw?: string; user?: string };
        solved: boolean;
      }> }>(path.join(dataDir, 'bug-reports.json'));
      expect(jsonBugData?.reports).toHaveLength(1);

      for (const report of jsonBugData?.reports || []) {
        await db
          .insertInto('bug_reports' as never)
          .values({
            id: report.id,
            user: report.user,
            datetime: report.datetime,
            report: report.report,
            logs_raw: report.logs?.raw || null,
            logs_user: report.logs?.user || null,
            solved: report.solved ? 1 : 0,
          } as never)
          .execute();
      }

      const dbBugReports = await db.selectFrom('bug_reports' as never).selectAll().execute() as Array<{
        id: string;
        user: string;
        logs_raw: string | null;
      }>;
      expect(dbBugReports).toHaveLength(1);
      expect(dbBugReports[0].id).toBe('bug_001');
      expect(dbBugReports[0].logs_raw).toBe('error log');
    });

    it('should import snake scores from JSON to SQLite', async () => {
      const jsonScoreData = readJsonFile<{ scores: Array<{
        username: string;
        score: number;
        date: string;
      }> }>(path.join(dataDir, 'snake-scores.json'));
      expect(jsonScoreData?.scores).toHaveLength(2);

      for (const score of jsonScoreData?.scores || []) {
        await db
          .insertInto('snake_scores' as never)
          .values({
            username: score.username,
            score: score.score,
            date: score.date,
          } as never)
          .execute();
      }

      const dbScores = await db.selectFrom('snake_scores' as never).selectAll().execute() as Array<{
        username: string;
        score: number;
      }>;
      expect(dbScores).toHaveLength(2);
      const topScore = dbScores.reduce((max, s) => s.score > max.score ? s : max);
      expect(topScore.score).toBe(200);
      expect(topScore.username).toBe('testuser2');
    });

    it('should import MUD config from JSON to SQLite (singleton)', async () => {
      const jsonConfig = readJsonFile<{
        dataFiles: Record<string, string>;
        game: { startingRoom: string; maxPlayers: number; idleTimeout: number; maxPasswordAttempts: number };
        advanced: { debugMode: boolean; allowRegistration: boolean; backupInterval: number; logLevel: string };
      }>(path.join(dataDir, 'mud-config.json'));
      expect(jsonConfig).toBeDefined();

      await db
        .insertInto('mud_config' as never)
        .values({
          key: 'singleton',
          data_files: JSON.stringify(jsonConfig!.dataFiles),
          game_starting_room: jsonConfig!.game.startingRoom,
          game_max_players: jsonConfig!.game.maxPlayers,
          game_idle_timeout: jsonConfig!.game.idleTimeout,
          game_max_password_attempts: jsonConfig!.game.maxPasswordAttempts,
          advanced_debug_mode: jsonConfig!.advanced.debugMode ? 1 : 0,
          advanced_allow_registration: jsonConfig!.advanced.allowRegistration ? 1 : 0,
          advanced_backup_interval: jsonConfig!.advanced.backupInterval,
          advanced_log_level: jsonConfig!.advanced.logLevel,
        } as never)
        .execute();

      const dbConfig = await db.selectFrom('mud_config' as never).selectAll().execute() as Array<{
        key: string;
        game_starting_room: string;
        game_max_players: number;
        advanced_debug_mode: number;
      }>;
      expect(dbConfig).toHaveLength(1);
      expect(dbConfig[0].key).toBe('singleton');
      expect(dbConfig[0].game_starting_room).toBe('town_square');
      expect(dbConfig[0].game_max_players).toBe(100);
      expect(dbConfig[0].advanced_debug_mode).toBe(1);
    });

    it('should import gametimer config from JSON to SQLite (singleton)', async () => {
      const jsonConfig = readJsonFile<{
        tickInterval: number;
        saveInterval: number;
      }>(path.join(dataDir, 'gametimer-config.json'));
      expect(jsonConfig).toBeDefined();

      await db
        .insertInto('gametimer_config' as never)
        .values({
          key: 'singleton',
          tick_interval: jsonConfig!.tickInterval,
          save_interval: jsonConfig!.saveInterval,
        } as never)
        .execute();

      const dbConfig = await db.selectFrom('gametimer_config' as never).selectAll().execute() as Array<{
        key: string;
        tick_interval: number;
        save_interval: number;
      }>;
      expect(dbConfig).toHaveLength(1);
      expect(dbConfig[0].key).toBe('singleton');
      expect(dbConfig[0].tick_interval).toBe(6000);
      expect(dbConfig[0].save_interval).toBe(10);
    });

    it('should import NPCs from JSON to SQLite', async () => {
      const jsonNpcs = readJsonFile<Array<{
        id: string;
        name: string;
        description: string;
        health: number;
        maxHealth: number;
        damage: [number, number];
        isHostile: boolean;
        isPassive: boolean;
        experienceValue: number;
        attackTexts: string[];
        deathMessages: string[];
        merchant: boolean;
        inventory: unknown[];
        stockConfig: unknown[];
      }>>(path.join(dataDir, 'npcs.json'));
      expect(jsonNpcs).toHaveLength(1);

      for (const npc of jsonNpcs || []) {
        const [damageMin, damageMax] = npc.damage || [1, 3];
        await db
          .insertInto('npc_templates' as never)
          .values({
            id: npc.id,
            name: npc.name,
            description: npc.description,
            health: npc.health,
            max_health: npc.maxHealth ?? npc.health,
            damage_min: damageMin,
            damage_max: damageMax,
            is_hostile: npc.isHostile ? 1 : 0,
            is_passive: npc.isPassive ? 1 : 0,
            experience_value: npc.experienceValue ?? 50,
            attack_texts: JSON.stringify(npc.attackTexts || []),
            death_messages: JSON.stringify(npc.deathMessages || []),
            merchant: npc.merchant ? 1 : 0,
            inventory: JSON.stringify(npc.inventory || []),
            stock_config: JSON.stringify(npc.stockConfig || []),
          } as never)
          .execute();
      }

      const dbNpcs = await db.selectFrom('npc_templates' as never).selectAll().execute() as Array<{
        id: string;
        name: string;
        damage_min: number;
        damage_max: number;
        is_hostile: number;
      }>;
      expect(dbNpcs).toHaveLength(1);
      expect(dbNpcs[0].id).toBe('goblin_1');
      expect(dbNpcs[0].name).toBe('Goblin');
      expect(dbNpcs[0].damage_min).toBe(3);
      expect(dbNpcs[0].damage_max).toBe(6);
      expect(dbNpcs[0].is_hostile).toBe(1);
    });
  });

  describe('SQLite → JSON Export for New Entities', () => {
    let dataDir: string;
    let cleanup: () => void;
    let db: Kysely<DatabaseSchema>;
    let sqliteDb: Database.Database;

    beforeEach(async () => {
      const temp = createTempDataDir();
      dataDir = temp.dataDir;
      cleanup = temp.cleanup;

      // Remove existing JSON files to test export
      const filesToRemove = [
        'areas.json', 'abilities.json', 'room_state.json', 'merchant-state.json',
        'admin.json', 'bug-reports.json', 'snake-scores.json', 'mud-config.json',
        'gametimer-config.json', 'npcs.json'
      ];
      for (const file of filesToRemove) {
        try { fs.unlinkSync(path.join(dataDir, file)); } catch { /* ignore */ }
      }

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

    it('should export areas from SQLite to JSON', async () => {
      const dbAreas = await db.selectFrom('areas' as never).selectAll().execute();
      expect(dbAreas).toHaveLength(1);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const areas = dbAreas.map((row: any) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        levelRange: JSON.parse(row.level_range),
        flags: JSON.parse(row.flags || '[]'),
        combatConfig: JSON.parse(row.combat_config || '{}'),
        spawnConfig: JSON.parse(row.spawn_config || '[]'),
        defaultRoomFlags: JSON.parse(row.default_room_flags || '[]'),
        created: row.created,
        modified: row.modified,
      }));
      fs.writeFileSync(path.join(dataDir, 'areas.json'), JSON.stringify(areas, null, 2));

      const jsonAreas = readJsonFile<Array<{ id: string; levelRange: { min: number; max: number } }>>(
        path.join(dataDir, 'areas.json')
      );
      expect(jsonAreas).toHaveLength(1);
      expect(jsonAreas?.[0].id).toBe('db_area_1');
      expect(jsonAreas?.[0].levelRange).toEqual({ min: 1, max: 10 });
    });

    it('should export abilities from SQLite to JSON', async () => {
      const dbAbilities = await db.selectFrom('abilities' as never).selectAll().execute();
      expect(dbAbilities).toHaveLength(1);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const abilities = dbAbilities.map((row: any) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        type: row.type,
        mpCost: row.mp_cost,
        cooldownType: row.cooldown_type,
        cooldownValue: row.cooldown_value,
        targetType: row.target_type,
        effects: JSON.parse(row.effects || '[]'),
        requirements: JSON.parse(row.requirements || '{}'),
      }));
      fs.writeFileSync(path.join(dataDir, 'abilities.json'), JSON.stringify(abilities, null, 2));

      const jsonAbilities = readJsonFile<Array<{ id: string; mpCost: number }>>(
        path.join(dataDir, 'abilities.json')
      );
      expect(jsonAbilities).toHaveLength(1);
      expect(jsonAbilities?.[0].id).toBe('db_fireball');
      expect(jsonAbilities?.[0].mpCost).toBe(20);
    });

    it('should export merchant states from SQLite to JSON', async () => {
      const dbMerchantStates = await db.selectFrom('merchant_states' as never).selectAll().execute();
      expect(dbMerchantStates).toHaveLength(1);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const merchantStates = dbMerchantStates.map((row: any) => ({
        npcTemplateId: row.npc_template_id,
        npcInstanceId: row.npc_instance_id,
        actualInventory: JSON.parse(row.actual_inventory || '[]'),
        stockConfig: JSON.parse(row.stock_config || '[]'),
      }));
      fs.writeFileSync(path.join(dataDir, 'merchant-state.json'), JSON.stringify(merchantStates, null, 2));

      const jsonMerchantStates = readJsonFile<Array<{ npcTemplateId: string; actualInventory: string[] }>>(
        path.join(dataDir, 'merchant-state.json')
      );
      expect(jsonMerchantStates).toHaveLength(1);
      expect(jsonMerchantStates?.[0].npcTemplateId).toBe('db_merchant');
      expect(jsonMerchantStates?.[0].actualInventory).toEqual(['item_1', 'item_2']);
    });

    it('should export admin users from SQLite to JSON', async () => {
      const dbAdmins = await db.selectFrom('admins' as never).selectAll().execute();
      expect(dbAdmins).toHaveLength(1);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const admins = dbAdmins.map((row: any) => ({
        username: row.username,
        level: row.level,
        addedBy: row.added_by,
        addedOn: row.added_on,
      }));
      fs.writeFileSync(path.join(dataDir, 'admin.json'), JSON.stringify({ admins }, null, 2));

      const jsonAdminData = readJsonFile<{ admins: Array<{ username: string; level: string }> }>(
        path.join(dataDir, 'admin.json')
      );
      expect(jsonAdminData?.admins).toHaveLength(1);
      expect(jsonAdminData?.admins[0].username).toBe('db_admin');
      expect(jsonAdminData?.admins[0].level).toBe('super');
    });

    it('should export MUD config from SQLite to JSON (singleton)', async () => {
      const dbConfig = await db.selectFrom('mud_config' as never).selectAll().execute();
      expect(dbConfig).toHaveLength(1);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const row = dbConfig[0] as any;
      const config = {
        dataFiles: JSON.parse(row.data_files || '{}'),
        game: {
          startingRoom: row.game_starting_room,
          maxPlayers: row.game_max_players,
          idleTimeout: row.game_idle_timeout,
          maxPasswordAttempts: row.game_max_password_attempts,
        },
        advanced: {
          debugMode: row.advanced_debug_mode === 1,
          allowRegistration: row.advanced_allow_registration === 1,
          backupInterval: row.advanced_backup_interval,
          logLevel: row.advanced_log_level,
        },
      };
      fs.writeFileSync(path.join(dataDir, 'mud-config.json'), JSON.stringify(config, null, 2));

      const jsonConfig = readJsonFile<{
        game: { startingRoom: string; maxPlayers: number };
        advanced: { debugMode: boolean };
      }>(path.join(dataDir, 'mud-config.json'));
      expect(jsonConfig).toBeDefined();
      expect(jsonConfig?.game.startingRoom).toBe('db_room_1');
      expect(jsonConfig?.game.maxPlayers).toBe(50);
      expect(jsonConfig?.advanced.debugMode).toBe(true);
    });

    it('should export gametimer config from SQLite to JSON (singleton)', async () => {
      const dbConfig = await db.selectFrom('gametimer_config' as never).selectAll().execute();
      expect(dbConfig).toHaveLength(1);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const row = dbConfig[0] as any;
      const config = {
        tickInterval: row.tick_interval,
        saveInterval: row.save_interval,
      };
      fs.writeFileSync(path.join(dataDir, 'gametimer-config.json'), JSON.stringify(config, null, 2));

      const jsonConfig = readJsonFile<{ tickInterval: number; saveInterval: number }>(
        path.join(dataDir, 'gametimer-config.json')
      );
      expect(jsonConfig).toBeDefined();
      expect(jsonConfig?.tickInterval).toBe(5000);
      expect(jsonConfig?.saveInterval).toBe(15);
    });
  });

  describe('PostgreSQL Migration for New Entities', () => {
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

      // Drop and recreate all tables for clean test
      const tablesToDrop = [
        'gametimer_config', 'mud_config', 'snake_scores', 'bug_reports',
        'admins', 'merchant_states', 'room_states', 'abilities', 'areas',
        'item_instances', 'item_templates', 'npc_templates', 'rooms', 'users'
      ];
      for (const table of tablesToDrop) {
        await db.schema.dropTable(table).ifExists().execute();
      }
      await createDatabaseSchema(db);
    });

    afterEach(async () => {
      if (!postgresAvailable) return;
      if (db) await db.destroy();
      cleanup();
    });

    it('should import areas from JSON to PostgreSQL', async () => {
      if (!postgresAvailable) return;

      const jsonAreas = readJsonFile<Array<{
        id: string;
        name: string;
        description: string;
        levelRange: { min: number; max: number };
        flags: string[];
        combatConfig: Record<string, unknown>;
        spawnConfig: unknown[];
        defaultRoomFlags: string[];
        created: string;
        modified: string;
      }>>(path.join(dataDir, 'areas.json'));

      for (const area of jsonAreas || []) {
        await db
          .insertInto('areas' as never)
          .values({
            id: area.id,
            name: area.name,
            description: area.description,
            level_range: JSON.stringify(area.levelRange),
            flags: JSON.stringify(area.flags || []),
            combat_config: JSON.stringify(area.combatConfig || {}),
            spawn_config: JSON.stringify(area.spawnConfig || []),
            default_room_flags: JSON.stringify(area.defaultRoomFlags || []),
            created: area.created,
            modified: area.modified,
          } as never)
          .execute();
      }

      const dbAreas = await db.selectFrom('areas' as never).selectAll().execute() as Array<{ id: string }>;
      expect(dbAreas).toHaveLength(2);
    });

    it('should import abilities from JSON to PostgreSQL', async () => {
      if (!postgresAvailable) return;

      const jsonAbilities = readJsonFile<Array<{
        id: string;
        name: string;
        description: string;
        type: string;
        mpCost: number;
        cooldownType: string;
        cooldownValue: number;
        targetType: string;
        effects: unknown[];
        requirements?: Record<string, number>;
      }>>(path.join(dataDir, 'abilities.json'));

      for (const ability of jsonAbilities || []) {
        await db
          .insertInto('abilities' as never)
          .values({
            id: ability.id,
            name: ability.name,
            description: ability.description,
            type: ability.type,
            mp_cost: ability.mpCost,
            cooldown_type: ability.cooldownType,
            cooldown_value: ability.cooldownValue,
            target_type: ability.targetType,
            effects: JSON.stringify(ability.effects || []),
            requirements: JSON.stringify(ability.requirements || {}),
          } as never)
          .execute();
      }

      const dbAbilities = await db.selectFrom('abilities' as never).selectAll().execute() as Array<{ id: string }>;
      expect(dbAbilities).toHaveLength(2);
    });

    it('should import config singletons from JSON to PostgreSQL', async () => {
      if (!postgresAvailable) return;

      // Import MUD config
      const mudConfig = readJsonFile<{
        dataFiles: Record<string, string>;
        game: { startingRoom: string; maxPlayers: number; idleTimeout: number; maxPasswordAttempts: number };
        advanced: { debugMode: boolean; allowRegistration: boolean; backupInterval: number; logLevel: string };
      }>(path.join(dataDir, 'mud-config.json'));

      await db
        .insertInto('mud_config' as never)
        .values({
          key: 'singleton',
          data_files: JSON.stringify(mudConfig!.dataFiles),
          game_starting_room: mudConfig!.game.startingRoom,
          game_max_players: mudConfig!.game.maxPlayers,
          game_idle_timeout: mudConfig!.game.idleTimeout,
          game_max_password_attempts: mudConfig!.game.maxPasswordAttempts,
          advanced_debug_mode: mudConfig!.advanced.debugMode ? 1 : 0,
          advanced_allow_registration: mudConfig!.advanced.allowRegistration ? 1 : 0,
          advanced_backup_interval: mudConfig!.advanced.backupInterval,
          advanced_log_level: mudConfig!.advanced.logLevel,
        } as never)
        .execute();

      // Import gametimer config
      const timerConfig = readJsonFile<{ tickInterval: number; saveInterval: number }>(
        path.join(dataDir, 'gametimer-config.json')
      );

      await db
        .insertInto('gametimer_config' as never)
        .values({
          key: 'singleton',
          tick_interval: timerConfig!.tickInterval,
          save_interval: timerConfig!.saveInterval,
        } as never)
        .execute();

      // Verify
      const dbMudConfig = await db.selectFrom('mud_config' as never).selectAll().execute();
      expect(dbMudConfig).toHaveLength(1);

      const dbTimerConfig = await db.selectFrom('gametimer_config' as never).selectAll().execute();
      expect(dbTimerConfig).toHaveLength(1);
    });
  });
});
