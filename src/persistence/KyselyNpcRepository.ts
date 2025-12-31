/**
 * Kysely-based implementation of IAsyncNpcRepository
 * Provides database access for NPC template entities via SQLite or PostgreSQL
 * @module persistence/KyselyNpcRepository
 */

import { Kysely } from 'kysely';
import { Database } from '../data/schema';
import { NPCData } from '../combat/npc';
import { IAsyncNpcRepository } from './interfaces';
import { dbRowToNPCData, npcDataToDbRow } from './mappers';
import { getDb } from '../data/db';

export class KyselyNpcRepository implements IAsyncNpcRepository {
  constructor(private db: Kysely<Database> = getDb()) {}

  async findAll(): Promise<NPCData[]> {
    const rows = await this.db.selectFrom('npc_templates').selectAll().execute();
    return rows.map(dbRowToNPCData);
  }

  async findById(id: string): Promise<NPCData | undefined> {
    const row = await this.db
      .selectFrom('npc_templates')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
    return row ? dbRowToNPCData(row) : undefined;
  }

  async findByName(name: string): Promise<NPCData | undefined> {
    const row = await this.db
      .selectFrom('npc_templates')
      .selectAll()
      .where('name', '=', name)
      .executeTakeFirst();
    return row ? dbRowToNPCData(row) : undefined;
  }

  async findHostile(): Promise<NPCData[]> {
    const rows = await this.db
      .selectFrom('npc_templates')
      .selectAll()
      .where('is_hostile', '=', 1)
      .execute();
    return rows.map(dbRowToNPCData);
  }

  async findMerchants(): Promise<NPCData[]> {
    const rows = await this.db
      .selectFrom('npc_templates')
      .selectAll()
      .where('merchant', '=', 1)
      .execute();
    return rows.map(dbRowToNPCData);
  }

  async save(npc: NPCData): Promise<void> {
    const row = npcDataToDbRow(npc);
    await this.db
      .insertInto('npc_templates')
      .values(row)
      .onConflict((oc) => oc.column('id').doUpdateSet(row))
      .execute();
  }

  async saveAll(npcs: NPCData[]): Promise<void> {
    if (npcs.length === 0) return;

    // Note: While batch inserts (single statement with multiple rows) are faster,
    // Kysely's onConflict().doUpdateSet() doesn't support referencing `excluded.*`
    // columns easily for upserts. The loop approach ensures each row's values are
    // used for the update. For large datasets, consider chunking or raw SQL.
    await this.db.transaction().execute(async (trx) => {
      for (const npc of npcs) {
        const row = npcDataToDbRow(npc);
        await trx
          .insertInto('npc_templates')
          .values(row)
          .onConflict((oc) => oc.column('id').doUpdateSet(row))
          .execute();
      }
    });
  }

  async delete(id: string): Promise<void> {
    await this.db.deleteFrom('npc_templates').where('id', '=', id).execute();
  }
}
