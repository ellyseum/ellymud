/**
 * Async file-based repository for BugReport data persistence
 * @module persistence/AsyncFileBugReportRepository
 */

import fs from 'fs';
import path from 'path';
import { BugReport, IAsyncBugReportRepository, RepositoryConfig } from './interfaces';
import { createContextLogger } from '../utils/logger';

const repoLogger = createContextLogger('AsyncFileBugReportRepository');

const DEFAULT_DATA_DIR = path.join(__dirname, '..', '..', 'data');
const BUG_REPORTS_FILENAME = 'bug-reports.json';

interface BugReportFileData {
  reports: BugReport[];
}

export class AsyncFileBugReportRepository implements IAsyncBugReportRepository {
  private readonly bugReportsFile: string;
  private readonly dataDir: string;

  constructor(config?: RepositoryConfig) {
    this.dataDir = config?.dataDir ?? DEFAULT_DATA_DIR;
    this.bugReportsFile = path.join(this.dataDir, BUG_REPORTS_FILENAME);
  }

  async findAll(): Promise<BugReport[]> {
    if (!fs.existsSync(this.bugReportsFile)) {
      repoLogger.info(
        `Bug reports file not found at ${this.bugReportsFile}, returning empty array`
      );
      return [];
    }

    try {
      const data = fs.readFileSync(this.bugReportsFile, 'utf8');
      const reportData: BugReportFileData = JSON.parse(data);
      if (reportData && Array.isArray(reportData.reports)) {
        repoLogger.debug(
          `Loaded ${reportData.reports.length} bug reports from ${this.bugReportsFile}`
        );
        return reportData.reports;
      }
    } catch (error) {
      repoLogger.error(`Error loading bug reports from ${this.bugReportsFile}:`, error);
    }

    return [];
  }

  async findById(id: string): Promise<BugReport | undefined> {
    const reports = await this.findAll();
    return reports.find((r) => r.id === id);
  }

  async findByUser(username: string): Promise<BugReport[]> {
    const reports = await this.findAll();
    return reports.filter((r) => r.user.toLowerCase() === username.toLowerCase());
  }

  async findUnsolved(): Promise<BugReport[]> {
    const reports = await this.findAll();
    return reports.filter((r) => !r.solved);
  }

  async save(report: BugReport): Promise<void> {
    const reports = await this.findAll();
    const existingIndex = reports.findIndex((r) => r.id === report.id);

    if (existingIndex >= 0) {
      reports[existingIndex] = report;
    } else {
      reports.push(report);
    }

    await this.writeReports(reports);
  }

  async saveAll(reports: BugReport[]): Promise<void> {
    await this.writeReports(reports);
  }

  async delete(id: string): Promise<void> {
    const reports = await this.findAll();
    const filtered = reports.filter((r) => r.id !== id);
    await this.writeReports(filtered);
  }

  private async writeReports(reports: BugReport[]): Promise<void> {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    const reportData: BugReportFileData = { reports };
    fs.writeFileSync(this.bugReportsFile, JSON.stringify(reportData, null, 2));
    repoLogger.debug(`Saved ${reports.length} bug reports to ${this.bugReportsFile}`);
  }
}
