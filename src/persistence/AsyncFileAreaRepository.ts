/**
 * Async file-based Area repository
 * Implements IAsyncAreaRepository using JSON file storage
 * @module persistence/AsyncFileAreaRepository
 */

import fs from 'fs';
import path from 'path';
import { Area } from '../area/area';
import { IAsyncAreaRepository, RepositoryConfig } from './interfaces';
import { createContextLogger } from '../utils/logger';

const repoLogger = createContextLogger('AsyncFileAreaRepository');

const DEFAULT_DATA_DIR = path.join(__dirname, '..', '..', 'data');

export class AsyncFileAreaRepository implements IAsyncAreaRepository {
  private readonly areasFile: string;
  private readonly dataDir: string;

  constructor(config?: RepositoryConfig) {
    this.dataDir = config?.dataDir ?? DEFAULT_DATA_DIR;
    this.areasFile = path.join(this.dataDir, 'areas.json');
  }

  async findAll(): Promise<Area[]> {
    if (!fs.existsSync(this.areasFile)) {
      repoLogger.info(`Areas file not found at ${this.areasFile}, returning empty array`);
      return [];
    }

    try {
      const data = fs.readFileSync(this.areasFile, 'utf8');
      const areaData = JSON.parse(data) as Area[];
      if (Array.isArray(areaData)) {
        repoLogger.info(`Loaded ${areaData.length} areas from ${this.areasFile}`);
        return areaData;
      }
      repoLogger.warn(`Invalid areas data format in ${this.areasFile}`);
      return [];
    } catch (error) {
      repoLogger.error(`Failed to load areas from ${this.areasFile}:`, error);
      return [];
    }
  }

  async findById(id: string): Promise<Area | undefined> {
    const areas = await this.findAll();
    return areas.find((a) => a.id === id);
  }

  async save(area: Area): Promise<void> {
    const areas = await this.findAll();
    const existingIndex = areas.findIndex((a) => a.id === area.id);

    if (existingIndex >= 0) {
      areas[existingIndex] = area;
      repoLogger.info(`Updated area ${area.id}`);
    } else {
      areas.push(area);
      repoLogger.info(`Created new area ${area.id}`);
    }

    await this.writeAreas(areas);
  }

  async saveAll(areas: Area[]): Promise<void> {
    await this.writeAreas(areas);
    repoLogger.info(`Saved ${areas.length} areas to ${this.areasFile}`);
  }

  async delete(id: string): Promise<void> {
    const areas = await this.findAll();
    const filtered = areas.filter((a) => a.id !== id);

    if (filtered.length === areas.length) {
      repoLogger.warn(`Area ${id} not found for deletion`);
      return;
    }

    await this.writeAreas(filtered);
    repoLogger.info(`Deleted area ${id}`);
  }

  private async writeAreas(areas: Area[]): Promise<void> {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    fs.writeFileSync(this.areasFile, JSON.stringify(areas, null, 2));
  }
}
