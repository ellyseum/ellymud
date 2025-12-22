# Tests - LLM Context

## Overview

Directory for unit and integration tests. Currently empty—tests are a planned future addition.

## Planned Test Structure

```
test/
├── unit/
│   ├── command/        # Command tests
│   ├── combat/         # Combat tests
│   ├── room/           # Room tests
│   └── user/           # User tests
├── integration/
│   ├── auth.test.ts    # Authentication flow
│   ├── combat.test.ts  # Full combat flow
│   └── movement.test.ts # Room navigation
└── e2e/
    └── gameplay.test.ts # End-to-end scenarios
```

## Recommended Framework

- **Jest** or **Vitest** for unit tests
- **VirtualConnection** for testing without real sockets

## Testing with VirtualConnection

```typescript
import { VirtualConnection } from '../src/connection/virtual.connection';

// Create test client
const connection = new VirtualConnection('test-1');
const client: ConnectedClient = {
  id: 'test-1',
  connection,
  // ... other properties
};

// Simulate input
connection.simulateInput('look');

// Check output
const output = connection.getOutput();
expect(output).toContain('Town Square');
```

## Related Context

- [`../src/connection/virtual.connection.ts`](../src/connection/virtual.connection.ts) - For testing
- [`../package.json`](../package.json) - Test scripts when added
