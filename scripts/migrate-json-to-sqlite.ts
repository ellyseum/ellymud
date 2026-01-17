#!/usr/bin/env ts-node
/**
 * Migration script: JSON files to SQLite database
 * Run: npx ts-node scripts/migrate-json-to-sqlite.ts
 * 
 * Supports all EllyMUD entities:
 * - Users, Rooms, NPCs (core)
 * - Items (templates + instances)
 * - Areas, Abilities
 * - Room States, Merchant States
 * - Admin Auth, Bug Reports, Snake Scores
 * - MUD Config, Game Timer Config
 */
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { Kysely, SqliteDialect } from 'kysely';
import { Database as DatabaseSchema } from '../src/data/schema';

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'game.db');

// Core entity files
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const ROOMS_FILE = path.join(DATA_DIR, 'rooms.json');
const NPCS_FILE = path.join(DATA_DIR, 'npcs.json');
const ITEMS_FILE = path.join(DATA_DIR, 'items.json');
const ITEM_INSTANCES_FILE = path.join(DATA_DIR, 'itemInstances.json');

// Additional entity files
const AREAS_FILE = path.join(DATA_DIR, 'areas.json');
const ABILITIES_FILE = path.join(DATA_DIR, 'abilities.json');
const ROOM_STATE_FILE = path.join(DATA_DIR, 'room_state.json');
const MERCHANT_STATE_FILE = path.join(DATA_DIR, 'merchant-state.json');
const ADMIN_FILE = path.join(DATA_DIR, 'admin.json');
const BUG_REPORTS_FILE = path.join(DATA_DIR, 'bug-reports.json');
const SNAKE_SCORES_FILE = path.join(DATA_DIR, 'snake-scores.json');

// Config files (singleton pattern)
const MUD_CONFIG_FILE = path.join(DATA_DIR, 'mud-config.json');
const GAMETIMER_CONFIG_FILE = path.join(DATA_DIR, 'gametimer-config.json');

async function migrate(): Promise<void> {
  console.log('=== EllyMUD JSON to SQLite Migration ===\n');

  // Check required core files
  if (!fs.existsSync(USERS_FILE)) { console.error(`ERROR: ${USERS_FILE} not found`); process.exit(1); }
  if (!fs.existsSync(ROOMS_FILE)) { console.error(`ERROR: ${ROOMS_FILE} not found`); process.exit(1); }
  if (!fs.existsSync(NPCS_FILE)) { console.error(`ERROR: ${NPCS_FILE} not found`); process.exit(1); }

  const sqliteDb = new Database(DB_PATH);
  const db = new Kysely<DatabaseSchema>({ dialect: new SqliteDialect({ database: sqliteDb }) });

  console.log(`Database: ${DB_PATH}\n`);
  console.log('Creating tables...');
  
  // Create users table (same schema as db.ts initializeDatabase)
  await db.schema.createTable('users').ifNotExists()
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

  await db.schema.createTable('rooms').ifNotExists()
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

  await db.schema.createTable('npc_templates').ifNotExists()
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

  // Item templates table
  await db.schema.createTable('item_templates').ifNotExists()
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

  // Item instances table
  await db.schema.createTable('item_instances').ifNotExists()
    .addColumn('instance_id', 'text', (col) => col.primaryKey())
    .addColumn('template_id', 'text', (col) => col.notNull())
    .addColumn('created', 'text', (col) => col.notNull())
    .addColumn('created_by', 'text', (col) => col.notNull())
    .addColumn('properties', 'text')
    .addColumn('history', 'text')
    .execute();

  // Areas table
  await db.schema.createTable('areas').ifNotExists()
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

  // Abilities table
  await db.schema.createTable('abilities').ifNotExists()
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

  // Room states table
  await db.schema.createTable('room_states').ifNotExists()
    .addColumn('room_id', 'text', (col) => col.primaryKey())
    .addColumn('item_instances', 'text', (col) => col.notNull().defaultTo('[]'))
    .addColumn('npc_template_ids', 'text', (col) => col.notNull().defaultTo('[]'))
    .addColumn('currency_gold', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('currency_silver', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('currency_copper', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('items', 'text')
    .execute();

  // Merchant states table
  await db.schema.createTable('merchant_states').ifNotExists()
    .addColumn('npc_template_id', 'text', (col) => col.primaryKey())
    .addColumn('npc_instance_id', 'text', (col) => col.notNull())
    .addColumn('actual_inventory', 'text', (col) => col.notNull().defaultTo('[]'))
    .addColumn('stock_config', 'text', (col) => col.notNull().defaultTo('[]'))
    .execute();

  // Admins table
  await db.schema.createTable('admins').ifNotExists()
    .addColumn('username', 'text', (col) => col.primaryKey())
    .addColumn('level', 'text', (col) => col.notNull())
    .addColumn('added_by', 'text', (col) => col.notNull())
    .addColumn('added_on', 'text', (col) => col.notNull())
    .execute();

  // Bug reports table
  await db.schema.createTable('bug_reports').ifNotExists()
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

  // Snake scores table
  await db.schema.createTable('snake_scores').ifNotExists()
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('username', 'text', (col) => col.notNull())
    .addColumn('score', 'integer', (col) => col.notNull())
    .addColumn('date', 'text', (col) => col.notNull())
    .execute();

  // MUD config table (singleton)
  await db.schema.createTable('mud_config').ifNotExists()
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

  // Game timer config table (singleton)
  await db.schema.createTable('gametimer_config').ifNotExists()
    .addColumn('key', 'text', (col) => col.primaryKey())
    .addColumn('tick_interval', 'integer', (col) => col.notNull().defaultTo(6000))
    .addColumn('save_interval', 'integer', (col) => col.notNull().defaultTo(10))
    .execute();

  console.log('Tables created.\n');

  // Migrate users
  console.log('Migrating users...');
  const usersData = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
  let userCount = 0;

  // Wrap user migration in a transaction
  await db.transaction().execute(async (trx) => {
    for (const user of usersData) {
      await trx.insertInto('users').values({
        username: user.username,
        password_hash: user.passwordHash || '',
        salt: user.salt || '',
        health: user.health ?? 100,
        max_health: user.maxHealth ?? 100,
        mana: user.mana ?? 100,
        max_mana: user.maxMana ?? 100,
        experience: user.experience ?? 0,
        level: user.level ?? 1,
        strength: user.strength ?? 10,
        dexterity: user.dexterity ?? 10,
        agility: user.agility ?? 10,
        constitution: user.constitution ?? 10,
        wisdom: user.wisdom ?? 10,
        intelligence: user.intelligence ?? 10,
        charisma: user.charisma ?? 10,
        equipment: user.equipment ? JSON.stringify(user.equipment) : null,
        join_date: user.joinDate ? new Date(user.joinDate).toISOString() : new Date().toISOString(),
        last_login: user.lastLogin ? new Date(user.lastLogin).toISOString() : new Date().toISOString(),
        total_play_time: user.totalPlayTime ?? 0,
        current_room_id: user.currentRoomId || 'start',
        inventory_items: user.inventory?.items ? JSON.stringify(user.inventory.items) : null,
        inventory_gold: user.inventory?.currency?.gold ?? 0,
        inventory_silver: user.inventory?.currency?.silver ?? 0,
        inventory_copper: user.inventory?.currency?.copper ?? 0,
        bank_gold: user.bank?.gold ?? 0,
        bank_silver: user.bank?.silver ?? 0,
        bank_copper: user.bank?.copper ?? 0,
        in_combat: user.inCombat ? 1 : 0,
        is_unconscious: user.isUnconscious ? 1 : 0,
        is_resting: user.isResting ? 1 : 0,
        is_meditating: user.isMeditating ? 1 : 0,
        flags: user.flags ? JSON.stringify(user.flags) : null,
        pending_admin_messages: user.pendingAdminMessages ? JSON.stringify(user.pendingAdminMessages) : null,
        email: user.email || null,
        description: user.description || null,
      }).onConflict((oc) => oc.column('username').doNothing()).execute();
      userCount++;
    }
  });
  console.log(`Migrated ${userCount} users.\n`);

  // Migrate rooms
  console.log('Migrating rooms...');
  const roomsData = JSON.parse(fs.readFileSync(ROOMS_FILE, 'utf8'));
  let roomCount = 0;

  // Wrap room migration in a transaction
  await db.transaction().execute(async (trx) => {
    for (const room of roomsData) {
      await trx.insertInto('rooms').values({
        id: room.id,
        name: room.name || '',
        description: room.description || '',
        exits: JSON.stringify(room.exits || []),
        currency_gold: room.currency?.gold ?? 0,
        currency_silver: room.currency?.silver ?? 0,
        currency_copper: room.currency?.copper ?? 0,
        flags: room.flags ? JSON.stringify(room.flags) : null,
        npc_template_ids: room.npcs ? JSON.stringify(room.npcs) : null,
        item_instances: room.itemInstances ? JSON.stringify(room.itemInstances) : null,
      }).onConflict((oc) => oc.column('id').doNothing()).execute();
      roomCount++;
    }
  });
  console.log(`Migrated ${roomCount} rooms.\n`);

  // Migrate NPCs
  console.log('Migrating NPCs...');
  const npcsData = JSON.parse(fs.readFileSync(NPCS_FILE, 'utf8'));
  let npcCount = 0;

  // Wrap NPC migration in a transaction
  await db.transaction().execute(async (trx) => {
    for (const npc of npcsData) {
      const [damageMin, damageMax] = npc.damage || [1, 3];
      await trx.insertInto('npc_templates').values({
        id: npc.id,
        name: npc.name || '',
        description: npc.description || '',
        health: npc.health ?? 100,
        max_health: npc.maxHealth ?? npc.health ?? 100,
        damage_min: damageMin,
        damage_max: damageMax,
        is_hostile: npc.isHostile ? 1 : 0,
        is_passive: npc.isPassive ? 1 : 0,
        experience_value: npc.experienceValue ?? 50,
        attack_texts: JSON.stringify(npc.attackTexts || []),
        death_messages: JSON.stringify(npc.deathMessages || []),
        merchant: npc.merchant === undefined ? null : npc.merchant ? 1 : 0,
        inventory: npc.inventory ? JSON.stringify(npc.inventory) : null,
        stock_config: npc.stockConfig ? JSON.stringify(npc.stockConfig) : null,
      }).onConflict((oc) => oc.column('id').doNothing()).execute();
      npcCount++;
    }
  });
  console.log(`Migrated ${npcCount} NPCs.\n`);

  // Migrate item templates
  let itemTemplateCount = 0;
  if (fs.existsSync(ITEMS_FILE)) {
    console.log('Migrating item templates...');
    const itemsData = JSON.parse(fs.readFileSync(ITEMS_FILE, 'utf8'));
    await db.transaction().execute(async (trx) => {
      for (const item of itemsData) {
        await trx.insertInto('item_templates').values({
          id: item.id,
          name: item.name || '',
          description: item.description || '',
          type: item.type || 'misc',
          slot: item.slot || null,
          value: item.value ?? 0,
          weight: item.weight ?? null,
          global_limit: item.globalLimit ?? null,
          stats: item.stats ? JSON.stringify(item.stats) : null,
          requirements: item.requirements ? JSON.stringify(item.requirements) : null,
        }).onConflict((oc) => oc.column('id').doNothing()).execute();
        itemTemplateCount++;
      }
    });
    console.log(`Migrated ${itemTemplateCount} item templates.\n`);
  } else {
    console.log('Skipping item templates (file not found).\n');
  }

  // Migrate item instances
  let itemInstanceCount = 0;
  if (fs.existsSync(ITEM_INSTANCES_FILE)) {
    console.log('Migrating item instances...');
    const instancesData = JSON.parse(fs.readFileSync(ITEM_INSTANCES_FILE, 'utf8'));
    await db.transaction().execute(async (trx) => {
      for (const instance of instancesData) {
        await trx.insertInto('item_instances').values({
          instance_id: instance.instanceId,
          template_id: instance.templateId,
          created: instance.created || new Date().toISOString(),
          created_by: instance.createdBy || 'system',
          properties: instance.properties ? JSON.stringify(instance.properties) : null,
          history: instance.history ? JSON.stringify(instance.history) : null,
        }).onConflict((oc) => oc.column('instance_id').doNothing()).execute();
        itemInstanceCount++;
      }
    });
    console.log(`Migrated ${itemInstanceCount} item instances.\n`);
  } else {
    console.log('Skipping item instances (file not found).\n');
  }

  // Migrate areas
  let areaCount = 0;
  if (fs.existsSync(AREAS_FILE)) {
    console.log('Migrating areas...');
    const areasData = JSON.parse(fs.readFileSync(AREAS_FILE, 'utf8'));
    await db.transaction().execute(async (trx) => {
      for (const area of areasData) {
        await trx.insertInto('areas').values({
          id: area.id,
          name: area.name || '',
          description: area.description || '',
          level_range: JSON.stringify(area.levelRange || { min: 1, max: 10 }),
          flags: area.flags ? JSON.stringify(area.flags) : null,
          combat_config: area.combatConfig ? JSON.stringify(area.combatConfig) : null,
          spawn_config: JSON.stringify(area.spawnConfig || []),
          default_room_flags: area.defaultRoomFlags ? JSON.stringify(area.defaultRoomFlags) : null,
          created: area.created || new Date().toISOString(),
          modified: area.modified || new Date().toISOString(),
        }).onConflict((oc) => oc.column('id').doNothing()).execute();
        areaCount++;
      }
    });
    console.log(`Migrated ${areaCount} areas.\n`);
  } else {
    console.log('Skipping areas (file not found).\n');
  }

  // Migrate abilities
  let abilityCount = 0;
  if (fs.existsSync(ABILITIES_FILE)) {
    console.log('Migrating abilities...');
    const abilitiesData = JSON.parse(fs.readFileSync(ABILITIES_FILE, 'utf8'));
    await db.transaction().execute(async (trx) => {
      for (const ability of abilitiesData) {
        await trx.insertInto('abilities').values({
          id: ability.id,
          name: ability.name || '',
          description: ability.description || '',
          type: ability.type || 'standard',
          mp_cost: ability.mpCost ?? 0,
          cooldown_type: ability.cooldownType || 'none',
          cooldown_value: ability.cooldownValue ?? 0,
          target_type: ability.targetType || 'self',
          effects: JSON.stringify(ability.effects || []),
          requirements: ability.requirements ? JSON.stringify(ability.requirements) : null,
          proc_chance: ability.procChance ?? null,
          consumes_item: ability.consumesItem === undefined ? null : ability.consumesItem ? 1 : 0,
        }).onConflict((oc) => oc.column('id').doNothing()).execute();
        abilityCount++;
      }
    });
    console.log(`Migrated ${abilityCount} abilities.\n`);
  } else {
    console.log('Skipping abilities (file not found).\n');
  }

  // Migrate room states
  let roomStateCount = 0;
  if (fs.existsSync(ROOM_STATE_FILE)) {
    console.log('Migrating room states...');
    const roomStatesData = JSON.parse(fs.readFileSync(ROOM_STATE_FILE, 'utf8'));
    await db.transaction().execute(async (trx) => {
      for (const state of roomStatesData) {
        await trx.insertInto('room_states').values({
          room_id: state.roomId,
          item_instances: JSON.stringify(state.itemInstances || []),
          npc_template_ids: JSON.stringify(state.npcTemplateIds || []),
          currency_gold: state.currency?.gold ?? 0,
          currency_silver: state.currency?.silver ?? 0,
          currency_copper: state.currency?.copper ?? 0,
          items: state.items ? JSON.stringify(state.items) : null,
        }).onConflict((oc) => oc.column('room_id').doNothing()).execute();
        roomStateCount++;
      }
    });
    console.log(`Migrated ${roomStateCount} room states.\n`);
  } else {
    console.log('Skipping room states (file not found).\n');
  }

  // Migrate merchant states
  let merchantStateCount = 0;
  if (fs.existsSync(MERCHANT_STATE_FILE)) {
    console.log('Migrating merchant states...');
    const merchantData = JSON.parse(fs.readFileSync(MERCHANT_STATE_FILE, 'utf8'));
    await db.transaction().execute(async (trx) => {
      for (const merchant of merchantData) {
        await trx.insertInto('merchant_states').values({
          npc_template_id: merchant.npcTemplateId,
          npc_instance_id: merchant.npcInstanceId || '',
          actual_inventory: JSON.stringify(merchant.actualInventory || []),
          stock_config: JSON.stringify(merchant.stockConfig || []),
        }).onConflict((oc) => oc.column('npc_template_id').doNothing()).execute();
        merchantStateCount++;
      }
    });
    console.log(`Migrated ${merchantStateCount} merchant states.\n`);
  } else {
    console.log('Skipping merchant states (file not found).\n');
  }

  // Migrate admin auth
  let adminCount = 0;
  if (fs.existsSync(ADMIN_FILE)) {
    console.log('Migrating admin users...');
    const adminData = JSON.parse(fs.readFileSync(ADMIN_FILE, 'utf8'));
    const admins = adminData.admins || [];
    await db.transaction().execute(async (trx) => {
      for (const admin of admins) {
        await trx.insertInto('admins').values({
          username: admin.username,
          level: admin.level || 'admin',
          added_by: admin.addedBy || 'system',
          added_on: admin.addedOn || new Date().toISOString(),
        }).onConflict((oc) => oc.column('username').doNothing()).execute();
        adminCount++;
      }
    });
    console.log(`Migrated ${adminCount} admin users.\n`);
  } else {
    console.log('Skipping admin users (file not found).\n');
  }

  // Migrate bug reports
  let bugReportCount = 0;
  if (fs.existsSync(BUG_REPORTS_FILE)) {
    console.log('Migrating bug reports...');
    const bugData = JSON.parse(fs.readFileSync(BUG_REPORTS_FILE, 'utf8'));
    const reports = bugData.reports || [];
    await db.transaction().execute(async (trx) => {
      for (const report of reports) {
        await trx.insertInto('bug_reports').values({
          id: report.id,
          user: report.user || 'unknown',
          datetime: report.datetime || new Date().toISOString(),
          report: report.report || '',
          logs_raw: report.logs?.raw || null,
          logs_user: report.logs?.user || null,
          solved: report.solved ? 1 : 0,
          solved_on: report.solvedOn || null,
          solved_by: report.solvedBy || null,
          solved_reason: report.solvedReason || null,
        }).onConflict((oc) => oc.column('id').doNothing()).execute();
        bugReportCount++;
      }
    });
    console.log(`Migrated ${bugReportCount} bug reports.\n`);
  } else {
    console.log('Skipping bug reports (file not found).\n');
  }

  // Migrate snake scores
  let snakeScoreCount = 0;
  if (fs.existsSync(SNAKE_SCORES_FILE)) {
    console.log('Migrating snake scores...');
    const snakeData = JSON.parse(fs.readFileSync(SNAKE_SCORES_FILE, 'utf8'));
    const scores = snakeData.scores || [];
    await db.transaction().execute(async (trx) => {
      for (const score of scores) {
        await trx.insertInto('snake_scores').values({
          username: score.username,
          score: score.score ?? 0,
          date: score.date || new Date().toISOString(),
        }).execute();
        snakeScoreCount++;
      }
    });
    console.log(`Migrated ${snakeScoreCount} snake scores.\n`);
  } else {
    console.log('Skipping snake scores (file not found).\n');
  }

  // Migrate MUD config (singleton)
  let mudConfigMigrated = false;
  if (fs.existsSync(MUD_CONFIG_FILE)) {
    console.log('Migrating MUD config...');
    const config = JSON.parse(fs.readFileSync(MUD_CONFIG_FILE, 'utf8'));
    await db.insertInto('mud_config').values({
      key: 'singleton',
      data_files: JSON.stringify(config.dataFiles || {}),
      game_starting_room: config.game?.startingRoom || 'town-square',
      game_max_players: config.game?.maxPlayers ?? 100,
      game_idle_timeout: config.game?.idleTimeout ?? 30,
      game_max_password_attempts: config.game?.maxPasswordAttempts ?? 5,
      advanced_debug_mode: config.advanced?.debugMode ? 1 : 0,
      advanced_allow_registration: config.advanced?.allowRegistration !== false ? 1 : 0,
      advanced_backup_interval: config.advanced?.backupInterval ?? 6,
      advanced_log_level: config.advanced?.logLevel || 'info',
    }).onConflict((oc) => oc.column('key').doNothing()).execute();
    mudConfigMigrated = true;
    console.log('Migrated MUD config.\n');
  } else {
    console.log('Skipping MUD config (file not found).\n');
  }

  // Migrate game timer config (singleton)
  let timerConfigMigrated = false;
  if (fs.existsSync(GAMETIMER_CONFIG_FILE)) {
    console.log('Migrating game timer config...');
    const config = JSON.parse(fs.readFileSync(GAMETIMER_CONFIG_FILE, 'utf8'));
    await db.insertInto('gametimer_config').values({
      key: 'singleton',
      tick_interval: config.tickInterval ?? 6000,
      save_interval: config.saveInterval ?? 10,
    }).onConflict((oc) => oc.column('key').doNothing()).execute();
    timerConfigMigrated = true;
    console.log('Migrated game timer config.\n');
  } else {
    console.log('Skipping game timer config (file not found).\n');
  }

  await db.destroy();
  console.log('=== Migration Complete ===');
  console.log('Summary:');
  console.log(`  Users: ${userCount}`);
  console.log(`  Rooms: ${roomCount}`);
  console.log(`  NPCs: ${npcCount}`);
  console.log(`  Item Templates: ${itemTemplateCount}`);
  console.log(`  Item Instances: ${itemInstanceCount}`);
  console.log(`  Areas: ${areaCount}`);
  console.log(`  Abilities: ${abilityCount}`);
  console.log(`  Room States: ${roomStateCount}`);
  console.log(`  Merchant States: ${merchantStateCount}`);
  console.log(`  Admin Users: ${adminCount}`);
  console.log(`  Bug Reports: ${bugReportCount}`);
  console.log(`  Snake Scores: ${snakeScoreCount}`);
  console.log(`  MUD Config: ${mudConfigMigrated ? 'Yes' : 'No'}`);
  console.log(`  Timer Config: ${timerConfigMigrated ? 'Yes' : 'No'}`);
  console.log(`  Database: ${DB_PATH}`);
}

migrate().catch((err) => { console.error('Migration failed:', err); process.exit(1); });
