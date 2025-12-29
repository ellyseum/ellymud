/**
 * Jest mock for the database module
 * This prevents Jest from trying to load the native better-sqlite3 module
 */

import { Kysely } from 'kysely';
import { Database } from '../schema';

// Create a fresh mock Kysely instance for each test to avoid state sharing
function createMockDb(): Kysely<Database> {
  return {
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
    transaction: jest.fn().mockReturnValue({
      execute: jest.fn().mockImplementation(async (callback: (trx: unknown) => Promise<void>) => {
        // Execute the transaction callback with a mock transaction object
        await callback(createMockDb());
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
}

export function getDb(): Kysely<Database> {
  return createMockDb();
}

export async function initializeDatabase(): Promise<void> {
  // No-op in tests
}

export async function closeDatabase(): Promise<void> {
  // No-op in tests
}
