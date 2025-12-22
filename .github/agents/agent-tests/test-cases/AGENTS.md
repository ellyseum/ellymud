# Test Cases - LLM Context

## Overview

This directory contains individual test case files for validating agent behavior. Each file targets a specific agent and contains multiple test cases.

## Files

| File | Target Agent | Test Count |
|------|--------------|------------|
| `research-agent-tests.md` | Research Agent | 5 |
| `planning-agent-tests.md` | Planning Agent | 5 |
| `implementation-agent-tests.md` | Implementation Agent | 4 |
| `validation-agent-tests.md` | Validation Agent | 4 |

## Test Case Structure

Each test case follows this format:

```markdown
## Test Case: [TC-XXX] [Name]

**Description**: What this test validates

**Input**:
[Sample user request or context]

**Expected Output Patterns** (MUST include):
- [ ] Pattern that should appear in output
- [ ] Another required pattern

**Anti-Patterns** (MUST NOT include):
- [ ] Pattern that should NOT appear
- [ ] Another forbidden pattern

**Pass Criteria**:
- Specific conditions for passing
```

## Test Case IDs

| Prefix | Agent |
|--------|-------|
| TC-R## | Research Agent |
| TC-P## | Planning Agent |
| TC-I## | Implementation Agent |
| TC-V## | Validation Agent |

## Running Tests

Tests are manual:
1. Copy the **Input** section
2. Provide it to the target agent
3. Check output against **Expected Output Patterns**
4. Verify no **Anti-Patterns** appear
5. Evaluate against **Pass Criteria**

## When to Run Tests

- After modifying any `*.agent.md` file
- Before committing agent changes
- During post-mortem analysis of agent failures

## Adding New Tests

When adding a test case:
1. Use the next available ID (e.g., TC-R06)
2. Follow the standard structure
3. Include both expected patterns AND anti-patterns
4. Define clear, measurable pass criteria

## Related

- Parent directory: `../AGENTS.md`
- Agent definitions: `../../*.agent.md`
