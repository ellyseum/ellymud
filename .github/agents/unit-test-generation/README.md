# Unit Test Generation Agents

Specialized agents for systematic unit test generation across the EllyMUD codebase.

## Overview

This directory contains two coordinating agents that work together to improve test coverage:

| Agent | Role | Output |
|-------|------|--------|
| **Unit Test Orchestrator** | Analyzes coverage, coordinates test creation | Matrix files, final reports |
| **Unit Test Creator** | Creates individual test files | `*.test.ts` files |

## Quick Start

Invoke the orchestrator to run a full test generation session:

```
Using the Unit Test Orchestrator agent, generate unit tests for all uncovered files
```

Or target specific areas:

```
Using the Unit Test Orchestrator, generate unit tests for src/utils/
```

## Workflow

```
┌─────────────────────┐
│  Unit Test          │
│  Orchestrator       │
├─────────────────────┤
│ 1. Analyze coverage │
│ 2. Create matrix    │
│ 3. Delegate tasks   │──────┐
│ 4. Track progress   │      │
│ 5. Generate report  │      ▼
└─────────────────────┘  ┌─────────────────────┐
         ▲               │  Unit Test          │
         │               │  Creator            │
         │               ├─────────────────────┤
         └───────────────│ Create test file    │
           (per file)    │ for single source   │
                         └─────────────────────┘
```

## Output Files

After a session, you'll find:

- `coverage-matrix-YYYY-MM-DD.md` - Task tracking matrix
- `report-YYYY-MM-DD-HHmmss.md` - Final session report
- `src/**/*.test.ts` - Generated test files (in source tree)

## Configuration

Tests use the project's existing Jest configuration:

- **Framework**: Jest with ts-jest
- **Location**: Co-located with source files
- **Coverage**: Istanbul via Jest
- **Test Command**: `npx jest --no-coverage "{file}"` for individual test validation

See `jest.config.js` for full configuration.
