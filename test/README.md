# Tests

Test files for EllyMUD including unit tests, integration tests, and test utilities.

## Current Status

Test infrastructure is set up but test coverage is still being developed. The project uses:

- **Test Framework**: Jest (configured in package.json)
- **Test Command**: `npm test` or `make test`

## Test Categories

### Unit Tests
Test individual functions and classes in isolation:
- Utility functions
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
- Run with `make agent-test`

## Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test -- path/to/test.ts

# Run agent tests
make agent-test
```

## Writing Tests

When adding tests:

1. Create test file with `.test.ts` or `.spec.ts` extension
2. Place in this directory or alongside source file
3. Follow Jest conventions for describe/it blocks
4. Mock external dependencies

## Related

- [src/](../src/) - Source code to test
- [package.json](../package.json) - Test scripts and Jest config
- [.github/agents/agent-tests/](.github/agents/agent-tests/) - Agent ecosystem tests
