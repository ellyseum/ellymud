/**
 * Kysely-based implementation of IAsyncAreaRepository
 * @module persistence/KyselyAreaRepository
 */

import { Kysely } from 'kysely';
import { Database } from '../data/schema';
import { Area } from '../area/area';
import { IAsyncAreaRepository } from './interfaces';
import { dbRowToArea, areaToDbRow } from './mappers';
import { getDb } from '../data/db';

export class KyselyAreaRepository implements IAsyncAreaRepository {
  constructor(private db: Kysely<Database> = getDb()) {}

  async findAll(): Promise<Area[]> {
    const rows = await this.db.selectFrom('areas').selectAll().execute();
    return rows.map(dbRowToArea);
  }

  async findById(id: string): Promise<Area | undefined> {
    const row = await this.db
      .selectFrom('areas')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
    return row ? dbRowToArea(row) : undefined;
  }

  async save(area: Area): Promise<void> {
    const row = areaToDbRow(area);
    await this.db
      .insertInto('areas')
      .values(row)
      .onConflict((oc) => oc.column('id').doUpdateSet(row))
      .execute();
  }

  async saveAll(areas: Area[]): Promise<void> {
    if (areas.length === 0) return;
    await this.db.transaction().execute(async (trx) => {
      for (const area of areas) {
        const row = areaToDbRow(area);
        await trx
          .insertInto('areas')
          .values(row)
          .onConflict((oc) => oc.column('id').doUpdateSet(row))
          .execute();
      }
    });
  }

  async delete(id: string): Promise<void> {
    await this.db.deleteFrom('areas').where('id', '=', id).execute();
  }
}
