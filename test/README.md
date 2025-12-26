# Tests

Test files for EllyMUD including unit tests, integration tests, and test utilities.

## Test Framework

The project uses **Jest** with **ts-jest** for TypeScript testing:

- **Framework**: Jest + ts-jest
- **Configuration**: `jest.config.js` in project root
- **Test Location**: `*.test.ts` files alongside source in `src/`

## Running Tests

| Command | Description |
|---------|-------------|
| `npm test` | Run typecheck, validation, and all tests |
| `npm run test:unit` | Run Jest tests only |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |
| `make test` | Alias for npm test |

## Test File Convention

Tests are colocated with source files in `src/`:

```
src/
├── utils/
│   ├── colors.ts
│   ├── colors.test.ts      ← Test file next to source
│   ├── formatters.ts
│   └── formatters.test.ts  ← Test file next to source
```

This convention:
- Keeps tests close to the code they test
- Makes it easy to find tests for any module
- Allows Jest to discover all `*.test.ts` files automatically

## Test Categories

### Unit Tests

Test individual functions and classes in isolation:

- Utility functions (colors, formatters)
- Command parsing
- Data validation

### Integration Tests

Test component interactions:

- State machine transitions
- Command execution flow
- Combat system

### Agent Tests

Specialized tests for the AI agent ecosystem:

- Located in `.github/agents/agent-tests/`
- Run with `npm run test-agents` or `make agent-test`

## Current Test Coverage

Tests exist for:

| Module | File | Coverage |
|--------|------|----------|
| Utils | `src/utils/colors.test.ts` | Color codes, colorize, strip codes |
| Utils | `src/utils/formatters.test.ts` | Username formatting and validation |

## Related

- [src/](../src/) - Source code with colocated tests
- [jest.config.js](../jest.config.js) - Jest configuration
- [package.json](../package.json) - Test scripts
- [.github/agents/agent-tests/](../.github/agents/agent-tests/) - Agent ecosystem tests
