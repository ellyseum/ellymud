/**
 * Async file-based repository for GameTimer configuration persistence
 * @module persistence/AsyncFileGameTimerConfigRepository
 */

import fs from 'fs';
import path from 'path';
import { IAsyncGameTimerConfigRepository, GameTimerConfig, RepositoryConfig } from './interfaces';
import { createContextLogger } from '../utils/logger';

const repoLogger = createContextLogger('AsyncFileGameTimerConfigRepository');

const DEFAULT_DATA_DIR = path.join(__dirname, '..', '..', 'data');
const GAMETIMER_CONFIG_FILENAME = 'gametimer-config.json';

/**
 * Default game timer configuration
 */
const DEFAULT_CONFIG: GameTimerConfig = {
  tickInterval: 6000, // 6 seconds per tick
  saveInterval: 10, // Save every 10 ticks (1 minute)
};

export class AsyncFileGameTimerConfigRepository implements IAsyncGameTimerConfigRepository {
  private readonly configFile: string;
  private readonly dataDir: string;

  constructor(config?: RepositoryConfig) {
    this.dataDir = config?.dataDir ?? DEFAULT_DATA_DIR;
    this.configFile = path.join(this.dataDir, GAMETIMER_CONFIG_FILENAME);
  }

  async get(): Promise<GameTimerConfig> {
    if (!fs.existsSync(this.configFile)) {
      repoLogger.info(`GameTimer config file not found at ${this.configFile}, using defaults`);
      return { ...DEFAULT_CONFIG };
    }

    try {
      const data = fs.readFileSync(this.configFile, 'utf8');
      const config = JSON.parse(data);
      repoLogger.debug(`Loaded GameTimer config from ${this.configFile}`);
      // Merge with defaults to ensure all fields exist
      return {
        tickInterval: config.tickInterval ?? DEFAULT_CONFIG.tickInterval,
        saveInterval: config.saveInterval ?? DEFAULT_CONFIG.saveInterval,
      };
    } catch (error) {
      repoLogger.error(`Error loading GameTimer config from ${this.configFile}:`, error);
      return { ...DEFAULT_CONFIG };
    }
  }

  async save(config: GameTimerConfig): Promise<void> {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    fs.writeFileSync(this.configFile, JSON.stringify(config, null, 2));
    repoLogger.debug(`Saved GameTimer config to ${this.configFile}`);
  }

  async exists(): Promise<boolean> {
    return fs.existsSync(this.configFile);
  }
}
