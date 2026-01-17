/**
 * Kysely-based repository for AbilityTemplate data persistence
 * @module persistence/KyselyAbilityRepository
 */

import { getDb } from '../data/db';
import { IAsyncAbilityRepository } from './interfaces';
import { AbilityTemplate } from '../abilities/types';
import { dbRowToAbility, abilityToDbRow } from './mappers/abilityMapper';
import { createContextLogger } from '../utils/logger';

const repoLogger = createContextLogger('KyselyAbilityRepository');

export class KyselyAbilityRepository implements IAsyncAbilityRepository {
  async findAll(): Promise<AbilityTemplate[]> {
    const db = getDb();
    const rows = await db.selectFrom('abilities').selectAll().execute();
    repoLogger.debug(`Loaded ${rows.length} abilities from database`);
    return rows.map(dbRowToAbility);
  }

  async findById(id: string): Promise<AbilityTemplate | undefined> {
    const db = getDb();
    const row = await db
      .selectFrom('abilities')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
    return row ? dbRowToAbility(row) : undefined;
  }

  async findByType(type: string): Promise<AbilityTemplate[]> {
    const db = getDb();
    const rows = await db.selectFrom('abilities').selectAll().where('type', '=', type).execute();
    return rows.map(dbRowToAbility);
  }

  async save(ability: AbilityTemplate): Promise<void> {
    const db = getDb();
    const row = abilityToDbRow(ability);

    await db
      .insertInto('abilities')
      .values(row)
      .onConflict((oc) => oc.column('id').doUpdateSet(row))
      .execute();

    repoLogger.debug(`Saved ability ${ability.id}`);
  }

  async saveAll(abilities: AbilityTemplate[]): Promise<void> {
    const db = getDb();

    await db.transaction().execute(async (trx) => {
      for (const ability of abilities) {
        const row = abilityToDbRow(ability);
        await trx
          .insertInto('abilities')
          .values(row)
          .onConflict((oc) => oc.column('id').doUpdateSet(row))
          .execute();
      }
    });

    repoLogger.debug(`Saved ${abilities.length} abilities to database`);
  }

  async delete(id: string): Promise<void> {
    const db = getDb();
    await db.deleteFrom('abilities').where('id', '=', id).execute();
    repoLogger.debug(`Deleted ability ${id}`);
  }
}
