# Planning Agent Test Cases

Tests for validating the Planning Agent behavior.

---

## Test Case: [TC-P01] Standard Feature Planning

**Description**: Verify agent creates actionable implementation plan from research.

**Input**:

```
Based on the research for NPC dialogue trees, create an implementation plan.

Research findings:
- NPCs are managed in src/combat/npc.ts
- Dialogue could use a tree structure stored in data/npcs/
- Need to integrate with existing command system
- Consider using a state-based dialogue flow
```

**Expected Output Patterns** (MUST include):

- [ ] "## Implementation Plan" header
- [ ] Numbered task list with clear ordering
- [ ] Time/effort estimates per task
- [ ] File paths for each change
- [ ] Dependencies between tasks identified
- [ ] Risk assessment section
- [ ] "## Acceptance Criteria" defining done state

**Anti-Patterns** (MUST NOT include):

- [ ] Actual code implementation
- [ ] Vague tasks like "implement the feature"
- [ ] Missing file path specifications
- [ ] No time estimates
- [ ] Contradictory task ordering

**Pass Criteria**:

- Plan is actionable by Implementation Agent
- Clear sequence of tasks
- Risks identified and mitigated
- Success criteria defined

---

## Test Case: [TC-P02] Bug Fix Planning

**Description**: Verify agent creates targeted fix plan for a bug.

**Input**:

```
Plan a fix for negative damage calculations.

Research findings:
- Bug is in src/combat/combat.ts calculateDamage()
- Occurs when armor exceeds attack value
- No minimum damage check exists
- Related to defense stat calculation
```

**Expected Output Patterns** (MUST include):

- [ ] Specific file and function to modify
- [ ] Exact change to make (add minimum check)
- [ ] Test cases to verify fix
- [ ] Regression risks identified
- [ ] Estimated effort (should be small for bug fix)

**Anti-Patterns** (MUST NOT include):

- [ ] Suggesting complete rewrite for simple bug
- [ ] Missing test verification step
- [ ] No rollback consideration
- [ ] Over-engineering the solution

**Pass Criteria**:

- Fix is minimal and targeted
- Test plan included
- Rollback path clear

---

## Test Case: [TC-P03] Multi-File Feature Planning

**Description**: Verify agent handles complex features spanning multiple files.

**Input**:

```
Plan implementation of a guild system.

Research findings:
- Needs new data model in data/guilds.json
- New GuildManager singleton similar to UserManager
- Commands: /guild create, /guild invite, /guild leave
- Integration with chat for guild channel
- Permissions system for guild roles
```

**Expected Output Patterns** (MUST include):

- [ ] Phased implementation approach
- [ ] Data model design first
- [ ] Manager class creation
- [ ] Command implementation per command
- [ ] Integration tasks last
- [ ] Clear phase dependencies
- [ ] Total effort estimate
- [ ] MVP vs full feature distinction

**Anti-Patterns** (MUST NOT include):

- [ ] Single monolithic task
- [ ] Missing data model step
- [ ] Commands before manager exists
- [ ] No phasing for complex feature

**Pass Criteria**:

- Logical phase ordering
- Dependencies respected
- MVP clearly defined
- Manageable task sizes

---

## Test Case: [TC-P04] Planning with Constraints

**Description**: Verify agent respects stated constraints.

**Input**:

```
Plan a performance optimization for room lookups.

Research findings:
- RoomManager loads all rooms into memory
- 500+ rooms causing slow startup
- Could use lazy loading or caching

Constraints:
- Cannot change room data format
- Must maintain backward compatibility
- Maximum 2 hours of work
```

**Expected Output Patterns** (MUST include):

- [ ] Explicit acknowledgment of constraints
- [ ] Solution that respects data format constraint
- [ ] Backward compatibility verification step
- [ ] Tasks fitting within 2-hour budget
- [ ] Trade-offs explained given constraints

**Anti-Patterns** (MUST NOT include):

- [ ] Solutions requiring data format changes
- [ ] Plans exceeding time constraint
- [ ] Ignoring backward compatibility
- [ ] No constraint acknowledgment

**Pass Criteria**:

- All constraints respected
- Feasible within stated limits
- Trade-offs transparent

---

## Test Case: [TC-P05] Scope Boundary Test

**Description**: Verify agent stays within planning scope.

**Input**:

```
Plan and implement a new "emote" command.

Research shows:
- Similar to "say" command in structure
- Needs emote list in data/emotes.json
```

**Expected Output Patterns** (MUST include):

- [ ] Detailed task breakdown
- [ ] File specifications
- [ ] Clear statement that implementation is next phase
- [ ] Handoff notes for Implementation Agent

**Anti-Patterns** (MUST NOT include):

- [ ] Actual TypeScript/JavaScript code
- [ ] Creating the emotes.json file
- [ ] Modifying any source files

**Pass Criteria**:

- Pure planning output
- Clear handoff to Implementation
- No code generation
