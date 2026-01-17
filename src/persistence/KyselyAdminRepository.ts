/**
 * Kysely-based implementation of IAsyncAdminRepository
 * Provides database access for AdminUser entities via SQLite or PostgreSQL
 * @module persistence/KyselyAdminRepository
 */

import { Kysely } from 'kysely';
import { Database } from '../data/schema';
import { AdminUser, IAsyncAdminRepository } from './interfaces';
import { dbRowToAdminUser, adminUserToDbRow } from './mappers/adminMapper';
import { getDb } from '../data/db';

export class KyselyAdminRepository implements IAsyncAdminRepository {
  constructor(private db: Kysely<Database> = getDb()) {}

  async findAll(): Promise<AdminUser[]> {
    const rows = await this.db.selectFrom('admins').selectAll().execute();
    return rows.map(dbRowToAdminUser);
  }

  async findByUsername(username: string): Promise<AdminUser | undefined> {
    const row = await this.db
      .selectFrom('admins')
      .selectAll()
      .where('username', '=', username.toLowerCase())
      .executeTakeFirst();
    return row ? dbRowToAdminUser(row) : undefined;
  }

  async exists(username: string): Promise<boolean> {
    const row = await this.db
      .selectFrom('admins')
      .select('username')
      .where('username', '=', username.toLowerCase())
      .executeTakeFirst();
    return row !== undefined;
  }

  async save(admin: AdminUser): Promise<void> {
    const row = adminUserToDbRow(admin);
    await this.db
      .insertInto('admins')
      .values(row)
      .onConflict((oc) => oc.column('username').doUpdateSet(row))
      .execute();
  }

  async saveAll(admins: AdminUser[]): Promise<void> {
    if (admins.length === 0) return;

    await this.db.transaction().execute(async (trx) => {
      for (const admin of admins) {
        const row = adminUserToDbRow(admin);
        await trx
          .insertInto('admins')
          .values(row)
          .onConflict((oc) => oc.column('username').doUpdateSet(row))
          .execute();
      }
    });
  }

  async delete(username: string): Promise<void> {
    await this.db.deleteFrom('admins').where('username', '=', username.toLowerCase()).execute();
  }

  async storageExists(): Promise<boolean> {
    try {
      await this.db.selectFrom('admins').select('username').limit(1).execute();
      return true;
    } catch {
      return false;
    }
  }
}
