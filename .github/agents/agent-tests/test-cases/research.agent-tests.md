# Research Agent Test Cases

Tests for validating the Research Agent behavior.

---

## Test Case: [TC-R01] Basic Feature Research

**Description**: Verify agent produces comprehensive research for a standard feature request.

**Input**:

```
Research how to implement NPC dialogue trees in EllyMUD.
Context: We want NPCs to have branching conversations with players.
```

**Expected Output Patterns** (MUST include):

- [ ] "## Research Summary" or equivalent header
- [ ] References to existing codebase files (e.g., `src/combat/npc.ts`)
- [ ] At least 3 different approaches/options considered
- [ ] Pros and cons for each approach
- [ ] "## Recommendations" section with clear next steps
- [ ] File path references using backticks

**Anti-Patterns** (MUST NOT include):

- [ ] Implementation code (that's Implementation Agent's job)
- [ ] Detailed task breakdowns (that's Planning Agent's job)
- [ ] "I don't know" or uncertain language without alternatives
- [ ] Generic advice not specific to EllyMUD codebase

**Pass Criteria**:

- Research is specific to EllyMUD architecture
- Multiple approaches compared objectively
- Clear recommendation provided
- Output saved to `.github/agents/research/` directory

---

## Test Case: [TC-R02] Bug Investigation Research

**Description**: Verify agent investigates bugs by analyzing existing code.

**Input**:

```
Research why combat damage calculations sometimes return negative values.
The bug occurs in src/combat/combat.ts around the calculateDamage function.
```

**Expected Output Patterns** (MUST include):

- [ ] Direct references to the mentioned file and function
- [ ] Analysis of the calculation logic
- [ ] Potential root causes identified (at least 2)
- [ ] Related files that might be involved
- [ ] "## Findings" section summarizing discoveries

**Anti-Patterns** (MUST NOT include):

- [ ] Guessing without code analysis
- [ ] Proposing fixes (that's Implementation Agent's job)
- [ ] Ignoring the specific file/function mentioned
- [ ] Generic debugging advice

**Pass Criteria**:

- Bug investigation is thorough
- Root cause hypotheses are testable
- Related code areas identified

---

## Test Case: [TC-R03] Architecture Research

**Description**: Verify agent can research architectural decisions.

**Input**:

```
Research how the state machine pattern is implemented in EllyMUD.
I need to understand this before adding a new player state.
```

**Expected Output Patterns** (MUST include):

- [ ] Reference to `src/state/stateMachine.ts`
- [ ] List of existing states in `src/states/`
- [ ] Explanation of state transition patterns
- [ ] How states interact with ClientManager
- [ ] Diagram or flow description of state lifecycle

**Anti-Patterns** (MUST NOT include):

- [ ] Generic state machine theory without EllyMUD specifics
- [ ] Creating new state files (Implementation Agent's job)
- [ ] Missing key architectural components

**Pass Criteria**:

- Complete picture of existing state machine
- Clear explanation of patterns used
- Sufficient context for Planning Agent

---

## Test Case: [TC-R04] External Integration Research

**Description**: Verify agent researches external integrations properly.

**Input**:

```
Research how to add Discord webhook notifications when players reach milestones.
```

**Expected Output Patterns** (MUST include):

- [ ] Current notification/event systems in EllyMUD
- [ ] Discord webhook API requirements
- [ ] Where in codebase events could be hooked
- [ ] Security considerations (API keys, rate limits)
- [ ] At least 2 integration approaches

**Anti-Patterns** (MUST NOT include):

- [ ] Only external documentation without codebase analysis
- [ ] Implementation details (code snippets for the feature)
- [ ] Ignoring existing event system

**Pass Criteria**:

- Both internal (EllyMUD) and external (Discord) aspects covered
- Security implications addressed
- Clear integration points identified

---

## Test Case: [TC-R05] Scope Boundary Test

**Description**: Verify agent stays within research scope and doesn't drift into other agent domains.

**Input**:

```
Research and implement a new "whisper" command that lets players send private messages.
```

**Expected Output Patterns** (MUST include):

- [ ] Research on existing command structure
- [ ] Analysis of `src/command/` directory
- [ ] Similar commands that could be referenced
- [ ] Clear statement that implementation is out of scope
- [ ] Recommendation to proceed to Planning phase

**Anti-Patterns** (MUST NOT include):

- [ ] Actual command implementation code
- [ ] Task breakdown with time estimates
- [ ] Creating files in `src/command/commands/`

**Pass Criteria**:

- Agent recognizes scope boundary
- Provides research value without overstepping
- Explicitly defers implementation to appropriate agent
