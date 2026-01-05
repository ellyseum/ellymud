# Grounding System - LLM Context

> **For LLMs**: This file provides comprehensive context for the grounding system.
> **For humans**: See [README.md](README.md) for a brief overview.

## Purpose

The grounding system migrates agent definitions from EllyMUD to other projects, preserving core functionality while adapting to target project conventions.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Grounding Agent (Orchestrator)                │
│                    grounding-agent.agent.md                      │
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
│                    grounding-runner.agent.md                     │
├─────────────────────────────────────────────────────────────────┤
│  • Read source agent definition                                  │
│  • Read Project Profile for target conventions                   │
│  • Rewrite agent preserving essence, adapting specifics          │
│  • Create agent file in target project's .github/agents/         │
└─────────────────────────────────────────────────────────────────┘
```

## Output Files

| File Pattern | Purpose | Tracked |
|--------------|---------|---------|
| `project-profile_<name>.md` | Target project analysis | ❌ Gitignored |
| `grounding_<date>_<name>-stats.md` | Migration statistics | ❌ Gitignored |
| `README.md` | Human documentation | ✅ Tracked |
| `AGENTS.md` | LLM documentation | ✅ Tracked |

## Project Profile

The key artifact is the **Project Profile**, which captures:

```markdown
# Project Profile: [Project Name]

## Language & Runtime
| Property | Value |
|----------|-------|
| Primary Language | TypeScript / Python / Rust |
| Runtime | Node.js 20.x / Python 3.11 |
| Type System | TypeScript strict / Python type hints |

## Package Management
| Property | Value |
|----------|-------|
| Package Manager | npm / yarn / pnpm / poetry / cargo |
| Dependency File | package.json / pyproject.toml |

## Commands
| Action | Command |
|--------|---------|
| Build | npm run build / cargo build |
| Test | npm test / pytest / cargo test |
| Lint | npm run lint / ruff check . |

## Key Differences from Source Project
| Aspect | Source (EllyMUD) | Target |
|--------|------------------|--------|
| Language | TypeScript | [target] |
| Test Framework | Jest | [target] |
```

## Default Agent Set

When migrating the "full pipeline":

| Agent | File | Purpose |
|-------|------|---------|
| Problem Solver | `problem-solver.agent.md` | Main orchestrator |
| Researcher | `researcher.agent.md` | Codebase investigation |
| Planner | `planner.agent.md` | Implementation planning |
| Implementer | `implementer.agent.md` | Code execution |
| Validator | `validator.agent.md` | Quality verification |
| Output Reviewer | `output-reviewer.agent.md` | Document quality |
| Post-Mortem Analyst | `post-mortem-analyst.agent.md` | Pipeline analysis |
| Documentation Updater | `documentation-updater.agent.md` | README/AGENTS maintenance |
| Rollback Manager | `rollback-manager.agent.md` | Safety checkpoints |
| Agent Updater | `agent-updater.agent.md` | Agent self-improvement |
| E2E Tester | `e2e-tester.agent.md` | End-to-end feature testing |
| Unit Test Orchestrator | `unit-test-orchestrator.agent.md` | Test coverage orchestration |
| Unit Test Creator | `unit-test-creator.agent.md` | Individual test file creation |
| Grounding Orchestrator | `grounding-orchestrator.agent.md` | Agent migration (recursive) |
| Grounding Runner | `grounding-runner.agent.md` | Individual agent rewriting |

## Invocation

```
Using the Grounding Orchestrator, migrate the problem solver pipeline to ~/projects/MyNewProject
```

Or for specific agents:
```
Using the Grounding Orchestrator, migrate only the Researcher and Planner agents to ~/projects/MyNewProject
```

## Workspace Symlink Requirement

VS Code tools are sandboxed to the current workspace. The Grounding Agent must create a symlink:

```bash
# Create symlink for access
ln -s ~/projects/TargetProject /home/jocel/projects/ellymud/TargetProject

# After grounding, remove symlink
rm /home/jocel/projects/ellymud/TargetProject
```

## What Gets Transformed

| EllyMUD-Specific | Becomes Target-Specific |
|------------------|------------------------|
| `npm run build` | `yarn build` / `cargo build` |
| `npm test` | `pytest` / `cargo test` |
| Jest patterns | Vitest / pytest patterns |
| `src/` paths | Target source directory |
| `\r\n` line endings | Target conventions |
| MCP server testing | Target API testing |

## Chunked Writing (Large Agents)

Agents over ~200 lines use chunked writing:

1. Create `_sections_<agent-name>/` directory
2. Write each section as numbered files (`01-frontmatter.md`, `02-role.md`, etc.)
3. Concatenate: `cat _sections_*/*.md > agent.agent.md`
4. Clean up section files

This prevents output length limits from truncating large agent definitions.

---

_Last Updated: January 2026_
