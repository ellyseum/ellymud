/**
 * Async file-based repository for Race data persistence
 * @module persistence/AsyncFileRaceRepository
 */

import fs from 'fs';
import path from 'path';
import { IAsyncRaceRepository, RepositoryConfig } from './interfaces';
import { Race } from '../types';
import { createContextLogger } from '../utils/logger';

const repoLogger = createContextLogger('AsyncFileRaceRepository');

const DEFAULT_DATA_DIR = path.join(__dirname, '..', '..', 'data');
const RACES_FILENAME = 'races.json';

interface RacesFileData {
  races: Race[];
}

export class AsyncFileRaceRepository implements IAsyncRaceRepository {
  private readonly racesFile: string;
  private readonly dataDir: string;

  constructor(config?: RepositoryConfig) {
    this.dataDir = config?.dataDir ?? DEFAULT_DATA_DIR;
    this.racesFile = path.join(this.dataDir, RACES_FILENAME);
  }

  async findAll(): Promise<Race[]> {
    if (!fs.existsSync(this.racesFile)) {
      repoLogger.info(`Races file not found at ${this.racesFile}, returning empty array`);
      return [];
    }

    try {
      const data = fs.readFileSync(this.racesFile, 'utf8');
      const fileData: RacesFileData = JSON.parse(data);
      if (fileData && Array.isArray(fileData.races)) {
        repoLogger.debug(`Loaded ${fileData.races.length} races from ${this.racesFile}`);
        return fileData.races;
      }
    } catch (error) {
      repoLogger.error(`Error loading races from ${this.racesFile}:`, error);
    }

    return [];
  }

  async findById(id: string): Promise<Race | undefined> {
    const races = await this.findAll();
    return races.find((r) => r.id === id);
  }

  async save(race: Race): Promise<void> {
    const races = await this.findAll();
    const existingIndex = races.findIndex((r) => r.id === race.id);

    if (existingIndex >= 0) {
      races[existingIndex] = race;
    } else {
      races.push(race);
    }

    await this.writeRaces(races);
  }

  async saveAll(races: Race[]): Promise<void> {
    await this.writeRaces(races);
  }

  async delete(id: string): Promise<void> {
    const races = await this.findAll();
    const filtered = races.filter((r) => r.id !== id);
    await this.writeRaces(filtered);
  }

  private async writeRaces(races: Race[]): Promise<void> {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    const fileData: RacesFileData = { races };
    fs.writeFileSync(this.racesFile, JSON.stringify(fileData, null, 2));
    repoLogger.debug(`Saved ${races.length} races to ${this.racesFile}`);
  }
}
