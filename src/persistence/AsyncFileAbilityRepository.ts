/**
 * Async file-based repository for AbilityTemplate data persistence
 * @module persistence/AsyncFileAbilityRepository
 */

import fs from 'fs';
import path from 'path';
import { IAsyncAbilityRepository, RepositoryConfig } from './interfaces';
import { AbilityTemplate } from '../abilities/types';
import { createContextLogger } from '../utils/logger';

const repoLogger = createContextLogger('AsyncFileAbilityRepository');

const DEFAULT_DATA_DIR = path.join(__dirname, '..', '..', 'data');
const ABILITIES_FILENAME = 'abilities.json';

interface AbilitiesFileData {
  abilities: AbilityTemplate[];
}

export class AsyncFileAbilityRepository implements IAsyncAbilityRepository {
  private readonly abilitiesFile: string;
  private readonly dataDir: string;

  constructor(config?: RepositoryConfig) {
    this.dataDir = config?.dataDir ?? DEFAULT_DATA_DIR;
    this.abilitiesFile = path.join(this.dataDir, ABILITIES_FILENAME);
  }

  async findAll(): Promise<AbilityTemplate[]> {
    if (!fs.existsSync(this.abilitiesFile)) {
      repoLogger.info(`Abilities file not found at ${this.abilitiesFile}, returning empty array`);
      return [];
    }

    try {
      const data = fs.readFileSync(this.abilitiesFile, 'utf8');
      const parsed = JSON.parse(data);

      // Support both formats: plain array [...] or wrapped { abilities: [...] }
      let abilities: AbilityTemplate[];
      if (Array.isArray(parsed)) {
        abilities = parsed;
      } else if (parsed && Array.isArray(parsed.abilities)) {
        abilities = parsed.abilities;
      } else {
        repoLogger.warn(`Invalid abilities file format at ${this.abilitiesFile}`);
        return [];
      }

      repoLogger.debug(`Loaded ${abilities.length} abilities from ${this.abilitiesFile}`);
      return abilities;
    } catch (error) {
      repoLogger.error(`Error loading abilities from ${this.abilitiesFile}:`, error);
    }

    return [];
  }

  async findById(id: string): Promise<AbilityTemplate | undefined> {
    const abilities = await this.findAll();
    return abilities.find((a) => a.id === id);
  }

  async findByType(type: string): Promise<AbilityTemplate[]> {
    const abilities = await this.findAll();
    return abilities.filter((a) => a.type === type);
  }

  async save(ability: AbilityTemplate): Promise<void> {
    const abilities = await this.findAll();
    const existingIndex = abilities.findIndex((a) => a.id === ability.id);

    if (existingIndex >= 0) {
      abilities[existingIndex] = ability;
    } else {
      abilities.push(ability);
    }

    await this.writeAbilities(abilities);
  }

  async saveAll(abilities: AbilityTemplate[]): Promise<void> {
    await this.writeAbilities(abilities);
  }

  async delete(id: string): Promise<void> {
    const abilities = await this.findAll();
    const filtered = abilities.filter((a) => a.id !== id);
    await this.writeAbilities(filtered);
  }

  private async writeAbilities(abilities: AbilityTemplate[]): Promise<void> {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    const fileData: AbilitiesFileData = { abilities };
    fs.writeFileSync(this.abilitiesFile, JSON.stringify(fileData, null, 2));
    repoLogger.debug(`Saved ${abilities.length} abilities to ${this.abilitiesFile}`);
  }
}
