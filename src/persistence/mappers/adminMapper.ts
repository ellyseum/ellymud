/**
 * Admin field mappers for database ↔ domain conversion
 * @module persistence/mappers/adminMapper
 */

import { AdminsTable } from '../../data/schema';
import { AdminUser } from '../interfaces';

/**
 * Convert a database row to AdminUser domain object
 */
export function dbRowToAdminUser(row: AdminsTable): AdminUser {
  return {
    username: row.username,
    level: row.level as 'super' | 'admin' | 'mod',
    addedBy: row.added_by,
    addedOn: row.added_on,
  };
}

/**
 * Convert AdminUser domain object to a database row
 */
export function adminUserToDbRow(admin: AdminUser): AdminsTable {
  return {
    username: admin.username,
    level: admin.level,
    added_by: admin.addedBy,
    added_on: admin.addedOn,
  };
}
