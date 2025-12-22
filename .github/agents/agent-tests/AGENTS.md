# Agent Tests - LLM Context

## Overview

This directory contains the agent test harness for validating agent behavior after modifications. Tests ensure agents produce expected outputs and avoid anti-patterns.

## Directory Structure

```
agent-tests/
├── README.md                              # Human documentation
├── AGENTS.md                              # This file (LLM context)
└── test-cases/                            # Test case files
    ├── research-agent-tests.md            # Research Agent test cases
    ├── planning-agent-tests.md            # Planning Agent test cases
    ├── implementation-agent-tests.md      # Implementation Agent test cases
    └── validation-agent-tests.md          # Validation Agent test cases
```

## Test Case Format

Each test case follows this structure:

```markdown
## Test Case: [TC-XXX] [Name]

**Description**: What this test validates

**Input**:
[Sample user request or context]

**Expected Output Patterns** (MUST include):
- Pattern 1 that should appear
- Pattern 2 that should appear

**Anti-Patterns** (MUST NOT include):
- Pattern that should NOT appear

**Pass Criteria**:
- All expected patterns present
- No anti-patterns present
```

## When to Use This Directory

- **After modifying agent definitions**: Run relevant tests to ensure no regressions
- **When adding new agent capabilities**: Create new test cases for validation
- **During post-mortem analysis**: Reference test coverage when analyzing failures

## Test Coverage

| Agent | Test File | Test Count |
|-------|-----------|------------|
| Research Agent | `test-cases/research-agent-tests.md` | 5 |
| Planning Agent | `test-cases/planning-agent-tests.md` | 5 |
| Implementation Agent | `test-cases/implementation-agent-tests.md` | 4 |
| Validation Agent | `test-cases/validation-agent-tests.md` | 4 |

## Running Tests

Tests are manual. The process is:
1. Select the test case for the agent you modified
2. Provide the test input to the agent
3. Compare output against expected patterns
4. Verify no anti-patterns appear
5. Record pass/fail result

## Related

- Agent definitions: `.github/agents/*.agent.md`
- Post-Mortem Agent: `.github/agents/agent-post-mortem.agent.md`
