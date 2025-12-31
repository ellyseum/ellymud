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
    systemLogger.info('[AutoMigrate] Database → JSON migration requested');
    systemLogger.warn(
      '[AutoMigrate] Run "npm run data:export" manually to export database to JSON'
    );
    writeBackendState(currentBackend);
    return false;
  }

  // Database → Database (sqlite <-> postgres): No auto-migration
  if (
    (lastBackend === 'sqlite' && currentBackend === 'postgres') ||
    (lastBackend === 'postgres' && currentBackend === 'sqlite')
  ) {
    systemLogger.warn(
      `[AutoMigrate] Cross-database migration (${lastBackend} → ${currentBackend}) not supported automatically`
    );
    systemLogger.warn('[AutoMigrate] Use "npm run data:switch <target>" to migrate data');
    writeBackendState(currentBackend);
    return false;
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
