/**
 * Async file-based repository for SnakeScoreEntry data persistence
 * @module persistence/AsyncFileSnakeScoreRepository
 */

import fs from 'fs';
import path from 'path';
import { IAsyncSnakeScoreRepository, RepositoryConfig } from './interfaces';
import { SnakeScoreEntry } from '../types';
import { createContextLogger } from '../utils/logger';

const repoLogger = createContextLogger('AsyncFileSnakeScoreRepository');

const DEFAULT_DATA_DIR = path.join(__dirname, '..', '..', 'data');
const SNAKE_SCORES_FILENAME = 'snake-scores.json';

interface SnakeScoresFileData {
  scores: SnakeScoreEntry[];
}

export class AsyncFileSnakeScoreRepository implements IAsyncSnakeScoreRepository {
  private readonly scoresFile: string;
  private readonly dataDir: string;

  constructor(config?: RepositoryConfig) {
    this.dataDir = config?.dataDir ?? DEFAULT_DATA_DIR;
    this.scoresFile = path.join(this.dataDir, SNAKE_SCORES_FILENAME);
  }

  async findAll(): Promise<SnakeScoreEntry[]> {
    if (!fs.existsSync(this.scoresFile)) {
      repoLogger.info(`Snake scores file not found at ${this.scoresFile}, returning empty array`);
      return [];
    }

    try {
      const data = fs.readFileSync(this.scoresFile, 'utf8');
      const fileData: SnakeScoresFileData = JSON.parse(data);
      if (fileData && Array.isArray(fileData.scores)) {
        repoLogger.debug(`Loaded ${fileData.scores.length} snake scores from ${this.scoresFile}`);
        return fileData.scores;
      }
    } catch (error) {
      repoLogger.error(`Error loading snake scores from ${this.scoresFile}:`, error);
    }

    return [];
  }

  async findByUsername(username: string): Promise<SnakeScoreEntry[]> {
    const scores = await this.findAll();
    return scores.filter((s) => s.username.toLowerCase() === username.toLowerCase());
  }

  async findTopScores(limit: number): Promise<SnakeScoreEntry[]> {
    const scores = await this.findAll();
    return scores.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  async save(entry: SnakeScoreEntry): Promise<void> {
    const scores = await this.findAll();
    scores.push(entry);
    await this.writeScores(scores);
  }

  async saveAll(entries: SnakeScoreEntry[]): Promise<void> {
    await this.writeScores(entries);
  }

  async deleteByUsername(username: string): Promise<void> {
    const scores = await this.findAll();
    const filtered = scores.filter((s) => s.username.toLowerCase() !== username.toLowerCase());
    await this.writeScores(filtered);
  }

  private async writeScores(scores: SnakeScoreEntry[]): Promise<void> {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    const fileData: SnakeScoresFileData = { scores };
    fs.writeFileSync(this.scoresFile, JSON.stringify(fileData, null, 2));
    repoLogger.debug(`Saved ${scores.length} snake scores to ${this.scoresFile}`);
  }
}
