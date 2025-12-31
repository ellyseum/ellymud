/**
 * Kysely-based implementation of IAsyncRoomRepository
 * Provides database access for Room entities via SQLite or PostgreSQL
 * @module persistence/KyselyRoomRepository
 */

import { Kysely } from 'kysely';
import { Database } from '../data/schema';
import { RoomData } from '../room/roomData';
import { IAsyncRoomRepository } from './interfaces';
import { dbRowToRoomData, roomDataToDbRow } from './mappers';
import { getDb } from '../data/db';

export class KyselyRoomRepository implements IAsyncRoomRepository {
  constructor(private db: Kysely<Database> = getDb()) {}

  async findAll(): Promise<RoomData[]> {
    const rows = await this.db.selectFrom('rooms').selectAll().execute();
    return rows.map(dbRowToRoomData);
  }

  async findById(id: string): Promise<RoomData | undefined> {
    const row = await this.db
      .selectFrom('rooms')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
    return row ? dbRowToRoomData(row) : undefined;
  }

  async save(room: RoomData): Promise<void> {
    const row = roomDataToDbRow(room);
    await this.db
      .insertInto('rooms')
      .values(row)
      .onConflict((oc) => oc.column('id').doUpdateSet(row))
      .execute();
  }

  async saveAll(rooms: RoomData[]): Promise<void> {
    if (rooms.length === 0) return;

    // Use transaction for batch save
    await this.db.transaction().execute(async (trx) => {
      for (const room of rooms) {
        const row = roomDataToDbRow(room);
        await trx
          .insertInto('rooms')
          .values(row)
          .onConflict((oc) => oc.column('id').doUpdateSet(row))
          .execute();
      }
    });
  }

  async delete(id: string): Promise<void> {
    await this.db.deleteFrom('rooms').where('id', '=', id).execute();
  }
}
