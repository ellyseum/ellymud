# Test Cases

Individual test case files for validating agent behavior.

## Naming Convention

**Pattern**: `<agent-name>.agent-tests.md`

| ✅ Valid                    | ❌ Invalid                |
| --------------------------- | ------------------------- |
| `research.agent-tests.md`   | `research-agent-tests.md` |
| `validation.agent-tests.md` | `validation_tests.md`     |

This convention is **enforced** by `run-tests.sh --validate`.

## Contents

| File                            | Agent                | Test IDs       |
| ------------------------------- | -------------------- | -------------- |
| `research.agent-tests.md`       | Research Agent       | TC-R01, TC-R02 |
| `planning.agent-tests.md`       | Planning Agent       | TC-P01, TC-P02 |
| `implementation.agent-tests.md` | Implementation Agent | TC-I01, TC-I02 |
| `validation.agent-tests.md`     | Validation Agent     | TC-V01, TC-V02 |

## Running Tests

```bash
# From the agent-tests/ directory (parent of test-cases/):
cd .github/agents/agent-tests

# Run all tests for an agent
./run-tests.sh research

# Run specific test
./run-tests.sh validation TC-V01

# Dry-run (preview without invoking)
./run-tests.sh --dry-run research TC-R01

# Validate an existing output file
./run-tests.sh --check-output results/output.md TC-V01

# List all available tests
./run-tests.sh --show-tests
```

## Test Case Format

Each `.agent-tests.md` file contains test cases with:

- **Prompt**: Input to send to the agent
- **Expected patterns**: Must appear in output
- **Anti-patterns**: Must NOT appear in output

JSON definitions in `../test-definitions.json` mirror this structure for automation.

## Related

- Test runner: [`../run-tests.sh`](../run-tests.sh)
- JSON definitions: [`../test-definitions.json`](../test-definitions.json)
- Results: [`../results/`](../results/)
- Full docs: [`../AGENTS.md`](../AGENTS.md)
