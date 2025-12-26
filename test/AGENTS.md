# Tests - LLM Context

## Overview

EllyMUD uses Jest with ts-jest for TypeScript testing. Tests are **colocated** with source files in `src/` rather than in a separate test directory. This directory exists for test utilities, fixtures, and documentation.

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

Key settings:
- **roots**: Tests run from `src/` directory only
- **testMatch**: Only `*.test.ts` files (not `*.spec.ts`)
- **coverage**: Automatically collected, excludes `.d.ts` and `index.ts`

## Test File Convention

Tests are colocated alongside source files:

```
src/
├── utils/
│   ├── colors.ts           # Source file
│   ├── colors.test.ts      # Test file
│   ├── formatters.ts       # Source file
│   └── formatters.test.ts  # Test file
├── combat/
│   ├── combat.ts
│   └── combat.test.ts      # Future: test next to source
```

**Naming**: Always use `<filename>.test.ts` pattern.

## NPM Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `test` | `npm run typecheck && npm run validate && jest` | Full test suite with checks |
| `test:unit` | `jest` | Run Jest tests only |
| `test:watch` | `jest --watch` | Watch mode for development |
| `test:coverage` | `jest --coverage` | Generate coverage report |

## Writing Tests

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

### Testing with Validation

```typescript
// src/utils/formatters.test.ts
import { formatUsername, validateUsername } from './formatters';

describe('formatters', () => {
  describe('validateUsername', () => {
    it('should validate correct username', () => {
      expect(validateUsername('Bob').isValid).toBe(true);
    });

    it('should reject empty username', () => {
      expect(validateUsername('').isValid).toBe(false);
    });

    it('should reject special characters', () => {
      expect(validateUsername('bob123').isValid).toBe(false);
    });
  });
});
```

## Adding Tests to a Module

When adding tests to a new module:

1. Create `<module>.test.ts` next to `<module>.ts`
2. Import the functions/classes to test
3. Use `describe` blocks to group related tests
4. Use `it` blocks for individual test cases
5. Run `npm run test:watch` during development

## Testing with VirtualConnection

For integration tests requiring socket simulation:

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

## Coverage

Coverage reports are generated in `coverage/`:
- `coverage/lcov-report/index.html` - HTML report
- `coverage/lcov.info` - LCOV format for CI tools

## Gotchas & Warnings

- ⚠️ **Test location**: Tests go in `src/`, not `test/`
- ⚠️ **File pattern**: Use `.test.ts`, not `.spec.ts`
- ⚠️ **Full test script**: `npm test` runs typecheck and validation first
- ⚠️ **Coverage exclusions**: `index.ts` files are excluded from coverage

## Useful Commands

```bash
# Run tests in watch mode during development
npm run test:watch

# Run a specific test file
npm run test:unit -- src/utils/colors.test.ts

# Run tests matching a pattern
npm run test:unit -- --testNamePattern="colorize"

# View coverage report
open coverage/lcov-report/index.html
```

## Related Context

- [`../jest.config.js`](../jest.config.js) - Jest configuration
- [`../package.json`](../package.json) - Test scripts
- [`../src/utils/colors.test.ts`](../src/utils/colors.test.ts) - Example unit test
- [`../src/utils/formatters.test.ts`](../src/utils/formatters.test.ts) - Example unit test
- [`../src/connection/virtual.connection.ts`](../src/connection/virtual.connection.ts) - For integration testing
