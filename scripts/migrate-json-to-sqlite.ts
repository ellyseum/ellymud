#!/usr/bin/env ts-node
/**
 * Migration script: JSON files to SQLite database
 * Run: npx ts-node scripts/migrate-json-to-sqlite.ts
 */
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { Kysely, SqliteDialect } from 'kysely';
import { Database as DatabaseSchema } from '../src/data/schema';

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'game.db');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const ROOMS_FILE = path.join(DATA_DIR, 'rooms.json');

async function migrate(): Promise<void> {
  console.log('=== EllyMUD JSON to SQLite Migration ===\n');

  if (!fs.existsSync(USERS_FILE)) { console.error(`ERROR: ${USERS_FILE} not found`); process.exit(1); }
  if (!fs.existsSync(ROOMS_FILE)) { console.error(`ERROR: ${ROOMS_FILE} not found`); process.exit(1); }

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
        inventory_copper: user.inventory?.copper ?? 0,
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

  await db.destroy();
  console.log('=== Migration Complete ===');
  console.log(`Users: ${userCount} | Rooms: ${roomCount} | Database: ${DB_PATH}`);
}

migrate().catch((err) => { console.error('Migration failed:', err); process.exit(1); });
