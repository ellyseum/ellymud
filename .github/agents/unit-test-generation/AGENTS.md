# Unit Test Generation - LLM Context

> **For LLMs**: This file provides comprehensive context for the unit test generation agents.
> **For humans**: See [README.md](README.md) for a brief overview.

## Architecture Overview

The unit test generation system uses a two-agent architecture optimized for token efficiency and test quality:

```
┌─────────────────────────────────────────────────────────────────┐
│                    Unit Test Orchestrator                        │
│  (unit-test-orchestrator.agent.md)                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Phase 0: Coverage Analysis                                      │
│    └── npm run test:unit → parse coverage table                 │
│                                                                  │
│  Phase 0.5: File Filtering                                      │
│    └── Exclude types, configs, entry points                     │
│                                                                  │
│  Phase 1: Matrix Creation                                        │
│    └── coverage-matrix-YYYY-MM-DD.md                            │
│                                                                  │
│  Phase 2-3: Delegation Loop                                      │
│    └── For each file:                                           │
│        ├── Invoke Unit Test Creator (subagent)                  │
│        ├── Verify tests pass                                    │
│        └── Update matrix with results                           │
│                                                                  │
│  Phase 4: Final Report                                          │
│    └── report-YYYY-MM-DD-HHmmss.md                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ (per file)
┌─────────────────────────────────────────────────────────────────┐
│                    Unit Test Creator                             │
│  (unit-test-creator.agent.md)                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Read & analyze source file                                   │
│  2. Identify testable exports                                    │
│  3. Plan mocking strategy                                        │
│  4. Create test file with:                                       │
│     ├── Happy path tests                                        │
│     ├── Edge case tests                                         │
│     └── Error scenario tests                                    │
│  5. Verify compilation & test pass                               │
│  6. Report coverage achieved                                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Agent Reference

### Unit Test Orchestrator

**File**: `unit-test-orchestrator.agent.md`
**Role**: Pipeline coordinator
**Model**: claude-4.5-opus
**Responsibilities**:

- Run coverage analysis
- Filter appropriate files
- Create tracking matrix
- Delegate to Unit Test Creator
- Track progress and metrics
- Generate final report

**Key Tools**:
- `run_in_terminal` - Execute npm commands
- `runSubagent` - Delegate to Unit Test Creator
- `manage_todo_list` - Track progress
- `create_file` / `replace_string_in_file` - Create matrix/report

### Unit Test Creator

**File**: `unit-test-creator.agent.md`
**Role**: Test file creator
**Model**: claude-4.5-opus
**Responsibilities**:

- Analyze single source file
- Create comprehensive test suite
- Mock dependencies appropriately
- Verify tests compile and pass
- Report coverage metrics

**Key Tools**:
- `read_file` - Analyze source code
- `semantic_search` - Find related code
- `create_file` - Create test file
- `run_in_terminal` - Verify tests

## File Structure

```
.github/agents/unit-test-generation/
├── README.md                           # Human overview
├── AGENTS.md                           # This file (LLM context)
├── unit-test-orchestrator.agent.md     # Orchestrator agent definition
├── unit-test-creator.agent.md          # Creator agent definition
├── coverage-matrix-YYYY-MM-DD.md       # Generated: task tracking
└── report-YYYY-MM-DD-HHmmss.md         # Generated: session reports
```

## Testing Conventions

### Jest Configuration

```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  collectCoverage: true,
};
```

### Test File Location

Tests are **co-located** with source:
```
src/utils/colors.ts       → src/utils/colors.test.ts
src/user/userManager.ts   → src/user/userManager.test.ts
```

### Test Structure Pattern

```typescript
import { functionToTest } from './sourceFile';

jest.mock('../dependency'); // Mock external deps

describe('sourceFile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('functionToTest', () => {
    it('should handle normal input', () => {
      expect(functionToTest('input')).toBe('expected');
    });

    it('should handle edge case', () => {
      expect(functionToTest('')).toBe('');
    });
  });
});
```

## Coverage Targets

| Metric | Minimum | Target |
|--------|---------|--------|
| Statements | 80% | 90% |
| Branches | 70% | 80% |
| Functions | 80% | 100% |
| Lines | 80% | 90% |

## File Exclusions

Files that should NOT have unit tests generated:

| Pattern | Reason |
|---------|--------|
| `*.d.ts` | Type definitions only |
| `types.ts`, `types/*.ts` | No runtime behavior |
| `index.ts` | Re-exports only |
| `server.ts`, `app.ts` | Entry points (integration testing) |
| `config.ts` | Static configuration |
| `schemas/*.ts` | JSON schemas |

## Mocking Reference

### Singleton Managers

```typescript
jest.mock('../user/userManager', () => ({
  UserManager: {
    getInstance: jest.fn().mockReturnValue({
      getUser: jest.fn(),
      saveUsers: jest.fn(),
    }),
  },
}));
```

### File System

```typescript
jest.mock('fs', () => ({
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  existsSync: jest.fn(),
}));
```

### Logger

```typescript
jest.mock('../utils/logger', () => ({
  systemLogger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));
```

## Output Artifacts

### Coverage Matrix Format

```markdown
# Unit Test Generation Matrix

**Started**: 2025-12-26T10:00:00Z
**Baseline Coverage**: 0.15%

| ID | File | Priority | Status | Duration | Coverage |
|----|------|----------|--------|----------|----------|
| 1 | formatters.ts | high | COMPLETE | 45s | 95% |
| 2 | colors.ts | high | IN_PROGRESS | - | - |
```

### Final Report Format

```markdown
# Unit Test Generation Report

## Executive Summary
- Files Processed: 25
- Tests Created: 312
- Coverage: 0.15% → 45.2% (+45.05%)

## Results by File
[Detailed per-file breakdown]
```

## Quality Gates

Before a test file is marked complete:

1. **Compilation**: `npx tsc --noEmit {testFile}` passes
2. **Tests Pass**: `npm run test:unit -- --testPathPattern="{file}"` passes
3. **Coverage**: Meets minimum thresholds
4. **No Lint Errors**: ESLint passes

## Integration Points

### With Project Testing

Generated tests use existing:
- Jest configuration (`jest.config.js`)
- TypeScript configuration (`tsconfig.json`)
- ESLint rules (`.eslintrc`)

### With CI/CD

Generated tests run in:
- `npm run test` (full test suite)
- `npm run test:unit` (unit tests only)
- CI pipeline (if configured)

## Common Issues & Solutions

### Issue: Mock not working

**Symptom**: Real dependency called instead of mock
**Solution**: Ensure mock is at top of file, before imports

### Issue: Coverage not improving

**Symptom**: Tests pass but coverage unchanged
**Solution**: Check `collectCoverageFrom` in jest config

### Issue: Async test timeout

**Symptom**: Test times out
**Solution**: Use `jest.useFakeTimers()` or increase timeout

## Metrics Tracked

### Per-Task
- Start/end timestamps
- Duration in milliseconds
- Tests generated count
- Coverage percentages (before/after)
- Success/failure status

### Per-Session
- Total files processed
- Success/failure counts
- Aggregate coverage change
- Total execution time
