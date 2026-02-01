/**
 * Async file-based repository for Quest Progress data persistence
 * @module persistence/AsyncFileQuestProgressRepository
 */

import fs from 'fs';
import path from 'path';
import { QuestProgressData, IAsyncQuestProgressRepository, RepositoryConfig } from './interfaces';
import { createContextLogger } from '../utils/logger';

const repoLogger = createContextLogger('AsyncFileQuestProgressRepository');

const DEFAULT_DATA_DIR = path.join(__dirname, '..', '..', 'data');
const QUEST_PROGRESS_FILENAME = 'quest-progress.json';

interface QuestProgressFileData {
  progress: QuestProgressData[];
}

export class AsyncFileQuestProgressRepository implements IAsyncQuestProgressRepository {
  private readonly progressFile: string;
  private readonly dataDir: string;

  constructor(config?: RepositoryConfig) {
    this.dataDir = config?.dataDir ?? DEFAULT_DATA_DIR;
    this.progressFile = path.join(this.dataDir, QUEST_PROGRESS_FILENAME);
  }

  async findAll(): Promise<QuestProgressData[]> {
    if (!fs.existsSync(this.progressFile)) {
      repoLogger.info(
        `Quest progress file not found at ${this.progressFile}, returning empty array`
      );
      return [];
    }

    try {
      const data = fs.readFileSync(this.progressFile, 'utf8');
      const progressData: QuestProgressFileData = JSON.parse(data);
      if (progressData && Array.isArray(progressData.progress)) {
        repoLogger.debug(
          `Loaded ${progressData.progress.length} quest progress records from ${this.progressFile}`
        );
        return progressData.progress;
      }
    } catch (error) {
      repoLogger.error(`Error loading quest progress from ${this.progressFile}:`, error);
    }

    return [];
  }

  async findByUsername(username: string): Promise<QuestProgressData | undefined> {
    const allProgress = await this.findAll();
    return allProgress.find((p) => p.username.toLowerCase() === username.toLowerCase());
  }

  async findUsersWithActiveQuest(questId: string): Promise<string[]> {
    const allProgress = await this.findAll();
    return allProgress
      .filter((p) => p.activeQuests.some((q) => q.questId === questId))
      .map((p) => p.username);
  }

  async findUsersWithCompletedQuest(questId: string): Promise<string[]> {
    const allProgress = await this.findAll();
    return allProgress
      .filter((p) => p.completedQuests.some((q) => q.questId === questId))
      .map((p) => p.username);
  }

  async save(progress: QuestProgressData): Promise<void> {
    const allProgress = await this.findAll();
    const existingIndex = allProgress.findIndex(
      (p) => p.username.toLowerCase() === progress.username.toLowerCase()
    );

    // Update timestamp
    progress.updatedAt = new Date().toISOString();

    if (existingIndex >= 0) {
      allProgress[existingIndex] = progress;
    } else {
      allProgress.push(progress);
    }

    await this.writeProgress(allProgress);
  }

  async saveAll(progressList: QuestProgressData[]): Promise<void> {
    // Update timestamps
    const now = new Date().toISOString();
    for (const p of progressList) {
      p.updatedAt = now;
    }
    await this.writeProgress(progressList);
  }

  async delete(username: string): Promise<void> {
    const allProgress = await this.findAll();
    const filtered = allProgress.filter((p) => p.username.toLowerCase() !== username.toLowerCase());
    await this.writeProgress(filtered);
  }

  async hasCompletedQuest(username: string, questId: string): Promise<boolean> {
    const progress = await this.findByUsername(username);
    if (!progress) return false;
    return progress.completedQuests.some((q) => q.questId === questId);
  }

  async getActiveQuestCount(username: string): Promise<number> {
    const progress = await this.findByUsername(username);
    if (!progress) return 0;
    return progress.activeQuests.length;
  }

  private async writeProgress(progressList: QuestProgressData[]): Promise<void> {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    const progressData: QuestProgressFileData = { progress: progressList };
    fs.writeFileSync(this.progressFile, JSON.stringify(progressData, null, 2));
    repoLogger.debug(`Saved ${progressList.length} quest progress records to ${this.progressFile}`);
  }
}
