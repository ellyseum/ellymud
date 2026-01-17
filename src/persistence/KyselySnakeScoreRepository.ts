/**
 * Kysely-based repository for SnakeScoreEntry data persistence
 * @module persistence/KyselySnakeScoreRepository
 */

import { getDb } from '../data/db';
import { IAsyncSnakeScoreRepository } from './interfaces';
import { SnakeScoreEntry } from '../types';
import { dbRowToSnakeScore, snakeScoreToDbRow } from './mappers/snakeScoreMapper';
import { createContextLogger } from '../utils/logger';

const repoLogger = createContextLogger('KyselySnakeScoreRepository');

export class KyselySnakeScoreRepository implements IAsyncSnakeScoreRepository {
  async findAll(): Promise<SnakeScoreEntry[]> {
    const db = getDb();
    const rows = await db.selectFrom('snake_scores').selectAll().execute();
    repoLogger.debug(`Loaded ${rows.length} snake scores from database`);
    return rows.map(dbRowToSnakeScore);
  }

  async findByUsername(username: string): Promise<SnakeScoreEntry[]> {
    const db = getDb();
    const rows = await db
      .selectFrom('snake_scores')
      .selectAll()
      .where('username', '=', username.toLowerCase())
      .execute();
    return rows.map(dbRowToSnakeScore);
  }

  async findTopScores(limit: number): Promise<SnakeScoreEntry[]> {
    const db = getDb();
    const rows = await db
      .selectFrom('snake_scores')
      .selectAll()
      .orderBy('score', 'desc')
      .limit(limit)
      .execute();
    return rows.map(dbRowToSnakeScore);
  }

  async save(entry: SnakeScoreEntry): Promise<void> {
    const db = getDb();
    const row = snakeScoreToDbRow(entry);

    // Snake scores are append-only (no upsert needed, each score is a new entry)
    await db.insertInto('snake_scores').values(row).execute();

    repoLogger.debug(`Saved snake score for ${entry.username}: ${entry.score}`);
  }

  async saveAll(entries: SnakeScoreEntry[]): Promise<void> {
    const db = getDb();

    await db.transaction().execute(async (trx) => {
      for (const entry of entries) {
        const row = snakeScoreToDbRow(entry);
        await trx.insertInto('snake_scores').values(row).execute();
      }
    });

    repoLogger.debug(`Saved ${entries.length} snake scores to database`);
  }

  async deleteByUsername(username: string): Promise<void> {
    const db = getDb();
    await db.deleteFrom('snake_scores').where('username', '=', username.toLowerCase()).execute();
    repoLogger.debug(`Deleted snake scores for ${username}`);
  }
}
