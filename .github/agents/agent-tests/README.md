# Agent Test Harness

A testing framework for validating agent behavior after modifications.

## Purpose

The Agent Test Harness ensures that changes to agent definitions don't introduce regressions. By running test cases against agents, we can verify they produce expected outputs and avoid anti-patterns.

## Prerequisites (Bootstrap Checklist)

Before running automated tests, ensure the following are installed and configured:

### 1. Node.js / npm

```bash
# Check if installed
node --version
npm --version

# Install from: https://nodejs.org/
```

### 2. GitHub Copilot CLI

```bash
# Option A: Install globally
npm install -g @githubnext/github-copilot-cli

# Option B: Let the test runner use npx (auto-downloads on first run)
# No install needed - just have Node.js/npm installed
```

> **Note**: The old `gh copilot` extension is deprecated. The test runner uses `npx` to auto-download the CLI if not installed globally.

### 3. jq (JSON processor)

```bash
# Check if installed
jq --version

# Install (Ubuntu/Debian)
sudo apt install jq
```

### Quick Bootstrap Verification

```bash
# Run this to check all prerequisites
npm run test:agents:dry
```

## Quick Start

### From Project Root (Recommended)

```bash
# Run all agent tests
npm run test:agents

# Run tests for specific agent
npm run test:agents -- research
npm run test:agents -- validation TC-V01

# Dry-run (preview without invoking)
npm run test:agents:dry
npm run test:agents:dry -- research TC-R01

# List all test IDs
npm run test:agents:list

# Validate naming convention
npm run test:agents:validate
```

### Direct Script Invocation

```bash
# From .github/agents/agent-tests/ directory:
./run-tests.sh research
./run-tests.sh --dry-run validation TC-V01
./run-tests.sh --check-output results/my-output.md TC-V01
```

### Manual Testing

For when CLI automation isn't available:

1. Open test case from `test-cases/`
2. Start chat with target agent
3. Provide test input
4. Save output to `results/` folder
5. Validate: `./run-tests.sh --check-output results/output.md TC-XXX`

## Command Reference

| Command                                          | Description                  |
| ------------------------------------------------ | ---------------------------- |
| `./run-tests.sh`                                 | Run all tests                |
| `./run-tests.sh <agent>`                         | Run tests for specific agent |
| `./run-tests.sh <agent> <test-id>`               | Run specific test            |
| `./run-tests.sh --list`                          | List test files              |
| `./run-tests.sh --show-tests`                    | List all test IDs            |
| `./run-tests.sh --validate`                      | Check naming convention      |
| `./run-tests.sh --dry-run [args]`                | Preview without running      |
| `./run-tests.sh --check-output <file> <test-id>` | Validate existing output     |

## Test Definitions

Tests are defined in two formats:

### JSON Format (for automation)

`test-definitions.json`:

```json
{
  "id": "TC-R01",
  "agent": "research",
  "prompt": "Research how the command system works...",
  "expected": ["commandRegistry", "src/command"],
  "antiPatterns": ["I don't know"]
}
```

### Markdown Format (for documentation)

Detailed test cases in `test-cases/*.md` with full context.

## Test Case Files

| File                                       | Agent Tested         | Test Count |
| ------------------------------------------ | -------------------- | ---------- |
| `test-cases/research.agent-tests.md`       | Research Agent       | 5          |
| `test-cases/planning.agent-tests.md`       | Planning Agent       | 5          |
| `test-cases/implementation.agent-tests.md` | Implementation Agent | 4          |
| `test-cases/validation.agent-tests.md`     | Validation Agent     | 4          |

**Naming Convention**: `<agent-name>.agent-tests.md`

## How to Run Tests

### Manual Testing Process

1. **Select Test Case**: Open the relevant test file for the agent you modified
2. **Set Up Context**: Start a new chat with the agent loaded
3. **Provide Input**: Copy the test case input into the chat
4. **Evaluate Output**: Check against expected patterns and anti-patterns
5. **Record Result**: Mark pass/fail with notes

### Test Execution Template

```markdown
## Test Run: [Date]

**Agent**: [Agent name]
**Version**: [Version being tested]
**Tester**: [Your name or "automated"]

| Test ID | Result  | Notes                         |
| ------- | ------- | ----------------------------- |
| TC-R01  | ✅ PASS |                               |
| TC-R02  | ❌ FAIL | Missing risk analysis section |
```

## When to Run Tests

- **Before PR**: Run all tests for modified agent
- **After Major Changes**: Run full test suite
- **Regression Check**: Run specific test if behavior seems wrong

## Adding New Tests

1. Identify a behavior that should be validated
2. Create test case following the format above
3. Include both positive (expected) and negative (anti-pattern) checks
4. Add to appropriate test file

## Integration with Pipeline

The Post-Mortem Agent should reference test results when analyzing pipeline failures. If an agent produced unexpected output, check if it passes its test cases.

## Pass/Fail Criteria

### PASS

- All expected output patterns present
- No anti-patterns detected
- Output follows agent's defined structure
- Output is actionable and complete

### FAIL

- Missing expected patterns
- Anti-patterns detected
- Structural violations
- Incomplete or unusable output
