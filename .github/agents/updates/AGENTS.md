# Agent Updates Directory - LLM Context

> **Purpose**: Provides comprehensive context for LLMs working with the Agent Updater system.

## Directory Purpose

This directory stores all outputs from the **Agent Updater** agent, which systematically improves the agent ecosystem by:

1. Analyzing grade reports from all pipeline stages
2. Extracting improvement suggestions
3. Creating traceable update plans
4. Applying approved changes to agent instruction files

## File Types

### update-matrix.md

Master tracking file that maintains state across Agent Updater runs.

**Structure**:
```markdown
## Processed Grades
| Grade File | Agent | Date | Score | Processed By | Status |
|------------|-------|------|-------|--------------|--------|

## Update Plans
| Plan ID | Created | Grades Processed | Status |
```

**Status Values**:
- `✓` = Processed and changes applied
- `✗` = Not yet processed
- `Pending` = Plan created, awaiting approval
- `Applied` = Changes committed to codebase
- `Cancelled` = User declined changes

### update-{agent}-{timestamp}.md

Individual update proposals for a specific agent.

**Contains**:
- Source grades analyzed
- Aggregated issues with priority (P0, P1, P2)
- Specific change proposals with current/proposed markdown
- Rationale linking changes to grade feedback

### updateplan-{id}-{timestamp}.md

Comprehensive plan covering all agents needing updates.

**Contains**:
- Executive summary
- List of all grades processed
- Links to individual update files
- Change summary by priority
- Approval instructions

## Grade Sources

The Agent Updater scans these directories for grade files:

| Directory | Agent | Pattern |
|-----------|-------|---------|
| `.github/agents/metrics/` | Problem Solver | `*-grade.md` |
| `.github/agents/research/` | Research | `*-grade.md` |
| `.github/agents/planning/` | Planning | `*-grade.md` |
| `.github/agents/implementation/` | Implementation | `*-grade.md` |
| `.github/agents/validation/` | Validation | `*-grade.md` |
| `.github/agents/suggestions/` | Post-Mortem | `*-grade.md` |
| `.github/agents/documentation/` | Documentation | `*-grade.md` |

## Agent File Targets

Updates are applied to these files:

| Agent | Target File |
|-------|-------------|
| Problem Solver | `problem-solver-orchestrator-manager.agent.md` |
| Research | `research-agent.agent.md` |
| Planning | `planning-agent.agent.md` |
| Implementation | `implementation-agent.agent.md` |
| Validation | `validation-agent.agent.md` |
| Post-Mortem | `agent-post-mortem.agent.md` |
| Documentation | `documentation-updater.agent.md` |

## Workflow Integration

```
Grade Reports → Agent Updater → Update Files → User Review → Branch → Apply → PR
     ↑                              ↓
     └──────────────────────────────┘
           (continuous loop)
```

## Unique ID Format

Update plans use this ID format for traceability:

```
UP-{YYYYMMDD}-{sequence}
```

- `UP` = Update Plan prefix
- `YYYYMMDD` = Date created
- `sequence` = 001, 002, etc. for multiple plans on same day

## Usage Patterns

### Full Update Cycle
```
@agent-updater Process all unprocessed grades
```

### Review Pending Plan
```
Show me updateplan-UP-20251224-001
```

### After Review
```
proceed   # Apply all updates
modify    # Request changes
cancel    # Abort
```

## Critical Rules

1. **Never auto-apply updates** - Always wait for user approval
2. **Maintain matrix integrity** - Every processed grade must be tracked
3. **Link all changes** - Every update must cite source grades
4. **Use tools, not terminal** - Prefer VS Code tools over shell commands
