/**
 * Async file-based repository for MUD configuration persistence
 * @module persistence/AsyncFileMUDConfigRepository
 */

import fs from 'fs';
import path from 'path';
import { IAsyncMUDConfigRepository, MUDConfig, RepositoryConfig } from './interfaces';
import { createContextLogger } from '../utils/logger';

const repoLogger = createContextLogger('AsyncFileMUDConfigRepository');

const DEFAULT_DATA_DIR = path.join(__dirname, '..', '..', 'data');
const MUD_CONFIG_FILENAME = 'mud-config.json';

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

export class AsyncFileMUDConfigRepository implements IAsyncMUDConfigRepository {
  private readonly configFile: string;
  private readonly dataDir: string;

  constructor(config?: RepositoryConfig) {
    this.dataDir = config?.dataDir ?? DEFAULT_DATA_DIR;
    this.configFile = path.join(this.dataDir, MUD_CONFIG_FILENAME);
  }

  async get(): Promise<MUDConfig> {
    if (!fs.existsSync(this.configFile)) {
      repoLogger.info(`MUD config file not found at ${this.configFile}, creating default`);
      await this.save(DEFAULT_CONFIG);
      return { ...DEFAULT_CONFIG };
    }

    try {
      const data = fs.readFileSync(this.configFile, 'utf8');
      const config: MUDConfig = JSON.parse(data);
      repoLogger.debug(`Loaded MUD config from ${this.configFile}`);
      // Merge with defaults to ensure all fields exist
      return {
        dataFiles: { ...DEFAULT_CONFIG.dataFiles, ...config.dataFiles },
        game: { ...DEFAULT_CONFIG.game, ...config.game },
        advanced: { ...DEFAULT_CONFIG.advanced, ...config.advanced },
      };
    } catch (error) {
      repoLogger.error(`Error loading MUD config from ${this.configFile}:`, error);
      return { ...DEFAULT_CONFIG };
    }
  }

  async save(config: MUDConfig): Promise<void> {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    fs.writeFileSync(this.configFile, JSON.stringify(config, null, 2));
    repoLogger.debug(`Saved MUD config to ${this.configFile}`);
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
    return fs.existsSync(this.configFile);
  }
}
