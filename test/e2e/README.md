# E2E Tests

End-to-end tests for EllyMUD using the `TesterAgent` API.

## Overview

E2E tests verify complete game flows through the virtual session interface, allowing programmatic control of:
- Player sessions (login, commands, output)
- Game time (tick advancement)
- Game state (snapshots, resets)

## Running Tests

```bash
npm run test:e2e
```

## Test Organization

- `regeneration.e2e.test.ts` - HP/MP regeneration mechanics
- `combat.e2e.test.ts` - Combat system flows

## Writing E2E Tests

```typescript
import { TesterAgent } from '../../src/testing/testerAgent';

describe('Feature E2E', () => {
  let agent: TesterAgent;

  beforeAll(async () => {
    agent = await TesterAgent.create();
  });

  afterAll(async () => {
    await agent.shutdown();
  });

  it('should do something', async () => {
    const sessionId = await agent.directLogin('testuser');
    agent.sendCommand(sessionId, 'look');
    const output = agent.getOutput(sessionId);
    expect(output).toContain('expected text');
    agent.closeSession(sessionId);
  });
});
```
