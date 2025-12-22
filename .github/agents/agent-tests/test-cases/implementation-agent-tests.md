# Implementation Agent Test Cases

Tests for validating the Implementation Agent behavior.

---

## Test Case: [TC-I01] Standard Feature Implementation

**Description**: Verify agent implements features according to plan.

**Input**:
```
Implement the "emote" command based on this plan:

Task 1: Create data/emotes.json with emote definitions
Task 2: Create src/command/commands/emoteCommand.ts
Task 3: Register in CommandRegistry
Task 4: Add help text

Acceptance Criteria:
- Players can use /emote <action>
- Emotes display to room: "PlayerName <action>"
```

**Expected Output Patterns** (MUST include):
- [ ] Complete, working code for each file
- [ ] Follows existing code patterns (CommandRegistry usage)
- [ ] Proper TypeScript types
- [ ] Error handling for invalid emotes
- [ ] Code comments explaining non-obvious logic
- [ ] All acceptance criteria addressed

**Anti-Patterns** (MUST NOT include):
- [ ] Placeholder code ("TODO: implement")
- [ ] Missing error handling
- [ ] Inconsistent code style with codebase
- [ ] Skipped tasks from plan
- [ ] New dependencies not in plan

**Pass Criteria**:
- All planned tasks completed
- Code follows EllyMUD conventions
- Would pass code review

---

## Test Case: [TC-I02] Bug Fix Implementation

**Description**: Verify agent implements minimal, targeted bug fixes.

**Input**:
```
Fix the negative damage bug:

Task: Add minimum damage check in src/combat/combat.ts calculateDamage()

Current code returns: attackValue - defenseValue
Should return: Math.max(1, attackValue - defenseValue)
```

**Expected Output Patterns** (MUST include):
- [ ] Exact file modification shown
- [ ] Minimal change (just the fix)
- [ ] Before/after comparison
- [ ] Explanation of why fix works

**Anti-Patterns** (MUST NOT include):
- [ ] Refactoring unrelated code
- [ ] Adding features beyond the fix
- [ ] Changing function signatures unnecessarily
- [ ] Fixing other bugs not in scope

**Pass Criteria**:
- Fix is minimal and targeted
- Original functionality preserved
- Clear diff of changes

---

## Test Case: [TC-I03] Code Style Compliance

**Description**: Verify agent follows EllyMUD coding conventions.

**Input**:
```
Implement a new utility function in src/utils/formatting.ts:

Task: Create formatGold(amount: number): string
- Should format "1000" as "1,000 gold"
- Should handle singular "1 gold"
```

**Expected Output Patterns** (MUST include):
- [ ] TypeScript with proper types
- [ ] JSDoc comment on function
- [ ] Follows existing utility function patterns
- [ ] Export statement matches file conventions
- [ ] Uses existing color utilities if applicable

**Anti-Patterns** (MUST NOT include):
- [ ] JavaScript instead of TypeScript
- [ ] Missing type annotations
- [ ] Inconsistent naming (camelCase required)
- [ ] Missing export

**Pass Criteria**:
- Code indistinguishable from existing codebase style
- Proper TypeScript usage
- Would pass ESLint

---

## Test Case: [TC-I04] Scope Boundary Test

**Description**: Verify agent doesn't validate or test (that's Validation Agent's job).

**Input**:
```
Implement and test the whisper command.

Plan:
Task 1: Create whisperCommand.ts
Task 2: Register command
```

**Expected Output Patterns** (MUST include):
- [ ] Complete implementation code
- [ ] Statement that testing is next phase
- [ ] Handoff notes for Validation Agent

**Anti-Patterns** (MUST NOT include):
- [ ] Test files (*.test.ts)
- [ ] Running the code to verify
- [ ] "I tested this and it works" claims
- [ ] Manual testing results

**Pass Criteria**:
- Implementation only
- Explicit handoff to Validation
- No testing claims
