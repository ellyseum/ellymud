/**
 * Mapper for SnakeScoreEntry ↔ Database conversion
 * @module persistence/mappers/snakeScoreMapper
 */

import { Selectable } from 'kysely';
import { SnakeScoresTable } from '../../data/schema';
import { SnakeScoreEntry } from '../../types';

/**
 * Convert database row to domain SnakeScoreEntry
 * Uses Selectable<T> since Generated<number> becomes number when selected
 */
export function dbRowToSnakeScore(row: Selectable<SnakeScoresTable>): SnakeScoreEntry {
  return {
    username: row.username,
    score: row.score,
    date: row.date,
  };
}

/**
 * Convert domain SnakeScoreEntry to database row (omits auto-increment id)
 */
export function snakeScoreToDbRow(entry: SnakeScoreEntry): Omit<SnakeScoresTable, 'id'> {
  return {
    username: entry.username,
    score: entry.score,
    date: entry.date,
  };
}
