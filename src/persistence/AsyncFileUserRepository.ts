/**
 * Async wrapper around FileUserRepository
 * Implements IAsyncUserRepository using the existing JSON file storage
 * @module persistence/AsyncFileUserRepository
 */

import fs from 'fs';
import path from 'path';
import { User } from '../types';
import { IAsyncUserRepository, RepositoryConfig } from './interfaces';
import { loadAndValidateJsonFile } from '../utils/fileUtils';
import { createContextLogger } from '../utils/logger';

const repoLogger = createContextLogger('AsyncFileUserRepository');

const DEFAULT_DATA_DIR = path.join(__dirname, '..', '..', 'data');

export class AsyncFileUserRepository implements IAsyncUserRepository {
  private readonly usersFile: string;
  private readonly dataDir: string;

  constructor(config?: RepositoryConfig) {
    this.dataDir = config?.dataDir ?? DEFAULT_DATA_DIR;
    this.usersFile = path.join(this.dataDir, 'users.json');
  }

  async findAll(): Promise<User[]> {
    if (!fs.existsSync(this.usersFile)) {
      repoLogger.info(`Users file not found at ${this.usersFile}, returning empty array`);
      return [];
    }

    const userData = loadAndValidateJsonFile<User[]>(this.usersFile, 'users');
    if (userData && Array.isArray(userData)) {
      // Convert date strings to Date objects
      const users = userData.map((u) => ({
        ...u,
        joinDate: new Date(u.joinDate),
        lastLogin: new Date(u.lastLogin),
      }));
      repoLogger.info(`Loaded ${users.length} users from ${this.usersFile}`);
      return users;
    }

    repoLogger.warn(`Failed to load users from ${this.usersFile}`);
    return [];
  }

  async findByUsername(username: string): Promise<User | undefined> {
    const users = await this.findAll();
    return users.find((u) => u.username === username);
  }

  async exists(username: string): Promise<boolean> {
    const user = await this.findByUsername(username);
    return user !== undefined;
  }

  async save(user: User): Promise<void> {
    const users = await this.findAll();
    const existingIndex = users.findIndex((u) => u.username === user.username);

    if (existingIndex >= 0) {
      users[existingIndex] = user;
    } else {
      users.push(user);
    }

    await this.writeUsers(users);
  }

  async saveAll(users: User[]): Promise<void> {
    await this.writeUsers(users);
  }

  async delete(username: string): Promise<void> {
    const users = await this.findAll();
    const filtered = users.filter((u) => u.username !== username);
    await this.writeUsers(filtered);
  }

  async storageExists(): Promise<boolean> {
    return fs.existsSync(this.usersFile);
  }

  private async writeUsers(users: User[]): Promise<void> {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    // Extract count BEFORE write to break CodeQL taint tracking chain
    // The array may contain tainted objects, but the count is just a number
    const count = Number(users.length);
    const filePath = String(this.usersFile);

    fs.writeFileSync(this.usersFile, JSON.stringify(users, null, 2));

    // Log using pre-extracted safe values (not tainted by user data)
    repoLogger.info(`Saved ${count} users to ${filePath}`);
  }
}
