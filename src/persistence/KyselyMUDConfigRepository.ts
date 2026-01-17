/**
 * Kysely-based repository for MUD configuration persistence
 * @module persistence/KyselyMUDConfigRepository
 */

import { getDb } from '../data/db';
import { IAsyncMUDConfigRepository, MUDConfig } from './interfaces';
import { createContextLogger } from '../utils/logger';

const repoLogger = createContextLogger('KyselyMUDConfigRepository');

// Singleton key for the config row
const SINGLETON_KEY = 'singleton';

/**
 * Default MUD configuration
 */
const DEFAULT_CONFIG: MUDConfig = {
  dataFiles: {
    players: './data/players.json',
    rooms: './data/rooms.json',
    items: './data/items.json',
    npcs: './data/npcs.json',
  },
  game: {
    startingRoom: 'town-square',
    maxPlayers: 100,
    idleTimeout: 30,
    maxPasswordAttempts: 5,
  },
  advanced: {
    debugMode: false,
    allowRegistration: true,
    backupInterval: 6,
    logLevel: 'info',
  },
};

export class KyselyMUDConfigRepository implements IAsyncMUDConfigRepository {
  async get(): Promise<MUDConfig> {
    const db = getDb();
    const row = await db
      .selectFrom('mud_config')
      .selectAll()
      .where('key', '=', SINGLETON_KEY)
      .executeTakeFirst();

    if (!row) {
      repoLogger.info('MUD config not found in database, creating default');
      await this.save(DEFAULT_CONFIG);
      return { ...DEFAULT_CONFIG };
    }

    try {
      const dataFiles = JSON.parse(row.data_files);
      const config: MUDConfig = {
        dataFiles: {
          players: dataFiles.players ?? DEFAULT_CONFIG.dataFiles.players,
          rooms: dataFiles.rooms ?? DEFAULT_CONFIG.dataFiles.rooms,
          items: dataFiles.items ?? DEFAULT_CONFIG.dataFiles.items,
          npcs: dataFiles.npcs ?? DEFAULT_CONFIG.dataFiles.npcs,
        },
        game: {
          startingRoom: row.game_starting_room ?? DEFAULT_CONFIG.game.startingRoom,
          maxPlayers: row.game_max_players ?? DEFAULT_CONFIG.game.maxPlayers,
          idleTimeout: row.game_idle_timeout ?? DEFAULT_CONFIG.game.idleTimeout,
          maxPasswordAttempts:
            row.game_max_password_attempts ?? DEFAULT_CONFIG.game.maxPasswordAttempts,
        },
        advanced: {
          debugMode: row.advanced_debug_mode === 1,
          allowRegistration: row.advanced_allow_registration === 1,
          backupInterval: row.advanced_backup_interval ?? DEFAULT_CONFIG.advanced.backupInterval,
          logLevel: row.advanced_log_level ?? DEFAULT_CONFIG.advanced.logLevel,
        },
      };

      repoLogger.debug('Loaded MUD config from database');
      return config;
    } catch (error) {
      repoLogger.error('Error parsing MUD config from database:', error);
      return { ...DEFAULT_CONFIG };
    }
  }

  async save(config: MUDConfig): Promise<void> {
    const db = getDb();
    const row = {
      key: SINGLETON_KEY,
      data_files: JSON.stringify(config.dataFiles),
      game_starting_room: config.game.startingRoom,
      game_max_players: config.game.maxPlayers,
      game_idle_timeout: config.game.idleTimeout,
      game_max_password_attempts: config.game.maxPasswordAttempts,
      advanced_debug_mode: config.advanced.debugMode ? 1 : 0,
      advanced_allow_registration: config.advanced.allowRegistration ? 1 : 0,
      advanced_backup_interval: config.advanced.backupInterval,
      advanced_log_level: config.advanced.logLevel,
    };

    await db
      .insertInto('mud_config')
      .values(row)
      .onConflict((oc) => oc.column('key').doUpdateSet(row))
      .execute();

    repoLogger.debug('Saved MUD config to database');
  }

  async updateGame(game: Partial<MUDConfig['game']>): Promise<void> {
    const current = await this.get();
    current.game = { ...current.game, ...game };
    await this.save(current);
  }

  async updateAdvanced(advanced: Partial<MUDConfig['advanced']>): Promise<void> {
    const current = await this.get();
    current.advanced = { ...current.advanced, ...advanced };
    await this.save(current);
  }

  async exists(): Promise<boolean> {
    const db = getDb();
    const row = await db
      .selectFrom('mud_config')
      .select('key')
      .where('key', '=', SINGLETON_KEY)
      .executeTakeFirst();
    return !!row;
  }
}
