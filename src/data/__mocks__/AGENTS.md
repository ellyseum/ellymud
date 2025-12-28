# Database Mocks - LLM Context

## Overview

Jest mocks for the database module. These prevent the native `better-sqlite3` module from loading during tests.

## File Reference

### `db.ts`

**Purpose**: Mock implementation of `../db.ts` exports.

**Key Exports**:
```typescript
export function getDb(): Kysely<Database>  // Returns mock query builder
export async function initializeDatabase(): Promise<void>  // No-op
export async function closeDatabase(): Promise<void>  // No-op
```

**Mock Behavior**:
- `selectFrom()` returns chainable mock that resolves to empty arrays
- `insertInto()` returns chainable mock that resolves to undefined
- All operations are no-ops that don't touch the filesystem

## How It Works

Jest's `moduleNameMapper` in `jest.config.js` redirects imports:

```javascript
moduleNameMapper: {
  '^../data/db$': '<rootDir>/src/data/__mocks__/db.ts',
  '^../../data/db$': '<rootDir>/src/data/__mocks__/db.ts',
  '^./db$': '<rootDir>/src/data/__mocks__/db.ts',
}
```

## Updating the Mock

When adding new database methods or tables:

1. Add the method to the mock in `db.ts`
2. Ensure it returns appropriate mock data
3. Test that unit tests still pass

## Related Context

- [`../db.ts`](../db.ts) - Real implementation being mocked
- [`../schema.ts`](../schema.ts) - Database schema types
- [`../../../jest.config.js`](../../../jest.config.js) - Jest configuration
