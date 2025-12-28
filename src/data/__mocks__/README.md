# Database Mocks

Jest mocks for the database module to prevent native module loading during tests.

## Contents

| File | Description |
|------|-------------|
| `db.ts` | Mock implementation of database connection |

## Purpose

The `better-sqlite3` package is a native Node.js module that can cause issues in Jest's test environment. These mocks provide a fake implementation that returns empty/mock data, allowing tests to run without loading the actual database.

## Related

- [AGENTS.md](AGENTS.md) - Technical details for LLMs
- [../db.ts](../db.ts) - Real database implementation being mocked
- [../../../jest.config.js](../../../jest.config.js) - Jest module mapper configuration
