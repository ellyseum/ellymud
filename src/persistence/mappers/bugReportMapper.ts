/**
 * BugReport field mappers for database ↔ domain conversion
 * @module persistence/mappers/bugReportMapper
 */

import { BugReportsTable } from '../../data/schema';
import { BugReport } from '../interfaces';

/**
 * Convert a database row to BugReport domain object
 */
export function dbRowToBugReport(row: BugReportsTable): BugReport {
  return {
    id: row.id,
    user: row.user,
    datetime: row.datetime,
    report: row.report,
    logs: {
      raw: row.logs_raw,
      user: row.logs_user,
    },
    solved: row.solved === 1,
    solvedOn: row.solved_on,
    solvedBy: row.solved_by,
    solvedReason: row.solved_reason,
  };
}

/**
 * Convert BugReport domain object to a database row
 */
export function bugReportToDbRow(report: BugReport): BugReportsTable {
  return {
    id: report.id,
    user: report.user,
    datetime: report.datetime,
    report: report.report,
    logs_raw: report.logs.raw,
    logs_user: report.logs.user,
    solved: report.solved ? 1 : 0,
    solved_on: report.solvedOn,
    solved_by: report.solvedBy,
    solved_reason: report.solvedReason,
  };
}
