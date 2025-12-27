# E2E Tests - LLM Context

> **Purpose**: End-to-end testing using the TesterAgent programmatic API.

## Directory Contents

| File | Purpose |
|------|---------|
| `README.md` | Human documentation |
| `AGENTS.md` | This file - LLM context |
| `*.e2e.test.ts` | E2E test files |

## TesterAgent API

The `TesterAgent` class provides programmatic access to:

### Session Control
```typescript
const agent = await TesterAgent.create();
const sessionId = await agent.directLogin('username');
agent.sendCommand(sessionId, 'command');
const output = agent.getOutput(sessionId);
agent.closeSession(sessionId);
await agent.shutdown();
```

### Time Manipulation
```typescript
agent.advanceTicks(12);      // Advance 12 ticks
agent.getTickCount();        // Get current tick
agent.advanceToRegen();      // Advance to next regen cycle
```

### State Management
```typescript
await agent.loadSnapshot('fresh');
await agent.saveSnapshot('my-test');
await agent.resetToClean();
```

### Player Stats
```typescript
const stats = agent.getPlayerStats(sessionId);
agent.setPlayerStats(sessionId, { health: 50 });
```

## Test File Naming

- All E2E tests must match pattern: `*.e2e.test.ts`
- Located in `test/e2e/` directory

## Conventions

1. One TesterAgent per test suite (use `beforeAll`/`afterAll`)
2. Reset state between tests with `resetToClean()` or `loadSnapshot()`
3. Close sessions in `afterEach`
4. Use `advanceTicks()` instead of real-time waits

## Snapshots

Test data snapshots in `data/test-snapshots/`:
- `fresh/` - Clean game state
- Create custom snapshots for specific test scenarios

## Running Tests

```bash
npm run test:e2e              # Run all E2E tests
npm run test:e2e -- --watch   # Watch mode
```
