# Validation Agent Test Cases

Tests for validating the Validation Agent behavior.

---

## Test Case: [TC-V01] Standard Feature Validation

**Description**: Verify agent properly validates implemented features.

**Input**:
```
Validate the emote command implementation:

Files created:
- data/emotes.json
- src/command/commands/emoteCommand.ts

Acceptance Criteria:
- Players can use /emote <action>
- Emotes display to room: "PlayerName <action>"
- Invalid emotes show error message
```

**Expected Output Patterns** (MUST include):
- [ ] Checklist of acceptance criteria with pass/fail
- [ ] Test cases executed (manual or conceptual)
- [ ] Edge cases tested (empty input, invalid emote)
- [ ] Code review findings
- [ ] Integration verification with existing systems
- [ ] Overall PASS/FAIL verdict
- [ ] Issues found (if any) with severity

**Anti-Patterns** (MUST NOT include):
- [ ] Skipping acceptance criteria checks
- [ ] "Looks good" without specific verification
- [ ] Modifying implementation code
- [ ] Ignoring edge cases

**Pass Criteria**:
- All acceptance criteria verified
- Edge cases considered
- Clear verdict provided

---

## Test Case: [TC-V02] Bug Fix Validation

**Description**: Verify agent validates bug fixes thoroughly.

**Input**:
```
Validate the negative damage fix:

Change made: Math.max(1, attackValue - defenseValue)

Original bug: Damage could be negative when armor > attack
```

**Expected Output Patterns** (MUST include):
- [ ] Verification that original bug is fixed
- [ ] Test with armor > attack scenario
- [ ] Test with normal scenarios (no regression)
- [ ] Test edge cases (armor = attack, armor = 0)
- [ ] Confirmation minimum damage is 1, not 0

**Anti-Patterns** (MUST NOT include):
- [ ] Only testing the happy path
- [ ] Missing regression testing
- [ ] Approving without edge case verification

**Pass Criteria**:
- Original bug verified fixed
- No regression introduced
- Edge cases covered

---

## Test Case: [TC-V03] Validation with Issues Found

**Description**: Verify agent properly reports issues and blocks approval.

**Input**:
```
Validate the guild command implementation:

Acceptance Criteria:
- /guild create <name> creates a guild
- /guild invite <player> sends invitation
- /guild leave removes player from guild

Note: The invite command was not implemented.
```

**Expected Output Patterns** (MUST include):
- [ ] Clear FAIL verdict
- [ ] Specific missing functionality identified
- [ ] Severity assessment (blocking vs minor)
- [ ] Recommendation (send back to Implementation)
- [ ] What needs to be fixed before re-validation

**Anti-Patterns** (MUST NOT include):
- [ ] Approving despite missing functionality
- [ ] Vague "needs work" without specifics
- [ ] Implementing the missing feature itself

**Pass Criteria**:
- Issues clearly documented
- Blocking issues prevent approval
- Actionable feedback for Implementation Agent

---

## Test Case: [TC-V04] Scope Boundary Test

**Description**: Verify agent validates but doesn't fix issues.

**Input**:
```
Validate and fix any issues in the whisper command.

Implementation has a bug: doesn't check if target player exists.
```

**Expected Output Patterns** (MUST include):
- [ ] Bug identified and documented
- [ ] FAIL verdict with explanation
- [ ] Recommendation to return to Implementation phase
- [ ] Clear description of what fix is needed

**Anti-Patterns** (MUST NOT include):
- [ ] Fixing the code directly
- [ ] Code snippets for the fix
- [ ] "I fixed it" statements

**Pass Criteria**:
- Validates only, doesn't implement
- Clear handoff back to Implementation
- Bug well-documented for fix
