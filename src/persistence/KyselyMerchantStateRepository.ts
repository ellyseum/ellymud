/**
 * Kysely-based repository for MerchantInventoryState data persistence
 * @module persistence/KyselyMerchantStateRepository
 */

import { getDb } from '../data/db';
import { IAsyncMerchantStateRepository } from './interfaces';
import { MerchantInventoryState } from '../combat/merchant';
import { dbRowToMerchantState, merchantStateToDbRow } from './mappers/merchantStateMapper';
import { createContextLogger } from '../utils/logger';

const repoLogger = createContextLogger('KyselyMerchantStateRepository');

export class KyselyMerchantStateRepository implements IAsyncMerchantStateRepository {
  async findAll(): Promise<MerchantInventoryState[]> {
    const db = getDb();
    const rows = await db.selectFrom('merchant_states').selectAll().execute();
    repoLogger.debug(`Loaded ${rows.length} merchant states from database`);
    return rows.map(dbRowToMerchantState);
  }

  async findByTemplateId(templateId: string): Promise<MerchantInventoryState | undefined> {
    const db = getDb();
    const row = await db
      .selectFrom('merchant_states')
      .selectAll()
      .where('npc_template_id', '=', templateId)
      .executeTakeFirst();
    return row ? dbRowToMerchantState(row) : undefined;
  }

  async exists(templateId: string): Promise<boolean> {
    const state = await this.findByTemplateId(templateId);
    return state !== undefined;
  }

  async save(state: MerchantInventoryState): Promise<void> {
    const db = getDb();
    const row = merchantStateToDbRow(state);

    await db
      .insertInto('merchant_states')
      .values(row)
      .onConflict((oc) => oc.column('npc_template_id').doUpdateSet(row))
      .execute();

    repoLogger.debug(`Saved merchant state for ${state.npcTemplateId}`);
  }

  async saveAll(states: MerchantInventoryState[]): Promise<void> {
    const db = getDb();

    await db.transaction().execute(async (trx) => {
      for (const state of states) {
        const row = merchantStateToDbRow(state);
        await trx
          .insertInto('merchant_states')
          .values(row)
          .onConflict((oc) => oc.column('npc_template_id').doUpdateSet(row))
          .execute();
      }
    });

    repoLogger.debug(`Saved ${states.length} merchant states to database`);
  }

  async delete(templateId: string): Promise<void> {
    const db = getDb();
    await db.deleteFrom('merchant_states').where('npc_template_id', '=', templateId).execute();
    repoLogger.debug(`Deleted merchant state for ${templateId}`);
  }
}
