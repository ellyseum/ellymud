/**
 * Kysely-based repository for BugReport data persistence
 * @module persistence/KyselyBugReportRepository
 */

import { getDb } from '../data/db';
import { BugReport, IAsyncBugReportRepository } from './interfaces';
import { dbRowToBugReport, bugReportToDbRow } from './mappers/bugReportMapper';
import { createContextLogger } from '../utils/logger';

const repoLogger = createContextLogger('KyselyBugReportRepository');

export class KyselyBugReportRepository implements IAsyncBugReportRepository {
  async findAll(): Promise<BugReport[]> {
    const db = getDb();
    const rows = await db.selectFrom('bug_reports').selectAll().execute();
    repoLogger.debug(`Loaded ${rows.length} bug reports from database`);
    return rows.map(dbRowToBugReport);
  }

  async findById(id: string): Promise<BugReport | undefined> {
    const db = getDb();
    const row = await db
      .selectFrom('bug_reports')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
    return row ? dbRowToBugReport(row) : undefined;
  }

  async findByUser(username: string): Promise<BugReport[]> {
    const db = getDb();
    const rows = await db
      .selectFrom('bug_reports')
      .selectAll()
      .where('user', '=', username.toLowerCase())
      .execute();
    return rows.map(dbRowToBugReport);
  }

  async findUnsolved(): Promise<BugReport[]> {
    const db = getDb();
    const rows = await db.selectFrom('bug_reports').selectAll().where('solved', '=', 0).execute();
    return rows.map(dbRowToBugReport);
  }

  async save(report: BugReport): Promise<void> {
    const db = getDb();
    const row = bugReportToDbRow(report);

    await db
      .insertInto('bug_reports')
      .values(row)
      .onConflict((oc) => oc.column('id').doUpdateSet(row))
      .execute();

    repoLogger.debug(`Saved bug report ${report.id}`);
  }

  async saveAll(reports: BugReport[]): Promise<void> {
    const db = getDb();

    await db.transaction().execute(async (trx) => {
      for (const report of reports) {
        const row = bugReportToDbRow(report);
        await trx
          .insertInto('bug_reports')
          .values(row)
          .onConflict((oc) => oc.column('id').doUpdateSet(row))
          .execute();
      }
    });

    repoLogger.debug(`Saved ${reports.length} bug reports to database`);
  }

  async delete(id: string): Promise<void> {
    const db = getDb();
    await db.deleteFrom('bug_reports').where('id', '=', id).execute();
    repoLogger.debug(`Deleted bug report ${id}`);
  }
}
