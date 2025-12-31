/**
 * Async wrapper around FileItemRepository
 * Implements IAsyncItemRepository using the existing JSON file storage
 * @module persistence/AsyncFileItemRepository
 */

import fs from 'fs';
import path from 'path';
import { GameItem, ItemInstance } from '../types';
import { IAsyncItemRepository, RepositoryConfig } from './interfaces';
import { loadAndValidateJsonFile } from '../utils/fileUtils';
import { createContextLogger } from '../utils/logger';

const repoLogger = createContextLogger('AsyncFileItemRepository');

const DEFAULT_DATA_DIR = path.join(__dirname, '..', '..', 'data');

export class AsyncFileItemRepository implements IAsyncItemRepository {
  private readonly itemsFile: string;
  private readonly itemInstancesFile: string;
  private readonly dataDir: string;

  constructor(config?: RepositoryConfig) {
    this.dataDir = config?.dataDir ?? DEFAULT_DATA_DIR;
    this.itemsFile = path.join(this.dataDir, 'items.json');
    this.itemInstancesFile = path.join(this.dataDir, 'itemInstances.json');
  }

  // ========== Template Operations ==========

  async findAllTemplates(): Promise<GameItem[]> {
    if (!fs.existsSync(this.itemsFile)) {
      repoLogger.info(`Items file not found at ${this.itemsFile}, returning empty array`);
      return [];
    }

    const itemData = loadAndValidateJsonFile<GameItem[]>(this.itemsFile, 'items');
    if (itemData && Array.isArray(itemData)) {
      repoLogger.info(`Loaded ${itemData.length} items from ${this.itemsFile}`);
      return itemData;
    }

    repoLogger.warn(`Failed to load items from ${this.itemsFile}`);
    return [];
  }

  async findTemplateById(id: string): Promise<GameItem | undefined> {
    const items = await this.findAllTemplates();
    return items.find((i) => i.id === id);
  }

  async saveTemplate(item: GameItem): Promise<void> {
    const items = await this.findAllTemplates();
    const existingIndex = items.findIndex((i) => i.id === item.id);

    if (existingIndex >= 0) {
      items[existingIndex] = item;
    } else {
      items.push(item);
    }

    await this.writeTemplates(items);
  }

  async saveTemplates(items: GameItem[]): Promise<void> {
    await this.writeTemplates(items);
  }

  async deleteTemplate(id: string): Promise<void> {
    const items = await this.findAllTemplates();
    const filtered = items.filter((i) => i.id !== id);
    await this.writeTemplates(filtered);
  }

  private async writeTemplates(items: GameItem[]): Promise<void> {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    fs.writeFileSync(this.itemsFile, JSON.stringify(items, null, 2));
    repoLogger.info(`Saved ${items.length} items to ${this.itemsFile}`);
  }

  // ========== Instance Operations ==========

  async findAllInstances(): Promise<ItemInstance[]> {
    if (!fs.existsSync(this.itemInstancesFile)) {
      repoLogger.info(
        `Item instances file not found at ${this.itemInstancesFile}, returning empty array`
      );
      return [];
    }

    try {
      const data = fs.readFileSync(this.itemInstancesFile, 'utf8');
      const instanceData = JSON.parse(data) as ItemInstance[];
      if (instanceData && Array.isArray(instanceData)) {
        repoLogger.info(
          `Loaded ${instanceData.length} item instances from ${this.itemInstancesFile}`
        );
        return instanceData;
      }
    } catch (error) {
      repoLogger.warn(`Failed to parse item instances from ${this.itemInstancesFile}:`, error);
    }

    return [];
  }

  async findInstanceById(instanceId: string): Promise<ItemInstance | undefined> {
    const instances = await this.findAllInstances();
    return instances.find((i) => i.instanceId === instanceId);
  }

  async findInstancesByTemplateId(templateId: string): Promise<ItemInstance[]> {
    const instances = await this.findAllInstances();
    return instances.filter((i) => i.templateId === templateId);
  }

  async saveInstance(instance: ItemInstance): Promise<void> {
    const instances = await this.findAllInstances();
    const existingIndex = instances.findIndex((i) => i.instanceId === instance.instanceId);

    if (existingIndex >= 0) {
      instances[existingIndex] = instance;
    } else {
      instances.push(instance);
    }

    await this.writeInstances(instances);
  }

  async saveInstances(instances: ItemInstance[]): Promise<void> {
    await this.writeInstances(instances);
  }

  async deleteInstance(instanceId: string): Promise<void> {
    const instances = await this.findAllInstances();
    const filtered = instances.filter((i) => i.instanceId !== instanceId);
    await this.writeInstances(filtered);
  }

  private async writeInstances(instances: ItemInstance[]): Promise<void> {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    fs.writeFileSync(this.itemInstancesFile, JSON.stringify(instances, null, 2));
    repoLogger.info(`Saved ${instances.length} item instances to ${this.itemInstancesFile}`);
  }
}
