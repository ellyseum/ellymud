# Agent Ecosystem - LLM Context

> **For LLMs**: This file provides comprehensive context for working with the agent ecosystem.
> **For humans**: See [README.md](README.md) for a brief overview.

## Architecture Overview

The agent ecosystem is a multi-agent development pipeline that coordinates specialized AI agents for complex tasks. The Problem Solver Orchestrator manages workflow, delegates to specialist agents, and ensures quality through structured gates.

```
┌─────────────────────────────────────────────────────────────────┐
│                    Problem Solver Orchestrator                   │
│  (problem-solver.agent.md)                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │ Research │→ │ Planning │→ │  Impl    │→ │Validation│        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
│       ↓             ↓             ↓             ↓               │
│  research/*.md  planning/*.md  impl/*.md   validation/*.md      │
│                                                                  │
│  Support Agents:                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │ Rollback │  │Post-Mort │  │  Output  │  │   Docs   │        │
│  │ (safety) │  │(analysis)│  │  Review  │  │ Updater  │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
│                                                                  │
│  Specialized Agents:                                             │
│  ┌──────────────────────────┐  ┌──────────────────────────┐     │
│  │ Unit Test Orchestrator   │→ │ Unit Test Creator        │     │
│  │ (coverage analysis)      │  │ (test file generation)   │     │
│  └──────────────────────────┘  └──────────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Agent Reference

### Primary Agent

#### EllyMUD Development Agent

**File**: `ellymud.agent.md`
**Role**: Comprehensive development assistant
**Capabilities**:

- Deep knowledge of entire EllyMUD codebase
- All conventions and best practices
- AGENTS.md navigation system mastery
- Agent ecosystem coordination (can handoff to specialists)
- MCP game testing tools access

**When to use**: Your default agent for all EllyMUD development tasks

**Invocation**: Select "EllyMUD" agent in VS Code, or:
```
@EllyMUD [your question or task]
```

**Handoff capabilities**: Can delegate to Researcher, Planner, Implementer, Validator, E2E Tester, Documentation Updater, and Unit Test Orchestrator.

---

### Core Pipeline Agents

#### Problem Solver Orchestrator

**File**: `problem-solver.agent.md`
**Role**: Main coordinator
**Responsibilities**:

- Analyze incoming tasks
- Decide which agents to invoke
- Manage quality gates
- Track metrics and progress
- Handle failures and rollbacks

**Invocation**: Automatic when tasks require multi-step coordination, or explicit:

```
"Using the agent pipeline, implement [feature]"
```

#### Researcher

**File**: `researcher.agent.md`
**Role**: Deep codebase investigation
**Output**: `research/research_YYYY-MM-DD_slug.md`
**Capabilities**:

- Semantic search across codebase
- File reading and analysis
- Pattern identification
- Dependency mapping

**When to use**: Understanding existing code before making changes

#### Planner

**File**: `planner.agent.md`
**Role**: Detailed implementation planning
**Output**: `planning/plan_YYYY-MM-DD_slug.md`
**Capabilities**:

- Breaking tasks into steps
- Identifying files to modify
- Specifying exact changes
- Risk assessment

**Plan format**:

```markdown
## Implementation Steps

### Step 1: [Description]

- [ ] File: `path/to/file.ts`
- [ ] Change: [Specific modification]
- [ ] Rationale: [Why this change]
```

#### Implementer

**File**: `implementer.agent.md`
**Role**: Execute implementation plans
**Output**: `implementation/impl_YYYY-MM-DD_slug.md`
**Capabilities**:

- Code editing (replace_string_in_file)
- File creation (create_file)
- Terminal commands (run_in_terminal)
- Build verification

**Critical rules**:

- Follow plan exactly
- Create checkpoint before changes
- Verify build after each file
- Document all changes made

#### Validator

**File**: `validator.agent.md`
**Role**: Quality verification
**Output**: `validation/validation_YYYY-MM-DD_slug.md`
**Capabilities**:

- Build verification
- MCP virtual session testing
- Regression detection
- Merge readiness assessment

**Server Testing (Fully Autonomous)**:

- Start server: `npm start -- --noConsole --silent --force &`
- Wait for ready: `sleep 3 && curl -s http://localhost:3100/health`
- Test via MCP virtual sessions (no user intervention)
- Cleanup: `pkill -f "node.*dist/server.js"`

**Isolated Testing** (avoid affecting real data):

- `--dataDir=PATH` - Use custom data directory
- `--roomsFile=PATH` / `--usersFile=PATH` - Override specific files
- `--rooms='[...]'` / `--users='[...]'` - Pass JSON data directly

**Validation checklist**:

```markdown
- [ ] npm run build passes
- [ ] Server starts successfully
- [ ] Basic commands work (look, stats, inventory)
- [ ] Feature-specific tests pass
- [ ] No regressions detected
```

### Support Agents

#### Rollback Manager

**File**: `rollback-manager.agent.md`
**Role**: Safety checkpoint management
**Capabilities**:

- Create git stash checkpoints
- List available checkpoints
- Restore previous states
- Emergency rollback

**Checkpoint format**:

```bash
git stash push -m "CHECKPOINT: [pipeline-id] - [description]"
```

#### Post-Mortem Analyst

**File**: `post-mortem-analyst.agent.md`
**Role**: Pipeline analysis
**When invoked**: After pipeline completion (success or failure)
**Output**: Analysis of what worked, what didn't, improvements

#### Output Reviewer

**File**: `output-reviewer.agent.md`
**Role**: Document quality assurance
**Capabilities**:

- Grade documents (A-F)
- Identify missing sections
- Suggest improvements
- Rewrite for clarity

#### Documentation Updater

**File**: `documentation-updater.agent.md`
**Role**: Maintain README/AGENTS files
**When invoked**: After code changes, or explicit request
**Scope**: All directories with README.md or AGENTS.md

### Specialized Agents

#### Unit Test Orchestrator

**File**: `unit-test-orchestrator.agent.md`
**Role**: Systematic test coverage improvement
**Output**: `unit-test-generation/coverage-matrix-*.md`, `unit-test-generation/report-*.md`
**Capabilities**:

- Analyze current test coverage
- Create prioritized task matrix
- Delegate to Unit Test Creator for each file
- Track progress and metrics
- Generate comprehensive reports

**Invocation**:
```
Using the Unit Test Orchestrator agent, generate unit tests for uncovered files
```

#### Unit Test Creator

**File**: `unit-test-creator.agent.md`
**Role**: Create individual test files
**Output**: `src/**/*.test.ts` (co-located with source)
**Capabilities**:

- Analyze source file functionality
- Create comprehensive Jest test suites
- Mock dependencies appropriately
- Verify tests compile and pass
- Report coverage achieved

**Usually invoked by**: Unit Test Orchestrator (as sub-agent)

#### Grounding Orchestrator

**File**: `grounding-orchestrator.agent.md`
**Role**: Migrate agents to new projects
**Output**: `grounding/project-profile_*.md`, `grounding/*-stats.md`
**Capabilities**:

- Analyze target project (language, structure, tooling)
- Build comprehensive Project Profile
- Delegate agent rewrites to Grounding Runner
- Verify migrated agents are properly structured

**Invocation**:
```
Using the Grounding Agent, migrate the problem solver pipeline to /path/to/my/project
```

#### Grounding Runner

**File**: `grounding-runner.agent.md`
**Role**: Rewrite individual agents for new projects
**Output**: Target project's `.github/agents/*.agent.md`
**Capabilities**:

- Preserve agent essence (role, tools, workflow)
- Transform project-specific elements (paths, commands)
- Adapt to target project conventions
- Create self-contained agent definitions

**Usually invoked by**: Grounding Agent (as sub-agent)

---

## Grounding System: Agent Migration to Other Projects

The Grounding system enables migrating the agent pipeline from EllyMUD to any other project, adapting agents to work with that project's language, structure, tooling, and conventions.

### Purpose

The agent pipeline (Research → Plan → Implement → Validate) is not EllyMUD-specific. The Grounding system allows you to:

- **Port the agent ecosystem** to any TypeScript/JavaScript project (or other languages)
- **Preserve agent behavior** while adapting project-specific details
- **Maintain pipeline integrity** so agents work together in the new context

### How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                    Grounding Agent (Orchestrator)                │
├─────────────────────────────────────────────────────────────────┤
│  1. Create symlink to target project (workspace access)         │
│  2. Analyze target project comprehensively                      │
│  3. Build Project Profile document                              │
│  4. Delegate each agent rewrite to Grounding Runner             │
│  5. Verify migrated agents are properly structured              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Grounding Runner (Per-Agent)                  │
├─────────────────────────────────────────────────────────────────┤
│  • Read source agent definition                                  │
│  • Read Project Profile for target conventions                   │
│  • Rewrite agent preserving essence, adapting specifics          │
│  • Create agent file in target project's .github/agents/         │
└─────────────────────────────────────────────────────────────────┘
```

### Project Profile

The key artifact is the **Project Profile** (`grounding/project-profile_<project>.md`), which captures:

| Section | Information |
|---------|-------------|
| Language & Runtime | TypeScript, Node.js version, module system |
| Package Management | npm/yarn/pnpm, monorepo structure |
| Project Structure | Directory layout, key paths |
| Commands | build, test, dev, lint commands |
| Testing | Framework (Jest/Vitest), patterns, coverage |
| Quality Tools | Linter config, formatters, pre-commit hooks |
| Conventions | Coding style, file naming, import patterns |
| Key Differences | Explicit mapping from source to target |

### Default Agent Set

When migrating the "full pipeline", these 15 agents are included:

| Agent | Purpose |
|-------|---------|
| Problem Solver | Main orchestrator |
| Researcher | Codebase investigation |
| Planner | Implementation planning |
| Implementer | Code execution |
| Validator | Quality verification |
| Output Reviewer | Document quality |
| Post-Mortem Analyst | Pipeline analysis |
| Documentation Updater | README/AGENTS maintenance |
| Rollback Manager | Safety checkpoints |
| Agent Updater | Agent self-improvement |
| E2E Tester | End-to-end feature testing |
| Unit Test Orchestrator | Test coverage orchestration |
| Unit Test Creator | Individual test file creation |
| Grounding Orchestrator | Agent migration (recursive) |
| Grounding Runner | Individual agent rewriting |

**NOT included** (project-specific): EllyMUD agent

### Usage

**Basic invocation**:
```
Using the Grounding Orchestrator, migrate the problem solver pipeline to ~/projects/MyNewProject
```

**Specific agents only**:
```
Using the Grounding Agent, migrate only the Research and Planning agents to ~/projects/MyNewProject
```

**With existing profile** (skip analysis):
```
Using the Grounding Agent with the existing project profile, migrate agents to ~/projects/MyNewProject
```

### What Gets Adapted

| EllyMUD-Specific | Becomes Target-Specific |
|------------------|------------------------|
| `npm run build` | `yarn build` (if Yarn project) |
| `npm test` | `yarn test` or `pnpm test` |
| Jest patterns | Vitest patterns (if applicable) |
| `src/` paths | `apps/`, `libs/`, etc. |
| Socket/Telnet references | REST API, GraphQL, etc. |
| JSON file storage | Database patterns |
| MCP server testing | API testing patterns |

### Output Locations

| File | Location |
|------|----------|
| Project Profile | `.github/agents/grounding/project-profile_<name>.md` |
| Migration Stats | `.github/agents/grounding/<name>-stats.md` |
| Migrated Agents | Target project's `.github/agents/*.agent.md` |

### Workspace Symlink Requirement

The Grounding Agent must create a symlink to access the target project:

```bash
# Creates symlink so VS Code tools can access target project
ln -s ~/projects/TargetProject /home/jocel/projects/ellymud/TargetProject

# After grounding completes, symlink is removed
rm /home/jocel/projects/ellymud/TargetProject
```

This is required because VS Code agent tools are sandboxed to the current workspace.

---

## Agent Testing

Located in `agent-tests/` directory:

### Test Runner (`agent-tests/run-tests.sh`)

Automated agent testing framework:

```bash
./run-tests.sh                    # Run all tests
./run-tests.sh validation TC-V01  # Run specific test
./run-tests.sh --dry-run          # Preview without running
./run-tests.sh --check-output results/file.md TC-V01  # Validate output
```

**Test definitions**: `agent-tests/test-definitions.json`
**Results**: `agent-tests/results/`

See `agent-tests/AGENTS.md` for full documentation.

---

## Quality Gates

### Gate 1: Research Quality

**Criteria**:

- Relevant files identified
- Dependencies mapped
- Patterns understood
- Sufficient for planning

**Fail action**: Request more research or clarification

### Gate 2: Plan Quality

**Criteria**:

- All steps specified
- Files and changes identified
- Risks assessed
- Actionable without ambiguity

**Fail action**: Return to planning with feedback

### Gate 3: Implementation Quality

**Criteria**:

- Build passes
- All planned changes made
- No unintended modifications

**Fail action**: Fix issues or rollback

### Gate 4: Validation Quality

**Criteria**:

- All tests pass
- No regressions
- Feature works as specified
- Ready for merge

**Fail action**: Return to implementation or rollback

---

## Pipeline Execution Flow

### Standard Flow

```
1. Task received
2. Orchestrator analyzes complexity
3. CREATE CHECKPOINT (Rollback Agent)
4. Research phase → research document
5. GATE 1: Research sufficient?
6. Planning phase → implementation plan
7. GATE 2: Plan actionable?
8. Implementation phase → code changes
9. GATE 3: Build passes?
10. Validation phase → test results
11. GATE 4: Ready to merge?
12. SUCCESS: Report completion
13. Post-Mortem analysis
```

### Failure Flow

```
1. Gate fails
2. Determine if recoverable
3. If recoverable: Return to previous phase
4. If not recoverable: ROLLBACK
5. Report failure with details
6. Post-Mortem analysis
```

---

## Chunked Writing Pattern (Large File Generation)

**Claude has response length limits.** For large agent files (> 200 lines), use the **chunked writing approach**.

### When to Use

| Output Size | Approach |
|-------------|----------|
| < 200 lines | Direct write (single `create_file`) |
| 200-500 lines | Chunked (recommended) |
| > 500 lines | Chunked (**REQUIRED**) |

### The Pattern

1. **Create sections directory**: `mkdir -p .github/agents/_sections_<agent-name>`

2. **Write sections as separate files** (numbered for ordering):
   ```
   01-frontmatter.md    # YAML frontmatter
   02-title-and-role.md # Title, version, role definition
   03-core-section.md   # First major section
   04-another-section.md
   ...
   ```

3. **Track progress** with `manage_todo_list`

4. **Concatenate**: `cat _sections_<agent-name>/*.md > <agent-name>.agent.md`

5. **Clean up**: `rm -rf _sections_<agent-name>`

### Why This Works

- Each section is small enough to write completely
- Progress is trackable per section
- Interruptions are recoverable (resume from last section)
- Numbered prefixes ensure correct ordering

### Example

The EllyMUD agent (933 lines) was created using this pattern:
```bash
# 12 section files were created, then:
cat _sections_ellymud/*.md > ellymud.agent.md
rm -rf _sections_ellymud
```

---

## File Naming Conventions

| Type           | Pattern                         | Example                                      |
| -------------- | ------------------------------- | -------------------------------------------- |
| Research       | `research_YYYY-MM-DD_slug.md`   | `research_2024-12-22_combat-system.md`       |
| Plan           | `plan_YYYY-MM-DD_slug.md`       | `plan_2024-12-22_add-dance-command.md`       |
| Implementation | `impl_YYYY-MM-DD_slug.md`       | `impl_2024-12-22_add-dance-command.md`       |
| Validation     | `validation_YYYY-MM-DD_slug.md` | `validation_2024-12-22_add-dance-command.md` |
| Metrics        | `pipeline_YYYY-MM-DD_slug.json` | `pipeline_2024-12-22_add-dance-command.json` |

---

## Integration with EllyMUD

### Key Conventions (from copilot-instructions.md)

- **ALWAYS** use `writeMessageToClient()` for socket output
- **ALWAYS** use `\r\n` line endings
- **NEVER** use `console.log` - use logger utilities
- Access managers via `getInstance()`

### Testing Changes

1. Run `npm run build` - must pass
2. Start server: `npm start`
3. Use MCP virtual sessions to test commands
4. Check logs for errors

### Common Tasks

| Task          | Agent Flow                                           |
| ------------- | ---------------------------------------------------- |
| Add command   | Research → Plan → Implement → Validate               |
| Fix bug       | Research (investigate) → Plan → Implement → Validate |
| Refactor      | Research → Plan → Implement → Validate               |
| Documentation | Documentation Updater only                           |

---

## Debugging Agent Issues

### Agent Not Invoked

- Check if task complexity warrants pipeline
- Try explicit invocation: "Using the agent pipeline..."

### Research Insufficient

- Agent may need more specific guidance
- Check if relevant files are in expected locations

### Plan Not Actionable

- Ensure research document is comprehensive
- Check for ambiguous requirements

### Implementation Fails

- Check TypeScript errors carefully
- Verify plan was followed exactly
- Check for missing imports/dependencies

### Validation Fails

- Use `tail_user_session` to see actual output
- Check MCP server is running for virtual sessions
- Review test criteria against implementation

---

## Extending the Ecosystem

### Adding New Agent

1. Create `new-agent.agent.md` with prompt
2. Add output directory if needed
3. Update orchestrator to invoke
4. Document in this file

### Adding New Tool

1. Create `tools/new-tool.md`
2. Update `tools/README.md`
3. Reference from relevant agents

### Adding Metrics

1. Update `metrics/pipeline-metrics-schema.json`
2. Update metrics collector documentation
3. Update orchestrator recording procedures

---

_Version: 1.0.0-agents | Last Updated: December 2024_
