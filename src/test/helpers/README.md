# Test Helpers

Mock factories and utilities for unit testing.

## Contents

| File | Description |
|------|-------------|
| `mockFactories.ts` | Factory functions for creating mock objects |

## Purpose

Provides consistent, reusable mock objects for unit tests:
- Mock users with sensible defaults
- Mock clients with socket connections
- Mock rooms, items, NPCs

## Usage

```typescript
import { createMockUser, createMockClient } from '../test/helpers/mockFactories';

const user = createMockUser({ username: 'testuser', level: 5 });
const client = createMockClient({ user });
```

## Related

- [AGENTS.md](AGENTS.md) - Technical details for LLMs
- [../../types.ts](../../types.ts) - Type definitions being mocked
