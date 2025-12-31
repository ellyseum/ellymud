/**
 * Kysely-based implementation of IAsyncItemRepository
 * Provides database access for Item templates and instances via SQLite or PostgreSQL
 * @module persistence/KyselyItemRepository
 */

import { Kysely } from 'kysely';
import { Database } from '../data/schema';
import { GameItem, ItemInstance } from '../types';
import { IAsyncItemRepository } from './interfaces';
import {
  dbRowToGameItem,
  gameItemToDbRow,
  dbRowToItemInstance,
  itemInstanceToDbRow,
} from './mappers';
import { getDb } from '../data/db';

export class KyselyItemRepository implements IAsyncItemRepository {
  constructor(private db: Kysely<Database> = getDb()) {}

  // ========== Template Operations ==========

  async findAllTemplates(): Promise<GameItem[]> {
    const rows = await this.db.selectFrom('item_templates').selectAll().execute();
    return rows.map(dbRowToGameItem);
  }

  async findTemplateById(id: string): Promise<GameItem | undefined> {
    const row = await this.db
      .selectFrom('item_templates')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
    return row ? dbRowToGameItem(row) : undefined;
  }

  async saveTemplate(item: GameItem): Promise<void> {
    const row = gameItemToDbRow(item);
    await this.db
      .insertInto('item_templates')
      .values(row)
      .onConflict((oc) => oc.column('id').doUpdateSet(row))
      .execute();
  }

  async saveTemplates(items: GameItem[]): Promise<void> {
    if (items.length === 0) return;

    await this.db.transaction().execute(async (trx) => {
      for (const item of items) {
        const row = gameItemToDbRow(item);
        await trx
          .insertInto('item_templates')
          .values(row)
          .onConflict((oc) => oc.column('id').doUpdateSet(row))
          .execute();
      }
    });
  }

  async deleteTemplate(id: string): Promise<void> {
    await this.db.deleteFrom('item_templates').where('id', '=', id).execute();
  }

  // ========== Instance Operations ==========

  async findAllInstances(): Promise<ItemInstance[]> {
    const rows = await this.db.selectFrom('item_instances').selectAll().execute();
    return rows.map(dbRowToItemInstance);
  }

  async findInstanceById(instanceId: string): Promise<ItemInstance | undefined> {
    const row = await this.db
      .selectFrom('item_instances')
      .selectAll()
      .where('instance_id', '=', instanceId)
      .executeTakeFirst();
    return row ? dbRowToItemInstance(row) : undefined;
  }

  async findInstancesByTemplateId(templateId: string): Promise<ItemInstance[]> {
    const rows = await this.db
      .selectFrom('item_instances')
      .selectAll()
      .where('template_id', '=', templateId)
      .execute();
    return rows.map(dbRowToItemInstance);
  }

  async saveInstance(instance: ItemInstance): Promise<void> {
    const row = itemInstanceToDbRow(instance);
    await this.db
      .insertInto('item_instances')
      .values(row)
      .onConflict((oc) => oc.column('instance_id').doUpdateSet(row))
      .execute();
  }

  async saveInstances(instances: ItemInstance[]): Promise<void> {
    if (instances.length === 0) return;

    await this.db.transaction().execute(async (trx) => {
      for (const instance of instances) {
        const row = itemInstanceToDbRow(instance);
        await trx
          .insertInto('item_instances')
          .values(row)
          .onConflict((oc) => oc.column('instance_id').doUpdateSet(row))
          .execute();
      }
    });
  }

  async deleteInstance(instanceId: string): Promise<void> {
    await this.db.deleteFrom('item_instances').where('instance_id', '=', instanceId).execute();
  }
}
