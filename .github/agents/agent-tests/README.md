# Agent Test Harness

A testing framework for validating agent behavior after modifications.

## Purpose

The Agent Test Harness ensures that changes to agent definitions don't introduce regressions. By running test cases against agents, we can verify they produce expected outputs and avoid anti-patterns.

## Test Case Format

Each test case file follows this structure:

```markdown
## Test Case: [TC-XXX] [Name]

**Description**: What this test validates

**Input**:
```
[Sample user request or context provided to agent]
```

**Expected Output Patterns** (MUST include):
- [ ] Pattern 1 that should appear
- [ ] Pattern 2 that should appear

**Anti-Patterns** (MUST NOT include):
- [ ] Pattern that should NOT appear
- [ ] Another forbidden pattern

**Pass Criteria**:
- All expected patterns present
- No anti-patterns present
- Output follows agent's defined structure
```

## Test Case Files

| File | Agent Tested | Test Count |
|------|--------------|------------|
| `test-cases/research-agent-tests.md` | Research Agent | 5 |
| `test-cases/planning-agent-tests.md` | Planning Agent | 5 |
| `test-cases/implementation-agent-tests.md` | Implementation Agent | 4 |
| `test-cases/validation-agent-tests.md` | Validation Agent | 4 |

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

| Test ID | Result | Notes |
|---------|--------|-------|
| TC-R01 | ✅ PASS | |
| TC-R02 | ❌ FAIL | Missing risk analysis section |
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
