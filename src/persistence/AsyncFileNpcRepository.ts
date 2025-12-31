/**
 * Async file-based implementation of IAsyncNpcRepository
 * Implements IAsyncNpcRepository using the existing JSON file storage
 * @module persistence/AsyncFileNpcRepository
 */

import fs from 'fs';
import path from 'path';
import { NPCData } from '../combat/npc';
import { IAsyncNpcRepository, RepositoryConfig } from './interfaces';
import { loadAndValidateJsonFile } from '../utils/fileUtils';
import { createContextLogger } from '../utils/logger';

const repoLogger = createContextLogger('AsyncFileNpcRepository');

const DEFAULT_DATA_DIR = path.join(__dirname, '..', '..', 'data');

export class AsyncFileNpcRepository implements IAsyncNpcRepository {
  private readonly npcsFile: string;
  private readonly dataDir: string;

  constructor(config?: RepositoryConfig) {
    this.dataDir = config?.dataDir ?? DEFAULT_DATA_DIR;
    this.npcsFile = path.join(this.dataDir, 'npcs.json');
  }

  async findAll(): Promise<NPCData[]> {
    if (!fs.existsSync(this.npcsFile)) {
      repoLogger.info(`NPCs file not found at ${this.npcsFile}, returning empty array`);
      return [];
    }

    const npcData = loadAndValidateJsonFile<NPCData[]>(this.npcsFile, 'npcs');
    if (npcData && Array.isArray(npcData)) {
      repoLogger.info(`Loaded ${npcData.length} NPCs from ${this.npcsFile}`);
      return npcData;
    }

    repoLogger.warn(`Failed to load NPCs from ${this.npcsFile}`);
    return [];
  }

  async findById(id: string): Promise<NPCData | undefined> {
    const npcs = await this.findAll();
    return npcs.find((n) => n.id === id);
  }

  async findByName(name: string): Promise<NPCData | undefined> {
    const npcs = await this.findAll();
    return npcs.find((n) => n.name.toLowerCase() === name.toLowerCase());
  }

  async findHostile(): Promise<NPCData[]> {
    const npcs = await this.findAll();
    return npcs.filter((n) => n.isHostile);
  }

  async findMerchants(): Promise<NPCData[]> {
    const npcs = await this.findAll();
    return npcs.filter((n) => n.merchant === true);
  }

  async save(npc: NPCData): Promise<void> {
    const npcs = await this.findAll();
    const existingIndex = npcs.findIndex((n) => n.id === npc.id);

    if (existingIndex >= 0) {
      npcs[existingIndex] = npc;
    } else {
      npcs.push(npc);
    }

    await this.writeNpcs(npcs);
  }

  async saveAll(npcs: NPCData[]): Promise<void> {
    await this.writeNpcs(npcs);
  }

  async delete(id: string): Promise<void> {
    const npcs = await this.findAll();
    const filtered = npcs.filter((n) => n.id !== id);
    await this.writeNpcs(filtered);
  }

  private async writeNpcs(npcs: NPCData[]): Promise<void> {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    fs.writeFileSync(this.npcsFile, JSON.stringify(npcs, null, 2));
    repoLogger.info(`Saved ${npcs.length} NPCs to ${this.npcsFile}`);
  }
}
