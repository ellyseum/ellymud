# Tests

Test files for EllyMUD including unit tests, E2E tests, and test utilities.

## Test Framework

The project uses **Jest** with **ts-jest** for TypeScript testing:

- **Framework**: Jest + ts-jest
- **Configuration**: `jest.config.js` (unit), `jest.e2e.config.js` (E2E)
- **Unit Tests**: `*.test.ts` files alongside source in `src/`
- **E2E Tests**: `test/e2e/*.e2e.test.ts` using TesterAgent

## Running Tests

> ⚠️ **Note**: `--testPathPattern` is deprecated. Use `--testPathPatterns` (plural) or pass the filename directly.

| Command | Description |
|---------|-------------|
| `npm test` | Run typecheck, validation, and all unit tests |
| `npm run test:unit` | Run Jest unit tests only |
| `npm run test:e2e` | Run E2E tests with TesterAgent |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |
| `make test` | Alias for npm test |

## Test File Convention

Unit tests are colocated with source files in `src/`:

```
src/
├── utils/
│   ├── colors.ts
│   ├── colors.test.ts      ← Test file next to source
│   ├── formatters.ts
│   └── formatters.test.ts  ← Test file next to source
```

E2E tests are in `test/e2e/`:

```
test/
└── e2e/
    ├── setup.ts              ← Silent mode setup
    ├── features.e2e.test.ts  ← TesterAgent showcase
    ├── regeneration.e2e.test.ts
    └── combat.e2e.test.ts
```

## E2E Testing with TesterAgent

The `TesterAgent` provides a programmatic interface for E2E testing:

- **Time Control**: Pause and advance game ticks deterministically
- **Session Control**: Create virtual sessions and execute commands
- **State Control**: Load/save snapshots for test isolation
- **Silent Mode**: No console output during test runs

Basic usage:

```typescript
const agent = await TesterAgent.create();
const sessionId = await agent.directLogin('testuser');
const output = agent.sendCommand(sessionId, 'look');
agent.advanceTicks(12);
await agent.shutdown();
```

## Test Categories

### Unit Tests

Test individual functions and classes in isolation:

- Utility functions (colors, formatters)
- Command parsing
- Data validation

### E2E Tests

Full game flow testing using the `TesterAgent` API:

- Regeneration mechanics
- Combat system
- Command execution

Uses programmatic time control and state snapshots for deterministic testing.

### Agent Tests

Specialized tests for the AI agent ecosystem:

- Located in `.github/agents/agent-tests/`
- Run with `npm run test-agents` or `make agent-test`

## Related

- [src/](../src/) - Source code with colocated unit tests
- [src/testing/](../src/testing/) - TesterAgent and test infrastructure
- [jest.config.js](../jest.config.js) - Jest configuration for unit tests
- [jest.e2e.config.js](../jest.e2e.config.js) - Jest configuration for E2E tests
- [.github/agents/agent-tests/](../.github/agents/agent-tests/) - Agent ecosystem tests
