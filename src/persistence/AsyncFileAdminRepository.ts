/**
 * Async file-based repository for Admin data persistence
 * @module persistence/AsyncFileAdminRepository
 */

import fs from 'fs';
import path from 'path';
import { AdminUser, IAsyncAdminRepository, RepositoryConfig } from './interfaces';
import { createContextLogger } from '../utils/logger';

const repoLogger = createContextLogger('AsyncFileAdminRepository');

const DEFAULT_DATA_DIR = path.join(__dirname, '..', '..', 'data');
const ADMIN_FILENAME = 'admin.json';

interface AdminFileData {
  admins: AdminUser[];
}

export class AsyncFileAdminRepository implements IAsyncAdminRepository {
  private readonly adminFile: string;
  private readonly dataDir: string;

  constructor(config?: RepositoryConfig) {
    this.dataDir = config?.dataDir ?? DEFAULT_DATA_DIR;
    this.adminFile = path.join(this.dataDir, ADMIN_FILENAME);
  }

  async findAll(): Promise<AdminUser[]> {
    if (!fs.existsSync(this.adminFile)) {
      repoLogger.info(`Admin file not found at ${this.adminFile}, returning empty array`);
      return [];
    }

    try {
      const data = fs.readFileSync(this.adminFile, 'utf8');
      const adminData: AdminFileData = JSON.parse(data);
      if (adminData && Array.isArray(adminData.admins)) {
        repoLogger.debug(`Loaded ${adminData.admins.length} admins from ${this.adminFile}`);
        return adminData.admins;
      }
    } catch (error) {
      repoLogger.error(`Error loading admins from ${this.adminFile}:`, error);
    }

    return [];
  }

  async findByUsername(username: string): Promise<AdminUser | undefined> {
    const admins = await this.findAll();
    return admins.find((a) => a.username.toLowerCase() === username.toLowerCase());
  }

  async exists(username: string): Promise<boolean> {
    const admin = await this.findByUsername(username);
    return admin !== undefined;
  }

  async save(admin: AdminUser): Promise<void> {
    const admins = await this.findAll();
    const existingIndex = admins.findIndex(
      (a) => a.username.toLowerCase() === admin.username.toLowerCase()
    );

    if (existingIndex >= 0) {
      admins[existingIndex] = admin;
    } else {
      admins.push(admin);
    }

    await this.writeAdmins(admins);
  }

  async saveAll(admins: AdminUser[]): Promise<void> {
    await this.writeAdmins(admins);
  }

  async delete(username: string): Promise<void> {
    const admins = await this.findAll();
    const filtered = admins.filter((a) => a.username.toLowerCase() !== username.toLowerCase());
    await this.writeAdmins(filtered);
  }

  async storageExists(): Promise<boolean> {
    return fs.existsSync(this.adminFile);
  }

  private async writeAdmins(admins: AdminUser[]): Promise<void> {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    const adminData: AdminFileData = { admins };
    fs.writeFileSync(this.adminFile, JSON.stringify(adminData, null, 2));
    repoLogger.debug(`Saved ${admins.length} admins to ${this.adminFile}`);
  }
}
