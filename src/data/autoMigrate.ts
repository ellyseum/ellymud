/**
 * Auto-Migration Module for EllyMUD
 *
 * Automatically syncs data between JSON files and database when the storage
 * backend changes. This enables seamless development workflow:
 *
 * 1. Edit JSON files in dev mode (STORAGE_BACKEND=json)
 * 2. Switch to database for prod (STORAGE_BACKEND=sqlite|postgres)
 * 3. Data auto-migrates on startup
 *
 * The last used backend is tracked in data/.backend-state
 */

import fs from 'fs';
import path from 'path';
import type { Kysely } from 'kysely';
import { STORAGE_BACKEND } from '../config';
import { systemLogger } from '../utils/logger';
import type { Database as DatabaseSchema } from './schema';

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const BACKEND_STATE_FILE = path.join(DATA_DIR, '.backend-state');

type StorageBackend = 'json' | 'sqlite' | 'postgres' | 'auto';

interface BackendState {
  lastBackend: StorageBackend;
  lastSync: string;
  version: number;
}

/**
 * Read the last known backend state from marker file
 */
function readBackendState(): BackendState | null {
  try {
    if (fs.existsSync(BACKEND_STATE_FILE)) {
      const content = fs.readFileSync(BACKEND_STATE_FILE, 'utf-8');
      return JSON.parse(content) as BackendState;
    }
  } catch (error) {
    systemLogger.warn('[AutoMigrate] Failed to read backend state:', error);
  }
  return null;
}

/**
 * Write the current backend state to marker file
 */
function writeBackendState(backend: StorageBackend): void {
  try {
    const state: BackendState = {
      lastBackend: backend,
      lastSync: new Date().toISOString(),
      version: 1,
    };
    fs.writeFileSync(BACKEND_STATE_FILE, JSON.stringify(state, null, 2));
    systemLogger.debug(`[AutoMigrate] Updated backend state to: ${backend}`);
  } catch (error) {
    systemLogger.error('[AutoMigrate] Failed to write backend state:', error);
  }
}

/**
 * Determine the effective backend (resolves 'auto' to actual backend)
 */
function getEffectiveBackend(): 'json' | 'sqlite' | 'postgres' {
  if (STORAGE_BACKEND === 'auto') {
    // Auto mode defaults to sqlite with json fallback
    return 'sqlite';
  }
  return STORAGE_BACKEND as 'json' | 'sqlite' | 'postgres';
}

/**
 * Import data from JSON files to database
 * Uses the data-migrate script logic inline
 */
async function importJsonToDatabase(): Promise<void> {
  const { Kysely, SqliteDialect, PostgresDialect } = await import('kysely');
  const { DATABASE_URL } = await import('../config');

  const effectiveBackend = getEffectiveBackend();

  // Create database connection
  let db: Kysely<DatabaseSchema>;

  if (effectiveBackend === 'postgres') {
    if (!DATABASE_URL) {
      throw new Error('DATABASE_URL required for postgres backend');
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Pool } = require('pg');
    db = new Kysely<DatabaseSchema>({
      dialect: new PostgresDialect({
        pool: new Pool({ connectionString: DATABASE_URL, max: 5 }),
      }),
    });
  } else {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Database = require('better-sqlite3');
    const dbPath = path.join(DATA_DIR, 'game.db');
    db = new Kysely<DatabaseSchema>({
      dialect: new SqliteDialect({ database: new Database(dbPath) }),
    });
  }

  try {
    // Import users
    const usersFile = path.join(DATA_DIR, 'users.json');
    if (fs.existsSync(usersFile)) {
      const users = JSON.parse(fs.readFileSync(usersFile, 'utf-8'));
      if (Array.isArray(users) && users.length > 0) {
        // Delete existing and insert fresh
        await db.deleteFrom('users' as never).execute();
        for (const user of users) {
          await db
            .insertInto('users' as never)
            .values({
              username: user.username,
              password_hash: user.passwordHash,
              salt: user.salt,
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
              equipment: JSON.stringify(user.equipment ?? {}),
              join_date: user.joinDate ?? new Date().toISOString(),
              last_login: user.lastLogin ?? new Date().toISOString(),
              total_play_time: user.totalPlayTime ?? 0,
              current_room_id: user.currentRoomId ?? 'town_square',
              inventory_items: JSON.stringify(user.inventory?.items ?? []),
              inventory_gold: user.inventory?.gold ?? 0,
              inventory_silver: user.inventory?.silver ?? 0,
              inventory_copper: user.inventory?.copper ?? 0,
              bank_gold: user.bank?.gold ?? 0,
              bank_silver: user.bank?.silver ?? 0,
              bank_copper: user.bank?.copper ?? 0,
              in_combat: user.inCombat ? 1 : 0,
              is_unconscious: user.isUnconscious ? 1 : 0,
              is_resting: user.isResting ? 1 : 0,
              is_meditating: user.isMeditating ? 1 : 0,
              flags: JSON.stringify(user.flags ?? {}),
              pending_admin_messages: JSON.stringify(user.pendingAdminMessages ?? []),
              email: user.email ?? null,
              description: user.description ?? null,
            } as never)
            .execute();
        }
        systemLogger.info(`[AutoMigrate] Imported ${users.length} users to database`);
      }
    }

    // Import rooms
    const roomsFile = path.join(DATA_DIR, 'rooms.json');
    if (fs.existsSync(roomsFile)) {
      const rooms = JSON.parse(fs.readFileSync(roomsFile, 'utf-8'));
      if (Array.isArray(rooms) && rooms.length > 0) {
        await db.deleteFrom('rooms' as never).execute();
        for (const room of rooms) {
          await db
            .insertInto('rooms' as never)
            .values({
              id: room.id,
              name: room.name,
              description: room.description,
              exits: JSON.stringify(room.exits ?? {}),
              currency_gold: room.currency?.gold ?? 0,
              currency_silver: room.currency?.silver ?? 0,
              currency_copper: room.currency?.copper ?? 0,
              flags: JSON.stringify(room.flags ?? {}),
              npc_template_ids: JSON.stringify(room.npcs ?? []),
              item_instances: JSON.stringify(room.itemInstances ?? []),
            } as never)
            .execute();
        }
        systemLogger.info(`[AutoMigrate] Imported ${rooms.length} rooms to database`);
      }
    }

    // Import items
    const itemsFile = path.join(DATA_DIR, 'items.json');
    if (fs.existsSync(itemsFile)) {
      const items = JSON.parse(fs.readFileSync(itemsFile, 'utf-8'));
      if (Array.isArray(items) && items.length > 0) {
        await db.deleteFrom('item_templates' as never).execute();
        for (const item of items) {
          await db
            .insertInto('item_templates' as never)
            .values({
              id: item.id,
              name: item.name,
              description: item.description,
              type: item.type,
              weight: item.weight ?? 0,
              value: item.value ?? 0,
              rarity: item.rarity ?? 'common',
              slot: item.slot ?? null,
              stats: JSON.stringify(item.stats ?? {}),
              effects: JSON.stringify(item.effects ?? []),
              requirements: JSON.stringify(item.requirements ?? {}),
              flags: JSON.stringify(item.flags ?? {}),
              metadata: JSON.stringify(item.metadata ?? {}),
            } as never)
            .execute();
        }
        systemLogger.info(`[AutoMigrate] Imported ${items.length} item templates to database`);
      }
    }

    // Import item instances
    const itemInstancesFile = path.join(DATA_DIR, 'itemInstances.json');
    if (fs.existsSync(itemInstancesFile)) {
      const instances = JSON.parse(fs.readFileSync(itemInstancesFile, 'utf-8'));
      if (Array.isArray(instances) && instances.length > 0) {
        await db.deleteFrom('item_instances' as never).execute();
        for (const instance of instances) {
          await db
            .insertInto('item_instances' as never)
            .values({
              instance_id: instance.instanceId,
              template_id: instance.templateId,
              owner_type: instance.ownerType,
              owner_id: instance.ownerId,
              condition: instance.condition ?? 100,
              custom_name: instance.customName ?? null,
              custom_description: instance.customDescription ?? null,
              custom_stats: JSON.stringify(instance.customStats ?? {}),
              custom_effects: JSON.stringify(instance.customEffects ?? []),
              history: JSON.stringify(instance.history ?? []),
              created_at: instance.createdAt ?? new Date().toISOString(),
              updated_at: instance.updatedAt ?? new Date().toISOString(),
            } as never)
            .execute();
        }
        systemLogger.info(`[AutoMigrate] Imported ${instances.length} item instances to database`);
      }
    }

    // Import NPC templates
    const npcsFile = path.join(DATA_DIR, 'npcs.json');
    if (fs.existsSync(npcsFile)) {
      const npcs = JSON.parse(fs.readFileSync(npcsFile, 'utf-8'));
      if (Array.isArray(npcs) && npcs.length > 0) {
        await db.deleteFrom('npc_templates' as never).execute();
        for (const npc of npcs) {
          const [damageMin, damageMax] = npc.damage || [1, 2];
          await db
            .insertInto('npc_templates' as never)
            .values({
              id: npc.id,
              name: npc.name,
              description: npc.description,
              health: npc.health ?? 100,
              max_health: npc.maxHealth ?? npc.health ?? 100,
              damage_min: damageMin,
              damage_max: damageMax,
              is_hostile: npc.isHostile ? 1 : 0,
              is_passive: npc.isPassive ? 1 : 0,
              experience_value: npc.experienceValue ?? 0,
              attack_texts: JSON.stringify(npc.attackTexts ?? []),
              death_messages: JSON.stringify(npc.deathMessages ?? []),
              merchant: npc.merchant ? 1 : null,
              inventory: JSON.stringify(npc.inventory ?? []),
              stock_config: npc.stockConfig ? JSON.stringify(npc.stockConfig) : null,
            } as never)
            .execute();
        }
        systemLogger.info(`[AutoMigrate] Imported ${npcs.length} NPC templates to database`);
      }
    }
  } finally {
    await db.destroy();
  }
}

/**
 * Export data from database to JSON files
 */
async function exportDatabaseToJson(sourceBackend: 'sqlite' | 'postgres'): Promise<void> {
  const { Kysely, SqliteDialect, PostgresDialect } = await import('kysely');
  const { DATABASE_URL } = await import('../config');

  // Create database connection
  let db: Kysely<DatabaseSchema>;

  if (sourceBackend === 'postgres') {
    if (!DATABASE_URL) {
      throw new Error('DATABASE_URL required for postgres backend');
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Pool } = require('pg');
    db = new Kysely<DatabaseSchema>({
      dialect: new PostgresDialect({
        pool: new Pool({ connectionString: DATABASE_URL, max: 5 }),
      }),
    });
  } else {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Database = require('better-sqlite3');
    const dbPath = path.join(DATA_DIR, 'game.db');
    db = new Kysely<DatabaseSchema>({
      dialect: new SqliteDialect({ database: new Database(dbPath) }),
    });
  }

  try {
    // Export users
    const userRows = await db.selectFrom('users' as never).selectAll().execute();
    if (userRows.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const users = userRows.map((row: any) => ({
        username: row.username,
        passwordHash: row.password_hash,
        salt: row.salt,
        health: row.health,
        maxHealth: row.max_health,
        mana: row.mana,
        maxMana: row.max_mana,
        experience: row.experience,
        level: row.level,
        strength: row.strength,
        dexterity: row.dexterity,
        agility: row.agility,
        constitution: row.constitution,
        wisdom: row.wisdom,
        intelligence: row.intelligence,
        charisma: row.charisma,
        equipment: JSON.parse(row.equipment || '{}'),
        joinDate: row.join_date,
        lastLogin: row.last_login,
        totalPlayTime: row.total_play_time,
        currentRoomId: row.current_room_id,
        inventory: {
          items: JSON.parse(row.inventory_items || '[]'),
          gold: row.inventory_gold,
          silver: row.inventory_silver,
          copper: row.inventory_copper,
        },
        bank: {
          gold: row.bank_gold,
          silver: row.bank_silver,
          copper: row.bank_copper,
        },
        inCombat: row.in_combat === 1,
        isUnconscious: row.is_unconscious === 1,
        isResting: row.is_resting === 1,
        isMeditating: row.is_meditating === 1,
        flags: JSON.parse(row.flags || '{}'),
        pendingAdminMessages: JSON.parse(row.pending_admin_messages || '[]'),
        email: row.email,
        description: row.description,
      }));
      fs.writeFileSync(path.join(DATA_DIR, 'users.json'), JSON.stringify(users, null, 2));
      systemLogger.info(`[AutoMigrate] Exported ${users.length} users to JSON`);
    }

    // Export rooms
    const roomRows = await db.selectFrom('rooms' as never).selectAll().execute();
    if (roomRows.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rooms = roomRows.map((row: any) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        exits: JSON.parse(row.exits || '{}'),
        currency: {
          gold: row.currency_gold,
          silver: row.currency_silver,
          copper: row.currency_copper,
        },
        flags: JSON.parse(row.flags || '{}'),
        npcs: JSON.parse(row.npc_template_ids || '[]'),
        itemInstances: JSON.parse(row.item_instances || '[]'),
      }));
      fs.writeFileSync(path.join(DATA_DIR, 'rooms.json'), JSON.stringify(rooms, null, 2));
      systemLogger.info(`[AutoMigrate] Exported ${rooms.length} rooms to JSON`);
    }

    // Export item templates
    const itemRows = await db.selectFrom('item_templates' as never).selectAll().execute();
    if (itemRows.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const items = itemRows.map((row: any) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        type: row.type,
        weight: row.weight,
        value: row.value,
        slot: row.slot,
        stats: JSON.parse(row.stats || '{}'),
        requirements: JSON.parse(row.requirements || '{}'),
      }));
      fs.writeFileSync(path.join(DATA_DIR, 'items.json'), JSON.stringify(items, null, 2));
      systemLogger.info(`[AutoMigrate] Exported ${items.length} item templates to JSON`);
    }

    // Export item instances
    const instanceRows = await db.selectFrom('item_instances' as never).selectAll().execute();
    if (instanceRows.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const instances = instanceRows.map((row: any) => ({
        instanceId: row.instance_id,
        templateId: row.template_id,
        created: row.created,
        createdBy: row.created_by,
        properties: JSON.parse(row.properties || '{}'),
        history: JSON.parse(row.history || '[]'),
      }));
      fs.writeFileSync(path.join(DATA_DIR, 'itemInstances.json'), JSON.stringify(instances, null, 2));
      systemLogger.info(`[AutoMigrate] Exported ${instances.length} item instances to JSON`);
    }

    // Export NPC templates
    const npcRows = await db.selectFrom('npc_templates' as never).selectAll().execute();
    if (npcRows.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const npcs = npcRows.map((row: any) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        health: row.health,
        maxHealth: row.max_health,
        damage: [row.damage_min, row.damage_max],
        isHostile: row.is_hostile === 1,
        isPassive: row.is_passive === 1,
        experienceValue: row.experience_value,
        attackTexts: JSON.parse(row.attack_texts || '[]'),
        deathMessages: JSON.parse(row.death_messages || '[]'),
        ...(row.merchant === 1 && { merchant: true }),
        ...(row.inventory && { inventory: JSON.parse(row.inventory) }),
        ...(row.stock_config && { stockConfig: JSON.parse(row.stock_config) }),
      }));
      fs.writeFileSync(path.join(DATA_DIR, 'npcs.json'), JSON.stringify(npcs, null, 2));
      systemLogger.info(`[AutoMigrate] Exported ${npcs.length} NPC templates to JSON`);
    }
  } finally {
    await db.destroy();
  }
}

/**
 * Check if auto-migration is needed and perform it if so.
 * Call this at server startup, before managers initialize.
 *
 * @returns true if migration was performed, false otherwise
 */
export async function checkAndAutoMigrate(): Promise<boolean> {
  const currentBackend = getEffectiveBackend();
  const state = readBackendState();

  // First run or no state file - just record current backend
  if (!state) {
    systemLogger.info(`[AutoMigrate] First run detected, recording backend: ${currentBackend}`);
    writeBackendState(currentBackend);
    return false;
  }

  const lastBackend = state.lastBackend === 'auto' ? 'sqlite' : state.lastBackend;

  // No change - nothing to do
  if (lastBackend === currentBackend) {
    systemLogger.debug(`[AutoMigrate] Backend unchanged (${currentBackend}), skipping migration`);
    return false;
  }

  // Backend changed!
  systemLogger.info(
    `[AutoMigrate] Backend changed: ${lastBackend} → ${currentBackend}`
  );

  // JSON → Database: Import JSON to DB
  if (lastBackend === 'json' && (currentBackend === 'sqlite' || currentBackend === 'postgres')) {
    systemLogger.info('[AutoMigrate] Importing JSON files to database...');
    try {
      await importJsonToDatabase();
      writeBackendState(currentBackend);
      systemLogger.info('[AutoMigrate] ✓ Migration complete: JSON → Database');
      return true;
    } catch (error) {
      systemLogger.error('[AutoMigrate] Migration failed:', error);
      throw error;
    }
  }

  // Database → JSON: Export DB to JSON (less common, but supported)
  if ((lastBackend === 'sqlite' || lastBackend === 'postgres') && currentBackend === 'json') {
    systemLogger.info('[AutoMigrate] Exporting database to JSON files...');
    try {
      await exportDatabaseToJson(lastBackend);
      writeBackendState(currentBackend);
      systemLogger.info('[AutoMigrate] ✓ Migration complete: Database → JSON');
      return true;
    } catch (error) {
      systemLogger.error('[AutoMigrate] Migration failed:', error);
      throw error;
    }
  }

  // Database → Database (sqlite <-> postgres): Migrate via JSON as intermediate
  if (
    (lastBackend === 'sqlite' && currentBackend === 'postgres') ||
    (lastBackend === 'postgres' && currentBackend === 'sqlite')
  ) {
    systemLogger.info(
      `[AutoMigrate] Cross-database migration: ${lastBackend} → ${currentBackend}`
    );
    try {
      // Step 1: Export from source database to JSON
      systemLogger.info(`[AutoMigrate] Step 1/2: Exporting ${lastBackend} to JSON...`);
      await exportDatabaseToJson(lastBackend);

      // Step 2: Import JSON to target database
      systemLogger.info(`[AutoMigrate] Step 2/2: Importing JSON to ${currentBackend}...`);
      await importJsonToDatabase();

      writeBackendState(currentBackend);
      systemLogger.info(`[AutoMigrate] ✓ Migration complete: ${lastBackend} → ${currentBackend}`);
      return true;
    } catch (error) {
      systemLogger.error('[AutoMigrate] Cross-database migration failed:', error);
      throw error;
    }
  }

  // Unknown transition - just update state
  writeBackendState(currentBackend);
  return false;
}

/**
 * Force update the backend state marker (useful after manual migrations)
 */
export function updateBackendState(): void {
  writeBackendState(getEffectiveBackend());
}

/**
 * Get the current backend state for debugging
 */
export function getBackendState(): BackendState | null {
  return readBackendState();
}
