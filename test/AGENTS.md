# Tests - LLM Context

## Overview

EllyMUD uses Jest with ts-jest for TypeScript testing. Unit tests are **colocated** with source files in `src/` rather than in a separate test directory. Integration tests (requiring external services) live in `test/integration/`, and E2E tests live in `test/e2e/` using the `TesterAgent` API for programmatic game testing.

## Test Types

| Type | Location | Config | Command |
|------|----------|--------|---------|
| Unit Tests | `src/**/*.test.ts` | `jest.config.js` | `npm test` or `npm run test:unit` |
| Integration Tests | `test/integration/**/*.integration.test.ts` | `jest.integration.config.js` | `npm run test:integration` |
| E2E Tests | `test/e2e/**/*.e2e.test.ts` | `jest.e2e.config.js` | `npm run test:e2e` |

### ⚠️ Jest Deprecated Flags

**`--testPathPattern` is DEPRECATED.** Use `--testPathPatterns` (plural) instead:

```bash
# ❌ WRONG - deprecated
npm test -- --testPathPattern="myfile.test.ts"

# ✅ CORRECT - use plural form
npm test -- --testPathPatterns="myfile.test.ts"

# ✅ ALSO CORRECT - just pass filename directly
npm test -- myfile.test.ts
```

## Configuration

### Jest Configuration (`jest.config.js`)

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  verbose: true,
};
```

### Integration Jest Configuration (`jest.integration.config.js`)

```javascript
module.exports = {
  ...require('./jest.config'),
  testMatch: ['**/test/integration/**/*.integration.test.ts'],
  testTimeout: 30000,
  maxWorkers: 1,  // Sequential - shared external resources
  collectCoverage: false,
  moduleNameMapper: {},  // Use real DB modules, not mocks
};
```

### E2E Jest Configuration (`jest.e2e.config.js`)

```javascript
module.exports = {
  ...require('./jest.config'),
  testMatch: ['**/test/e2e/**/*.e2e.test.ts'],
  testTimeout: 30000,
  maxWorkers: 1,  // Sequential to avoid port conflicts
  roots: ['<rootDir>/test'],
  collectCoverage: false,
  setupFilesAfterEnv: ['<rootDir>/test/e2e/setup.ts'],
  forceExit: true,  // Ensure clean exit
};
```

Key settings:
- **roots**: Unit tests from `src/`, E2E from `test/`
- **testMatch**: `*.test.ts` for unit, `*.integration.test.ts` for integration, `*.e2e.test.ts` for E2E
- **coverage**: Collected for unit tests only
- **setupFilesAfterEnv**: E2E setup enables silent mode before tests run
- **forceExit**: Prevents Jest from hanging on any unclosed handles

---

## Integration Testing

Integration tests verify the system works with real external services:

### Running Integration Tests

```bash
# Basic (Redis only)
npm run test:integration

# With PostgreSQL
./scripts/test-integration.sh --with-postgres

# With custom database URL
TEST_DATABASE_URL="postgres://..." npm run test:integration
```

### Storage Backends Tested

- **SQLite**: Local file database (`data/game.db`)
- **PostgreSQL**: Remote database (via `DATABASE_URL`)
- **JSON Files**: Flat file storage (`data/*.json`)

---

## E2E Testing with TesterAgent

### What is TesterAgent?

`TesterAgent` is a programmatic interface for E2E testing that provides the same capabilities as MCP tools but callable directly from Jest tests. It enables:

- **Time Control**: Pause and advance game ticks deterministically
- **Session Control**: Create virtual sessions and execute commands
- **State Control**: Load/save snapshots for test isolation
- **Player Manipulation**: Get/set player stats for testing

### Test Mode Features

When `TesterAgent.create()` is called, the server boots in test mode with:

| Feature | Default | Description |
|---------|---------|-------------|
| `silent` | `true` | Suppress all console output |
| `noColor` | `true` | Disable ANSI color codes |
| `noConsole` | `true` | Disable interactive console |
| `disableRemoteAdmin` | `true` | Disable remote admin access |
| `enableTimer` | `false` | Game timer is paused (manual tick control) |
| `skipAdminSetup` | `true` | Skip admin user creation prompt |
| Random ports | `49152-65535` | Avoid port conflicts between test runs |

### Basic E2E Test Structure

```typescript
import { TesterAgent } from '../../src/testing/testerAgent';

describe('Feature E2E', () => {
  let agent: TesterAgent;
  let sessionId: string;

  beforeAll(async () => {
    // Create agent with server in test mode
    agent = await TesterAgent.create();
  });

  afterAll(async () => {
    // Clean shutdown
    await agent.shutdown();
  });

  beforeEach(async () => {
    // Reset to clean state before each test
    await agent.resetToClean();
    // Login as a test user
    sessionId = await agent.directLogin('testuser');
    // Clear output buffer
    agent.getOutput(sessionId, true);
  });

  afterEach(() => {
    agent.closeSession(sessionId);
  });

  it('should do something', async () => {
    const output = agent.sendCommand(sessionId, 'look');
    expect(output).toContain('Town Square');
  });
});
```

### TesterAgent API Reference

#### Session Control

```typescript
// Create session and login directly (recommended)
const sessionId = await agent.directLogin('testuser');

// Create unauthenticated session (for login flow testing)
const sessionId = await agent.createSession();

// Send command and get output
const output = agent.sendCommand(sessionId, 'look');

// Get accumulated output (clear buffer by default)
const output = agent.getOutput(sessionId, true);

// Close session
agent.closeSession(sessionId);
```

#### Time Control

```typescript
// Get current tick count
const ticks = agent.getTickCount();

// Advance by N ticks (synchronous)
agent.advanceTicks(5);

// Advance to next regeneration cycle (12 ticks)
agent.advanceToRegen();
```

#### State Control

```typescript
// Reset to fresh state (clears users, restores defaults)
await agent.resetToClean();

// Load a named snapshot
await agent.loadSnapshot('combat-ready');

// Save current state as snapshot
await agent.saveSnapshot('my-test-state');
```

#### Player Stats

```typescript
// Get player stats
const stats = agent.getPlayerStats(sessionId);
// { health, maxHealth, mana, maxMana, gold, experience, level }

// Set player stats for testing
agent.setPlayerStats(sessionId, {
  health: 50,
  maxHealth: 100,
  mana: 25,
  maxMana: 50,
  gold: 1000,
});
```

### Common Testing Patterns

#### Pattern: Test HP Regeneration

```typescript
it('should regenerate HP after 12 ticks', async () => {
  // Set damaged HP
  agent.setPlayerStats(sessionId, { health: 50, maxHealth: 100 });

  // Advance 12 ticks (one regen cycle)
  agent.advanceTicks(12);

  // Verify HP increased
  const stats = agent.getPlayerStats(sessionId);
  expect(stats.health).toBeGreaterThan(50);
});
```

#### Pattern: Test Command Output

```typescript
it('should show room description', async () => {
  const output = agent.sendCommand(sessionId, 'look');
  expect(output).toContain('Town Square');
  expect(output).toMatch(/exits?:/i);
});
```

#### Pattern: Test Movement

```typescript
it('should move to new room', async () => {
  // Move north
  const output = agent.sendCommand(sessionId, 'north');

  // Verify new room
  expect(output).toContain('General Store');
});
```

#### Pattern: Test with Multiple Players

```typescript
it('should allow player interaction', async () => {
  const session1 = await agent.directLogin('player1');
  const session2 = await agent.directLogin('player2');

  // Player1 says something
  agent.sendCommand(session1, 'say Hello!');

  // Player2 should see it
  const output = agent.getOutput(session2);
  expect(output).toContain('player1 says');

  agent.closeSession(session1);
  agent.closeSession(session2);
});
```

---

## Unit Test File Convention

Unit tests are colocated alongside source files:

```
src/
├── utils/
│   ├── colors.ts           # Source file
│   ├── colors.test.ts      # Test file
│   ├── formatters.ts       # Source file
│   └── formatters.test.ts  # Test file
├── combat/
│   ├── combat.ts
│   └── combat.test.ts
```

**Naming**: Always use `<filename>.test.ts` pattern.

## NPM Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `test` | `npm run typecheck && npm run validate && jest` | Full test suite with checks |
| `test:unit` | `jest` | Run Jest unit tests only |
| `test:e2e` | `jest --config jest.e2e.config.js` | Run E2E tests with TesterAgent |
| `test:watch` | `jest --watch` | Watch mode for development |
| `test:coverage` | `jest --coverage` | Generate coverage report |

## Writing Unit Tests

### Basic Test Structure

```typescript
import { functionToTest } from './module';

describe('ModuleName', () => {
  describe('functionToTest', () => {
    it('should handle normal case', () => {
      expect(functionToTest('input')).toBe('expected');
    });

    it('should handle edge case', () => {
      expect(functionToTest('')).toBe('');
    });
  });
});
```

### Real Example: Testing Utility Functions

```typescript
// src/utils/colors.test.ts
import { colors, colorize, stripColorCodes } from './colors';

describe('colors', () => {
  it('should have color codes', () => {
    expect(colors.red).toBe('\x1b[31m');
    expect(colors.reset).toBe('\x1b[0m');
  });

  it('should colorize text', () => {
    expect(colorize('test', 'red')).toBe('\x1b[31mtest\x1b[0m');
  });

  it('should strip color codes', () => {
    const colored = '\x1b[31mtest\x1b[0m';
    expect(stripColorCodes(colored)).toBe('test');
  });
});
```

---

## E2E Test Setup File

The E2E setup file (`test/e2e/setup.ts`) runs before any tests import modules:

```typescript
import { applyTestModeOverrides } from '../../src/config';
import { enableSilentMode } from '../../src/utils/logger';

// Apply test mode overrides immediately
applyTestModeOverrides({
  silent: true,
  noColor: true,
  noConsole: true,
  disableRemoteAdmin: true,
});

// Remove console transports from logger
enableSilentMode();
```

This ensures no console output appears during test runs.

---

## Coverage

Coverage reports are generated in `coverage/`:
- `coverage/lcov-report/index.html` - HTML report
- `coverage/lcov.info` - LCOV format for CI tools

## Gotchas & Warnings

- ⚠️ **Unit test location**: Tests go in `src/`, not `test/`
- ⚠️ **E2E test location**: E2E tests go in `test/e2e/`
- ⚠️ **File pattern**: Use `.test.ts` for unit, `.e2e.test.ts` for E2E
- ⚠️ **Full test script**: `npm test` runs typecheck and validation first
- ⚠️ **Coverage exclusions**: `index.ts` files are excluded from coverage
- ⚠️ **E2E cleanup**: Always call `agent.shutdown()` in `afterAll`

## Useful Commands

```bash
# Run E2E tests only
npm run test:e2e

# Run unit tests in watch mode
npm run test:watch

# Run a specific test file
npm run test:unit -- src/utils/colors.test.ts

# Run tests matching a pattern
npm run test:unit -- --testNamePattern="colorize"

# View coverage report
open coverage/lcov-report/index.html
```

## Related Context

- [`../jest.config.js`](../jest.config.js) - Jest configuration for unit tests
- [`../jest.e2e.config.js`](../jest.e2e.config.js) - Jest configuration for E2E tests
- [`../src/testing/testerAgent.ts`](../src/testing/testerAgent.ts) - TesterAgent implementation
- [`../src/testing/testMode.ts`](../src/testing/testMode.ts) - Test mode options
- [`../src/testing/stateLoader.ts`](../src/testing/stateLoader.ts) - State snapshot management
- [`./e2e/setup.ts`](./e2e/setup.ts) - E2E test setup (silent mode)
- [`./e2e/features.e2e.test.ts`](./e2e/features.e2e.test.ts) - TesterAgent feature showcase
