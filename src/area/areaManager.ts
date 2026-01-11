/**
 * AreaManager - Singleton for managing game areas
 * Handles CRUD operations and caching of Area entities
 * @module area/areaManager
 */

import { Area, CreateAreaDTO, UpdateAreaDTO, AreaSpawnConfig } from './area';
import { IAsyncAreaRepository } from '../persistence/interfaces';
import { getAreaRepository } from '../persistence/RepositoryFactory';
import { createContextLogger } from '../utils/logger';

const logger = createContextLogger('AreaManager');

export class AreaManager {
  private static instance: AreaManager;
  private areas: Map<string, Area> = new Map();
  private repository: IAsyncAreaRepository;
  private initialized = false;

  private constructor() {
    this.repository = getAreaRepository();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): AreaManager {
    if (!AreaManager.instance) {
      AreaManager.instance = new AreaManager();
    }
    return AreaManager.instance;
  }

  /**
   * Initialize manager by loading areas from storage
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      logger.warn('AreaManager already initialized');
      return;
    }

    const areas = await this.repository.findAll();
    this.areas.clear();

    for (const area of areas) {
      this.areas.set(area.id, area);
    }

    logger.info(`Loaded ${this.areas.size} areas`);
    this.initialized = true;
  }

  /**
   * Get all areas
   */
  public getAll(): Area[] {
    return Array.from(this.areas.values());
  }

  /**
   * Get area by ID
   */
  public getById(id: string): Area | undefined {
    return this.areas.get(id);
  }

  /**
   * Create a new area
   */
  public async create(dto: CreateAreaDTO): Promise<Area> {
    if (this.areas.has(dto.id)) {
      throw new Error(`Area with ID '${dto.id}' already exists`);
    }

    const now = new Date().toISOString();
    const area: Area = {
      id: dto.id,
      name: dto.name,
      description: dto.description ?? '',
      levelRange: dto.levelRange ?? { min: 1, max: 10 },
      flags: dto.flags ?? [],
      combatConfig: dto.combatConfig,
      spawnConfig: [],
      defaultRoomFlags: dto.defaultRoomFlags,
      created: now,
      modified: now,
    };

    this.areas.set(area.id, area);
    await this.repository.save(area);
    logger.info(`Created area: ${area.id}`);

    return area;
  }

  /**
   * Update an existing area
   */
  public async update(id: string, dto: UpdateAreaDTO): Promise<Area> {
    const existing = this.areas.get(id);
    if (!existing) {
      throw new Error(`Area '${id}' not found`);
    }

    const updated: Area = {
      ...existing,
      name: dto.name ?? existing.name,
      description: dto.description ?? existing.description,
      levelRange: dto.levelRange ?? existing.levelRange,
      flags: dto.flags ?? existing.flags,
      combatConfig: dto.combatConfig ?? existing.combatConfig,
      spawnConfig: dto.spawnConfig ?? existing.spawnConfig,
      defaultRoomFlags: dto.defaultRoomFlags ?? existing.defaultRoomFlags,
      modified: new Date().toISOString(),
    };

    this.areas.set(id, updated);
    await this.repository.save(updated);
    logger.info(`Updated area: ${id}`);

    return updated;
  }

  /**
   * Delete an area
   */
  public async delete(id: string): Promise<void> {
    if (!this.areas.has(id)) {
      throw new Error(`Area '${id}' not found`);
    }

    this.areas.delete(id);
    await this.repository.delete(id);
    logger.info(`Deleted area: ${id}`);
  }

  /**
   * Add spawn config to an area
   */
  public async addSpawnConfig(areaId: string, config: AreaSpawnConfig): Promise<Area> {
    const area = this.areas.get(areaId);
    if (!area) {
      throw new Error(`Area '${areaId}' not found`);
    }

    area.spawnConfig.push(config);
    area.modified = new Date().toISOString();

    await this.repository.save(area);
    logger.info(`Added spawn config to area ${areaId}: ${config.npcTemplateId}`);

    return area;
  }

  /**
   * Remove spawn config from an area
   */
  public async removeSpawnConfig(areaId: string, npcTemplateId: string): Promise<Area> {
    const area = this.areas.get(areaId);
    if (!area) {
      throw new Error(`Area '${areaId}' not found`);
    }

    area.spawnConfig = area.spawnConfig.filter((config) => config.npcTemplateId !== npcTemplateId);
    area.modified = new Date().toISOString();

    await this.repository.save(area);
    logger.info(`Removed spawn config from area ${areaId}: ${npcTemplateId}`);

    return area;
  }

  /**
   * Persist all areas to storage
   */
  public async saveAll(): Promise<void> {
    const areas = this.getAll();
    await this.repository.saveAll(areas);
    logger.info(`Saved ${areas.length} areas`);
  }

  /**
   * Reset instance for testing
   */
  public static resetInstance(): void {
    AreaManager.instance = undefined as unknown as AreaManager;
  }
}
