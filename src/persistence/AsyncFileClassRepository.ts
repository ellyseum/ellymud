/**
 * Async file-based repository for CharacterClass data persistence
 * @module persistence/AsyncFileClassRepository
 */

import fs from 'fs';
import path from 'path';
import { IAsyncClassRepository, RepositoryConfig } from './interfaces';
import { CharacterClass } from '../types';
import { createContextLogger } from '../utils/logger';

const repoLogger = createContextLogger('AsyncFileClassRepository');

const DEFAULT_DATA_DIR = path.join(__dirname, '..', '..', 'data');
const CLASSES_FILENAME = 'classes.json';

interface ClassesFileData {
  classes: CharacterClass[];
}

export class AsyncFileClassRepository implements IAsyncClassRepository {
  private readonly classesFile: string;
  private readonly dataDir: string;

  constructor(config?: RepositoryConfig) {
    this.dataDir = config?.dataDir ?? DEFAULT_DATA_DIR;
    this.classesFile = path.join(this.dataDir, CLASSES_FILENAME);
  }

  async findAll(): Promise<CharacterClass[]> {
    if (!fs.existsSync(this.classesFile)) {
      repoLogger.info(`Classes file not found at ${this.classesFile}, returning empty array`);
      return [];
    }

    try {
      const data = fs.readFileSync(this.classesFile, 'utf8');
      const fileData: ClassesFileData = JSON.parse(data);
      if (fileData && Array.isArray(fileData.classes)) {
        repoLogger.debug(`Loaded ${fileData.classes.length} classes from ${this.classesFile}`);
        return fileData.classes;
      }
    } catch (error) {
      repoLogger.error(`Error loading classes from ${this.classesFile}:`, error);
    }

    return [];
  }

  async findById(id: string): Promise<CharacterClass | undefined> {
    const classes = await this.findAll();
    return classes.find((c) => c.id === id);
  }

  async findByTier(tier: number): Promise<CharacterClass[]> {
    const classes = await this.findAll();
    return classes.filter((c) => c.tier === tier);
  }

  async save(characterClass: CharacterClass): Promise<void> {
    const classes = await this.findAll();
    const existingIndex = classes.findIndex((c) => c.id === characterClass.id);

    if (existingIndex >= 0) {
      classes[existingIndex] = characterClass;
    } else {
      classes.push(characterClass);
    }

    await this.writeClasses(classes);
  }

  async saveAll(classes: CharacterClass[]): Promise<void> {
    await this.writeClasses(classes);
  }

  async delete(id: string): Promise<void> {
    const classes = await this.findAll();
    const filtered = classes.filter((c) => c.id !== id);
    await this.writeClasses(filtered);
  }

  private async writeClasses(classes: CharacterClass[]): Promise<void> {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    const fileData: ClassesFileData = { classes };
    fs.writeFileSync(this.classesFile, JSON.stringify(fileData, null, 2));
    repoLogger.debug(`Saved ${classes.length} classes to ${this.classesFile}`);
  }
}
