/**
 * Kysely-based implementation of IAsyncRoomStateRepository
 * Provides database access for RoomState entities via SQLite or PostgreSQL
 * @module persistence/KyselyRoomStateRepository
 */

import { Kysely } from 'kysely';
import { Database } from '../data/schema';
import { RoomState } from '../room/roomState';
import { IAsyncRoomStateRepository } from './interfaces';
import { dbRowToRoomState, roomStateToDbRow } from './mappers/roomStateMapper';
import { getDb } from '../data/db';

export class KyselyRoomStateRepository implements IAsyncRoomStateRepository {
  constructor(private db: Kysely<Database> = getDb()) {}

  async findAll(): Promise<RoomState[]> {
    const rows = await this.db.selectFrom('room_states').selectAll().execute();
    return rows.map(dbRowToRoomState);
  }

  async findByRoomId(roomId: string): Promise<RoomState | undefined> {
    const row = await this.db
      .selectFrom('room_states')
      .selectAll()
      .where('room_id', '=', roomId)
      .executeTakeFirst();
    return row ? dbRowToRoomState(row) : undefined;
  }

  async save(state: RoomState): Promise<void> {
    const row = roomStateToDbRow(state);
    await this.db
      .insertInto('room_states')
      .values(row)
      .onConflict((oc) => oc.column('room_id').doUpdateSet(row))
      .execute();
  }

  async saveAll(states: RoomState[]): Promise<void> {
    if (states.length === 0) return;

    await this.db.transaction().execute(async (trx) => {
      for (const state of states) {
        const row = roomStateToDbRow(state);
        await trx
          .insertInto('room_states')
          .values(row)
          .onConflict((oc) => oc.column('room_id').doUpdateSet(row))
          .execute();
      }
    });
  }

  async delete(roomId: string): Promise<void> {
    await this.db.deleteFrom('room_states').where('room_id', '=', roomId).execute();
  }
}
