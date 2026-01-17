/**
 * Kysely-based repository for GameTimer configuration persistence
 * @module persistence/KyselyGameTimerConfigRepository
 */

import { getDb } from '../data/db';
import { IAsyncGameTimerConfigRepository, GameTimerConfig } from './interfaces';
import { createContextLogger } from '../utils/logger';

const repoLogger = createContextLogger('KyselyGameTimerConfigRepository');

// Singleton key for the config row
const SINGLETON_KEY = 'singleton';

/**
 * Default game timer configuration
 */
const DEFAULT_CONFIG: GameTimerConfig = {
  tickInterval: 6000, // 6 seconds per tick
  saveInterval: 10, // Save every 10 ticks (1 minute)
};

export class KyselyGameTimerConfigRepository implements IAsyncGameTimerConfigRepository {
  async get(): Promise<GameTimerConfig> {
    const db = getDb();
    const row = await db
      .selectFrom('gametimer_config')
      .selectAll()
      .where('key', '=', SINGLETON_KEY)
      .executeTakeFirst();

    if (!row) {
      repoLogger.info('GameTimer config not found in database, using defaults');
      // Don't auto-create in database - just return defaults
      return { ...DEFAULT_CONFIG };
    }

    const config: GameTimerConfig = {
      tickInterval: row.tick_interval ?? DEFAULT_CONFIG.tickInterval,
      saveInterval: row.save_interval ?? DEFAULT_CONFIG.saveInterval,
    };

    repoLogger.debug('Loaded GameTimer config from database');
    return config;
  }

  async save(config: GameTimerConfig): Promise<void> {
    const db = getDb();
    const row = {
      key: SINGLETON_KEY,
      tick_interval: config.tickInterval,
      save_interval: config.saveInterval,
    };

    await db
      .insertInto('gametimer_config')
      .values(row)
      .onConflict((oc) => oc.column('key').doUpdateSet(row))
      .execute();

    repoLogger.debug('Saved GameTimer config to database');
  }

  async exists(): Promise<boolean> {
    const db = getDb();
    const row = await db
      .selectFrom('gametimer_config')
      .select('key')
      .where('key', '=', SINGLETON_KEY)
      .executeTakeFirst();
    return !!row;
  }
}
