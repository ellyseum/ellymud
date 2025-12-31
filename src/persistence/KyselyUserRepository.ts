/**
 * Kysely-based implementation of IAsyncUserRepository
 * Provides database access for User entities via SQLite or PostgreSQL
 * @module persistence/KyselyUserRepository
 */

import { Kysely } from 'kysely';
import { Database } from '../data/schema';
import { User } from '../types';
import { IAsyncUserRepository } from './interfaces';
import { dbRowToUser, userToDbRow } from './mappers';
import { getDb } from '../data/db';

export class KyselyUserRepository implements IAsyncUserRepository {
  constructor(private db: Kysely<Database> = getDb()) {}

  async findAll(): Promise<User[]> {
    const rows = await this.db.selectFrom('users').selectAll().execute();
    return rows.map(dbRowToUser);
  }

  async findByUsername(username: string): Promise<User | undefined> {
    const row = await this.db
      .selectFrom('users')
      .selectAll()
      .where('username', '=', username)
      .executeTakeFirst();
    return row ? dbRowToUser(row) : undefined;
  }

  async exists(username: string): Promise<boolean> {
    const row = await this.db
      .selectFrom('users')
      .select('username')
      .where('username', '=', username)
      .executeTakeFirst();
    return row !== undefined;
  }

  async save(user: User): Promise<void> {
    const row = userToDbRow(user);
    await this.db
      .insertInto('users')
      .values(row)
      .onConflict((oc) => oc.column('username').doUpdateSet(row))
      .execute();
  }

  async saveAll(users: User[]): Promise<void> {
    if (users.length === 0) return;

    // Use transaction for batch save
    await this.db.transaction().execute(async (trx) => {
      for (const user of users) {
        const row = userToDbRow(user);
        await trx
          .insertInto('users')
          .values(row)
          .onConflict((oc) => oc.column('username').doUpdateSet(row))
          .execute();
      }
    });
  }

  async delete(username: string): Promise<void> {
    await this.db.deleteFrom('users').where('username', '=', username).execute();
  }

  async storageExists(): Promise<boolean> {
    // For database backends, storage always "exists" once tables are created
    // The table creation happens in db.ts initializeDatabase()
    try {
      await this.db.selectFrom('users').select('username').limit(1).execute();
      return true;
    } catch {
      return false;
    }
  }
}
