/**
 * Async file-based repository for MerchantInventoryState data persistence
 * @module persistence/AsyncFileMerchantStateRepository
 */

import fs from 'fs';
import path from 'path';
import { IAsyncMerchantStateRepository, RepositoryConfig } from './interfaces';
import { MerchantInventoryState } from '../combat/merchant';
import { createContextLogger } from '../utils/logger';

const repoLogger = createContextLogger('AsyncFileMerchantStateRepository');

const DEFAULT_DATA_DIR = path.join(__dirname, '..', '..', 'data');
const MERCHANT_STATE_FILENAME = 'merchant-state.json';

export class AsyncFileMerchantStateRepository implements IAsyncMerchantStateRepository {
  private readonly merchantStateFile: string;
  private readonly dataDir: string;

  constructor(config?: RepositoryConfig) {
    this.dataDir = config?.dataDir ?? DEFAULT_DATA_DIR;
    this.merchantStateFile = path.join(this.dataDir, MERCHANT_STATE_FILENAME);
  }

  async findAll(): Promise<MerchantInventoryState[]> {
    const data = this.loadFileData();
    return data;
  }

  async findByTemplateId(templateId: string): Promise<MerchantInventoryState | undefined> {
    const states = await this.findAll();
    return states.find((s) => s.npcTemplateId === templateId);
  }

  async exists(templateId: string): Promise<boolean> {
    const state = await this.findByTemplateId(templateId);
    return state !== undefined;
  }

  async save(state: MerchantInventoryState): Promise<void> {
    const states = await this.findAll();
    const existingIndex = states.findIndex((s) => s.npcTemplateId === state.npcTemplateId);

    if (existingIndex >= 0) {
      states[existingIndex] = state;
    } else {
      states.push(state);
    }

    await this.writeStates(states);
  }

  async saveAll(states: MerchantInventoryState[]): Promise<void> {
    await this.writeStates(states);
  }

  async delete(templateId: string): Promise<void> {
    const states = await this.findAll();
    const filtered = states.filter((s) => s.npcTemplateId !== templateId);
    await this.writeStates(filtered);
  }

  private loadFileData(): MerchantInventoryState[] {
    if (!fs.existsSync(this.merchantStateFile)) {
      repoLogger.info(
        `Merchant state file not found at ${this.merchantStateFile}, returning empty`
      );
      return [];
    }

    try {
      const content = fs.readFileSync(this.merchantStateFile, 'utf8');
      const parsed = JSON.parse(content);
      // Handle both array format and old object format
      if (Array.isArray(parsed)) {
        return parsed as MerchantInventoryState[];
      } else if (parsed && typeof parsed === 'object') {
        // Convert object format to array
        return Object.values(parsed) as MerchantInventoryState[];
      }
      return [];
    } catch (error) {
      repoLogger.error(`Error loading merchant state from ${this.merchantStateFile}:`, error);
      return [];
    }
  }

  private async writeStates(states: MerchantInventoryState[]): Promise<void> {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
    fs.writeFileSync(this.merchantStateFile, JSON.stringify(states, null, 2));
    repoLogger.debug(`Saved ${states.length} merchant states to ${this.merchantStateFile}`);
  }
}
