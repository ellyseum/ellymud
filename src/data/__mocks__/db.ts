/**
 * Jest mock for the database module
 * This prevents Jest from trying to load the native better-sqlite3 module
 */

import { Kysely } from 'kysely';
import { Database } from '../schema';

// Create a mock Kysely instance that returns empty results
const mockDb = {
  selectFrom: jest.fn().mockReturnValue({
    selectAll: jest.fn().mockReturnValue({
      execute: jest.fn().mockResolvedValue([]),
    }),
  }),
  insertInto: jest.fn().mockReturnValue({
    values: jest.fn().mockReturnValue({
      onConflict: jest.fn().mockReturnValue({
        column: jest.fn().mockReturnValue({
          doUpdateSet: jest.fn().mockReturnValue({
            execute: jest.fn().mockResolvedValue(undefined),
          }),
        }),
      }),
      execute: jest.fn().mockResolvedValue(undefined),
    }),
  }),
  schema: {
    createTable: jest.fn().mockReturnValue({
      ifNotExists: jest.fn().mockReturnValue({
        addColumn: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue(undefined),
      }),
    }),
  },
  destroy: jest.fn().mockResolvedValue(undefined),
} as unknown as Kysely<Database>;

export function getDb(): Kysely<Database> {
  return mockDb;
}

export async function initializeDatabase(): Promise<void> {
  // No-op in tests
}

export async function closeDatabase(): Promise<void> {
  // No-op in tests
}
