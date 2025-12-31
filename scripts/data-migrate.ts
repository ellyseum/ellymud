#!/usr/bin/env ts-node
/**
 * EllyMUD Data Migration Tool
 * 
 * Bidirectional migration between JSON files and database (SQLite/PostgreSQL)
 * 
 * Usage:
 *   npx ts-node scripts/data-migrate.ts <command> [options]
 * 
 * Commands:
 *   status          Show current backend configuration and data counts
 *   export          Export database → JSON files
 *   import          Import JSON files → database
 *   backup          Create timestamped backup of all data
 *   switch <target> Switch to target backend (json|sqlite|postgres)
 * 
 * Options:
 *   --db-url <url>  Database URL (for postgres, overrides DATABASE_URL)
 *   --db-path <path> SQLite database path (default: data/game.db)
 *   --force         Overwrite existing data without confirmation
 *   --dry-run       Show what would be done without making changes
 * 
 * Examples:
 *   npx ts-node scripts/data-migrate.ts status
 *   npx ts-node scripts/data-migrate.ts export
 *   npx ts-node scripts/data-migrate.ts import --force
 *   npx ts-node scripts/data-migrate.ts switch sqlite
 *   npx ts-node scripts/data-migrate.ts switch postgres --db-url "postgres://..."
 */

import fs from 'fs';
import path from 'path';
import { Kysely, SqliteDialect, PostgresDialect } from 'kysely';
import { Database as DatabaseSchema } from '../src/data/schema';

// ============================================================================
// Configuration
// ============================================================================

const DATA_DIR = path.join(__dirname, '..', 'data');
const BACKUP_DIR = path.join(__dirname, '..', 'backups');
const DEFAULT_DB_PATH = path.join(DATA_DIR, 'game.db');

const JSON_FILES = {
  users: path.join(DATA_DIR, 'users.json'),
  rooms: path.join(DATA_DIR, 'rooms.json'),
  items: path.join(DATA_DIR, 'items.json'),
  itemInstances: path.join(DATA_DIR, 'itemInstances.json'),
};

interface Options {
  dbUrl?: string;
  dbPath?: string;
  force?: boolean;
  dryRun?: boolean;
}

// ============================================================================
// Database Connection
// ============================================================================

function createDatabase(backend: 'sqlite' | 'postgres', options: Options): Kysely<DatabaseSchema> {
  if (backend === 'postgres') {
    const url = options.dbUrl || process.env.DATABASE_URL;
    if (!url) {
      throw new Error('PostgreSQL requires DATABASE_URL or --db-url option');
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Pool } = require('pg');
    return new Kysely<DatabaseSchema>({
      dialect: new PostgresDialect({ pool: new Pool({ connectionString: url, max: 5 }) }),
    });
  }

  const dbPath = options.dbPath || DEFAULT_DB_PATH;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Database = require('better-sqlite3');
  return new Kysely<DatabaseSchema>({
    dialect: new SqliteDialect({ database: new Database(dbPath) }),
  });
}

async function initializeTables(db: Kysely<DatabaseSchema>): Promise<void> {
  // Users table
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

  // Rooms table
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
}

// ============================================================================
// JSON ↔ Database Type Converters
// ============================================================================

interface JsonUser {
  username: string;
  passwordHash?: string;
  salt?: string;
  health?: number;
  maxHealth?: number;
  mana?: number;
  maxMana?: number;
  experience?: number;
  level?: number;
  strength?: number;
  dexterity?: number;
  agility?: number;
  constitution?: number;
  wisdom?: number;
  intelligence?: number;
  charisma?: number;
  equipment?: Record<string, unknown>;
  joinDate?: string;
  lastLogin?: string;
  totalPlayTime?: number;
  currentRoomId?: string;
  inventory?: { items?: string[]; currency?: { gold?: number; silver?: number; copper?: number } };
  bank?: { gold?: number; silver?: number; copper?: number };
  inCombat?: boolean;
  isUnconscious?: boolean;
  isResting?: boolean;
  isMeditating?: boolean;
  flags?: Record<string, unknown>;
  pendingAdminMessages?: unknown[];
  email?: string;
  description?: string;
}

interface JsonRoom {
  id: string;
  name?: string;
  description?: string;
  exits?: Array<{ direction: string; targetRoomId: string }>;
  currency?: { gold?: number; silver?: number; copper?: number };
  flags?: Record<string, unknown>;
  npcs?: string[];
  itemInstances?: string[];
}

interface JsonItem {
  id: string;
  name?: string;
  description?: string;
  type?: string;
  slot?: string;
  value?: number;
  weight?: number;
  globalLimit?: number;
  stats?: Record<string, unknown>;
  requirements?: Record<string, unknown>;
}

interface JsonItemInstance {
  instanceId: string;
  templateId: string;
  created: string | Date;
  createdBy?: string;
  properties?: Record<string, unknown>;
  history?: Array<{ timestamp: string | Date; event: string; details?: string }>;
}

// ============================================================================
// Import: JSON → Database
// ============================================================================

async function importJsonToDb(db: Kysely<DatabaseSchema>, options: Options): Promise<void> {
  console.log('Importing JSON files → Database...\n');

  // Import users
  if (fs.existsSync(JSON_FILES.users)) {
    const users: JsonUser[] = JSON.parse(fs.readFileSync(JSON_FILES.users, 'utf8'));
    console.log(`  Users: ${users.length} records`);
    
    if (!options.dryRun) {
      await db.transaction().execute(async (trx) => {
        for (const user of users) {
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
          }).onConflict((oc) => oc.column('username').doUpdateSet({
            health: user.health ?? 100,
            max_health: user.maxHealth ?? 100,
            mana: user.mana ?? 100,
            max_mana: user.maxMana ?? 100,
            experience: user.experience ?? 0,
            level: user.level ?? 1,
            current_room_id: user.currentRoomId || 'start',
          })).execute();
        }
      });
    }
  }

  // Import rooms
  if (fs.existsSync(JSON_FILES.rooms)) {
    const rooms: JsonRoom[] = JSON.parse(fs.readFileSync(JSON_FILES.rooms, 'utf8'));
    console.log(`  Rooms: ${rooms.length} records`);
    
    if (!options.dryRun) {
      await db.transaction().execute(async (trx) => {
        for (const room of rooms) {
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
          }).onConflict((oc) => oc.column('id').doUpdateSet({
            name: room.name || '',
            description: room.description || '',
            exits: JSON.stringify(room.exits || []),
          })).execute();
        }
      });
    }
  }

  // Import item templates
  if (fs.existsSync(JSON_FILES.items)) {
    const items: JsonItem[] = JSON.parse(fs.readFileSync(JSON_FILES.items, 'utf8'));
    console.log(`  Items: ${items.length} records`);
    
    if (!options.dryRun) {
      await db.transaction().execute(async (trx) => {
        for (const item of items) {
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
          }).onConflict((oc) => oc.column('id').doUpdateSet({
            name: item.name || '',
            description: item.description || '',
            type: item.type || 'misc',
            value: item.value ?? 0,
          })).execute();
        }
      });
    }
  }

  // Import item instances
  if (fs.existsSync(JSON_FILES.itemInstances)) {
    const instances: JsonItemInstance[] = JSON.parse(fs.readFileSync(JSON_FILES.itemInstances, 'utf8'));
    console.log(`  Item Instances: ${instances.length} records`);
    
    if (!options.dryRun) {
      await db.transaction().execute(async (trx) => {
        for (const instance of instances) {
          let historyJson: string | null = null;
          if (instance.history && Array.isArray(instance.history)) {
            const convertedHistory = instance.history.map((entry) => ({
              ...entry,
              timestamp: entry.timestamp instanceof Date 
                ? entry.timestamp.toISOString() 
                : new Date(entry.timestamp).toISOString(),
            }));
            historyJson = JSON.stringify(convertedHistory);
          }
          
          await trx.insertInto('item_instances').values({
            instance_id: instance.instanceId,
            template_id: instance.templateId,
            created: instance.created instanceof Date 
              ? instance.created.toISOString() 
              : new Date(instance.created).toISOString(),
            created_by: instance.createdBy || 'system',
            properties: instance.properties ? JSON.stringify(instance.properties) : null,
            history: historyJson,
          }).onConflict((oc) => oc.column('instance_id').doUpdateSet({
            properties: instance.properties ? JSON.stringify(instance.properties) : null,
            history: historyJson,
          })).execute();
        }
      });
    }
  }

  console.log(options.dryRun ? '\n[DRY RUN] No changes made.' : '\n✅ Import complete.');
}

// ============================================================================
// Export: Database → JSON
// ============================================================================

async function exportDbToJson(db: Kysely<DatabaseSchema>, options: Options): Promise<void> {
  console.log('Exporting Database → JSON files...\n');

  // Helper to safely parse JSON
  const safeJsonParse = <T>(value: string | null | undefined, fallback: T): T => {
    if (value == null) return fallback;
    try { return JSON.parse(value) as T; } catch { return fallback; }
  };

  // Export users
  const dbUsers = await db.selectFrom('users').selectAll().execute();
  const jsonUsers: JsonUser[] = dbUsers.map((u) => ({
    username: u.username,
    passwordHash: u.password_hash,
    salt: u.salt,
    health: u.health,
    maxHealth: u.max_health,
    mana: u.mana,
    maxMana: u.max_mana,
    experience: u.experience,
    level: u.level,
    strength: u.strength,
    dexterity: u.dexterity,
    agility: u.agility,
    constitution: u.constitution,
    wisdom: u.wisdom,
    intelligence: u.intelligence,
    charisma: u.charisma,
    equipment: safeJsonParse(u.equipment, undefined),
    joinDate: u.join_date,
    lastLogin: u.last_login,
    totalPlayTime: u.total_play_time,
    currentRoomId: u.current_room_id,
    inventory: {
      items: safeJsonParse<string[]>(u.inventory_items, []),
      currency: { gold: u.inventory_gold, silver: u.inventory_silver, copper: u.inventory_copper },
    },
    bank: { gold: u.bank_gold, silver: u.bank_silver, copper: u.bank_copper },
    inCombat: u.in_combat === 1,
    isUnconscious: u.is_unconscious === 1,
    isResting: u.is_resting === 1,
    isMeditating: u.is_meditating === 1,
    flags: safeJsonParse(u.flags, undefined),
    pendingAdminMessages: safeJsonParse(u.pending_admin_messages, undefined),
    email: u.email || undefined,
    description: u.description || undefined,
  }));
  console.log(`  Users: ${jsonUsers.length} records`);
  if (!options.dryRun) {
    fs.writeFileSync(JSON_FILES.users, JSON.stringify(jsonUsers, null, 2));
  }

  // Export rooms
  const dbRooms = await db.selectFrom('rooms').selectAll().execute();
  const jsonRooms: JsonRoom[] = dbRooms.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    exits: safeJsonParse(r.exits, []),
    currency: { gold: r.currency_gold, silver: r.currency_silver, copper: r.currency_copper },
    flags: safeJsonParse(r.flags, undefined),
    npcs: safeJsonParse(r.npc_template_ids, undefined),
    itemInstances: safeJsonParse(r.item_instances, undefined),
  }));
  console.log(`  Rooms: ${jsonRooms.length} records`);
  if (!options.dryRun) {
    fs.writeFileSync(JSON_FILES.rooms, JSON.stringify(jsonRooms, null, 2));
  }

  // Export item templates
  const dbItems = await db.selectFrom('item_templates').selectAll().execute();
  const jsonItems: JsonItem[] = dbItems.map((i) => ({
    id: i.id,
    name: i.name,
    description: i.description,
    type: i.type,
    slot: i.slot || undefined,
    value: i.value,
    weight: i.weight ?? undefined,
    globalLimit: i.global_limit ?? undefined,
    stats: safeJsonParse(i.stats, undefined),
    requirements: safeJsonParse(i.requirements, undefined),
  }));
  console.log(`  Items: ${jsonItems.length} records`);
  if (!options.dryRun) {
    fs.writeFileSync(JSON_FILES.items, JSON.stringify(jsonItems, null, 2));
  }

  // Export item instances
  const dbInstances = await db.selectFrom('item_instances').selectAll().execute();
  const jsonInstances: JsonItemInstance[] = dbInstances.map((inst) => ({
    instanceId: inst.instance_id,
    templateId: inst.template_id,
    created: inst.created,
    createdBy: inst.created_by,
    properties: safeJsonParse(inst.properties, undefined),
    history: safeJsonParse(inst.history, undefined),
  }));
  console.log(`  Item Instances: ${jsonInstances.length} records`);
  if (!options.dryRun) {
    fs.writeFileSync(JSON_FILES.itemInstances, JSON.stringify(jsonInstances, null, 2));
  }

  console.log(options.dryRun ? '\n[DRY RUN] No changes made.' : '\n✅ Export complete.');
}

// ============================================================================
// Status Command
// ============================================================================

async function showStatus(options: Options): Promise<void> {
  const currentBackend = process.env.STORAGE_BACKEND || 'json';
  
  console.log('=== EllyMUD Data Status ===\n');
  console.log(`Current Backend: ${currentBackend.toUpperCase()}`);
  console.log(`Database URL: ${process.env.DATABASE_URL || '(not set)'}`);
  console.log(`SQLite Path: ${options.dbPath || DEFAULT_DB_PATH}`);
  console.log('');

  // JSON file counts
  console.log('JSON Files:');
  for (const [name, filePath] of Object.entries(JSON_FILES)) {
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      console.log(`  ${name}: ${Array.isArray(data) ? data.length : 'N/A'} records`);
    } else {
      console.log(`  ${name}: (not found)`);
    }
  }

  // Database counts (if available)
  const dbPath = options.dbPath || DEFAULT_DB_PATH;
  if (fs.existsSync(dbPath)) {
    console.log('\nSQLite Database:');
    try {
      const db = createDatabase('sqlite', options);
      const users = await db.selectFrom('users').select(db.fn.count('username').as('count')).executeTakeFirst();
      const rooms = await db.selectFrom('rooms').select(db.fn.count('id').as('count')).executeTakeFirst();
      const items = await db.selectFrom('item_templates').select(db.fn.count('id').as('count')).executeTakeFirst();
      const instances = await db.selectFrom('item_instances').select(db.fn.count('instance_id').as('count')).executeTakeFirst();
      console.log(`  users: ${users?.count ?? 0} records`);
      console.log(`  rooms: ${rooms?.count ?? 0} records`);
      console.log(`  items: ${items?.count ?? 0} records`);
      console.log(`  itemInstances: ${instances?.count ?? 0} records`);
      await db.destroy();
    } catch (err) {
      console.log(`  (error reading database: ${err instanceof Error ? err.message : String(err)})`);
    }
  } else {
    console.log('\nSQLite Database: (not found)');
  }

  // PostgreSQL counts (if configured)
  if (process.env.DATABASE_URL || options.dbUrl) {
    console.log('\nPostgreSQL Database:');
    try {
      const db = createDatabase('postgres', options);
      const users = await db.selectFrom('users').select(db.fn.count('username').as('count')).executeTakeFirst();
      const rooms = await db.selectFrom('rooms').select(db.fn.count('id').as('count')).executeTakeFirst();
      const items = await db.selectFrom('item_templates').select(db.fn.count('id').as('count')).executeTakeFirst();
      const instances = await db.selectFrom('item_instances').select(db.fn.count('instance_id').as('count')).executeTakeFirst();
      console.log(`  users: ${users?.count ?? 0} records`);
      console.log(`  rooms: ${rooms?.count ?? 0} records`);
      console.log(`  items: ${items?.count ?? 0} records`);
      console.log(`  itemInstances: ${instances?.count ?? 0} records`);
      await db.destroy();
    } catch (err) {
      console.log(`  (error reading database: ${err instanceof Error ? err.message : String(err)})`);
    }
  }
}

// ============================================================================
// Backup Command
// ============================================================================

async function createBackup(options: Options): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupPath = path.join(BACKUP_DIR, `data-${timestamp}`);
  
  console.log(`Creating backup at: ${backupPath}\n`);
  
  if (!options.dryRun) {
    fs.mkdirSync(backupPath, { recursive: true });

    // Backup JSON files
    for (const [name, filePath] of Object.entries(JSON_FILES)) {
      if (fs.existsSync(filePath)) {
        fs.copyFileSync(filePath, path.join(backupPath, `${name}.json`));
        console.log(`  ✓ ${name}.json`);
      }
    }

    // Backup SQLite database
    const dbPath = options.dbPath || DEFAULT_DB_PATH;
    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, path.join(backupPath, 'game.db'));
      console.log('  ✓ game.db');
    }
  }

  console.log(options.dryRun ? '\n[DRY RUN] No backup created.' : '\n✅ Backup complete.');
  return backupPath;
}

// ============================================================================
// Switch Command
// ============================================================================

async function switchBackend(target: string, options: Options): Promise<void> {
  const validTargets = ['json', 'sqlite', 'postgres'];
  if (!validTargets.includes(target)) {
    console.error(`Invalid target: ${target}. Must be one of: ${validTargets.join(', ')}`);
    process.exit(1);
  }

  const currentBackend = process.env.STORAGE_BACKEND || 'json';
  console.log(`=== Switching Backend: ${currentBackend} → ${target} ===\n`);

  if (currentBackend === target) {
    console.log('Already using this backend. Nothing to do.');
    return;
  }

  // Step 1: Create backup
  console.log('Step 1: Creating backup...');
  await createBackup(options);
  console.log('');

  // Step 2: Export from current backend
  console.log('Step 2: Exporting from current backend...');
  if (currentBackend === 'json') {
    console.log('  (Source is JSON files, no export needed)');
  } else {
    const sourceDb = createDatabase(currentBackend as 'sqlite' | 'postgres', options);
    await exportDbToJson(sourceDb, options);
    await sourceDb.destroy();
  }
  console.log('');

  // Step 3: Import to target backend
  console.log('Step 3: Importing to target backend...');
  if (target === 'json') {
    console.log('  (Target is JSON files, no import needed)');
  } else {
    const targetDb = createDatabase(target as 'sqlite' | 'postgres', options);
    await initializeTables(targetDb);
    await importJsonToDb(targetDb, options);
    await targetDb.destroy();
  }
  console.log('');

  // Step 4: Show how to update config
  console.log('Step 4: Update your configuration\n');
  console.log('  Option A: Set environment variable');
  console.log(`    export STORAGE_BACKEND=${target}`);
  if (target === 'postgres') {
    console.log('    export DATABASE_URL=postgres://user:pass@host:5432/dbname');
  }
  console.log('');
  console.log('  Option B: Add to .env file');
  console.log(`    STORAGE_BACKEND=${target}`);
  if (target === 'postgres') {
    console.log('    DATABASE_URL=postgres://user:pass@host:5432/dbname');
  }
  console.log('');
  console.log('✅ Switch complete! Restart the server to use the new backend.');
}

// ============================================================================
// CLI Entry Point
// ============================================================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  const options: Options = {
    dbUrl: args.find((_, i) => args[i - 1] === '--db-url'),
    dbPath: args.find((_, i) => args[i - 1] === '--db-path'),
    force: args.includes('--force'),
    dryRun: args.includes('--dry-run'),
  };

  console.log('=== EllyMUD Data Migration Tool ===\n');

  switch (command) {
    case 'status':
      await showStatus(options);
      break;

    case 'export': {
      const exportBackend = process.env.STORAGE_BACKEND || 'sqlite';
      if (exportBackend === 'json') {
        console.log('Current backend is JSON. Nothing to export.');
        break;
      }
      const exportDb = createDatabase(exportBackend as 'sqlite' | 'postgres', options);
      await exportDbToJson(exportDb, options);
      await exportDb.destroy();
      break;
    }

    case 'import': {
      const importBackend = args[1] as 'sqlite' | 'postgres' || 'sqlite';
      const importDb = createDatabase(importBackend, options);
      await initializeTables(importDb);
      await importJsonToDb(importDb, options);
      await importDb.destroy();
      break;
    }

    case 'backup':
      await createBackup(options);
      break;

    case 'switch': {
      const target = args[1];
      if (!target) {
        console.error('Usage: data-migrate.ts switch <json|sqlite|postgres>');
        process.exit(1);
      }
      await switchBackend(target, options);
      break;
    }

    default:
      console.log(`Usage: npx ts-node scripts/data-migrate.ts <command> [options]

Commands:
  status              Show current backend and data counts
  export              Export database → JSON files
  import [backend]    Import JSON files → database (default: sqlite)
  backup              Create timestamped backup
  switch <backend>    Switch to backend (json|sqlite|postgres)

Options:
  --db-url <url>      PostgreSQL connection URL
  --db-path <path>    SQLite database path (default: data/game.db)
  --force             Overwrite without confirmation
  --dry-run           Show what would be done

Examples:
  npx ts-node scripts/data-migrate.ts status
  npx ts-node scripts/data-migrate.ts switch sqlite
  npx ts-node scripts/data-migrate.ts switch postgres --db-url "postgres://..."
  npx ts-node scripts/data-migrate.ts export --dry-run
`);
      break;
  }
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
