# Agent Tests - LLM Context

## Overview

This directory contains the agent test harness for validating agent behavior after modifications. Tests ensure agents produce expected outputs and avoid anti-patterns.

## Directory Structure

```
agent-tests/
├── README.md                              # Human documentation
├── AGENTS.md                              # This file (LLM context)
├── run-tests.sh                           # Automated test runner
├── test-definitions.json                  # JSON test definitions
├── results/                               # Test output files
└── test-cases/                            # Test case files
    ├── research.agent-tests.md            # Research Agent test cases
    ├── planning.agent-tests.md            # Planning Agent test cases
    ├── implementation.agent-tests.md      # Implementation Agent test cases
    └── validation.agent-tests.md          # Validation Agent test cases
```

**Naming Convention**: `<agent-name>.agent-tests.md` (enforced by run-tests.sh)

## Prerequisites

The test runner requires:

1. **Node.js/npm** - For npx to run Copilot CLI
2. **jq** - For JSON parsing (`sudo apt install jq`)
3. **GitHub Copilot CLI** - Auto-downloaded via npx, or install globally:
   ```bash
   npm install -g @githubnext/github-copilot-cli
   ```

> **Note**: The old `gh copilot` extension is deprecated and will hang if invoked.
> The test runner explicitly avoids it and uses `npx` instead.

## Test Runner Commands

```bash
# Run all tests
./run-tests.sh

# Run tests for specific agent
./run-tests.sh research
./run-tests.sh validation

# Run specific test
./run-tests.sh research TC-R01

# Preview without running (dry-run)
./run-tests.sh --dry-run validation TC-V01

# List test files
./run-tests.sh --list

# List all test IDs
./run-tests.sh --show-tests

# Validate an existing output file
./run-tests.sh --check-output results/output.md TC-V01

# Validate naming convention only
./run-tests.sh --validate
```

## Test Results

- **Passed**: All expected patterns found, no anti-patterns
- **Failed**: Missing patterns or anti-patterns detected
- **Skipped**: Dry-run mode (no actual invocation)

Results are saved to `results/` directory with timestamps.

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

## JSON Test Definitions

`test-definitions.json` contains structured test cases:

```json
{
  "id": "TC-V01",
  "agent": "validation",
  "name": "Build Verification",
  "prompt": "Validate the wave command implementation...",
  "expected": ["PASS", "FAIL", "verdict", "npm run build"],
  "antiPatterns": ["implementing", "I'll create", "let me fix"]
}
```

## When to Use

- **After modifying agent definitions**: Run relevant tests to ensure no regressions
- **When adding new agent capabilities**: Create new test cases for validation
- **During post-mortem analysis**: Reference test coverage when analyzing failures

## Test Coverage

| Agent          | Test File                       | Test IDs       |
| -------------- | ------------------------------- | -------------- |
| Research       | `research.agent-tests.md`       | TC-R01, TC-R02 |
| Planning       | `planning.agent-tests.md`       | TC-P01, TC-P02 |
| Implementation | `implementation.agent-tests.md` | TC-I01, TC-I02 |
| Validation     | `validation.agent-tests.md`     | TC-V01, TC-V02 |

## Troubleshooting

### Script hangs at CLI check

The old `copilot` wrapper from `gh-copilot` prompts interactively. The test runner
avoids this, but if you have issues:

```bash
# Remove old extension
gh extension remove gh-copilot
```

### "jq not found"

```bash
sudo apt install jq
```

### No npx available

Install Node.js from https://nodejs.org/

## Related

- Agent definitions: `.github/agents/*.agent.md`
- Orchestrator: `.github/agents/agent-orchestrator.agent.md`
