# EllyMUD Agent Ecosystem

> **Version**: 1.1.0-agents | Multi-Agent Development Pipeline

## Overview

Coordinates specialized AI agents for complex development tasks. The Problem Solver Orchestrator manages workflow through Research → Planning → Implementation → Validation stages.

## Quick Start

**Recommended**: Use the **EllyMUD** agent for all development tasks. It has deep codebase knowledge and can delegate to specialists when needed.

For complex multi-stage work, use: _"Using the agent pipeline, implement [feature]"_

## Agents

| Agent                      | Purpose                        |
| -------------------------- | ------------------------------ |
| **EllyMUD**                | Primary development assistant  |
| **Problem Solver**         | Main orchestrator              |
| **Researcher**             | Codebase investigation         |
| **Planner**                | Implementation plans           |
| **Implementer**            | Code execution                 |
| **Validator**              | Quality verification           |
| **E2E Tester**             | Game testing via MCP tools     |
| **Rollback Manager**       | Safety checkpoints             |
| **Post-Mortem Analyst**    | Pipeline analysis              |
| **Output Reviewer**        | Document quality assurance     |
| **Documentation Updater**  | README/AGENTS maintenance      |
| **Agent Updater**          | Agent self-improvement         |
| **Unit Test Orchestrator** | Test coverage analysis         |
| **Unit Test Creator**      | Individual test file creation  |
| **Grounding Orchestrator** | Migrate agents to projects     |
| **Grounding Runner**       | Rewrite individual agents      |

## Directory Structure

- `*.agent.md` - Agent prompts
- `agent-tests/` - Agent testing framework
- `documentation/` - Documentation agent outputs
- `implementation/` - Implementation reports
- `metrics/` - Pipeline execution data and stats
- `planning/` - Implementation plans
- `research/` - Research documents
- `reviews/` - Temporary working files
- `suggestions/` - Post-mortem improvement proposals
- `unit-test-generation/` - Unit test orchestration outputs
- `updates/` - Agent improvement tracking
- `validation/` - Validation reports

## Key Features

- **Safety**: Git stash checkpoints, automated rollback
- **Quality Gates**: Verification at each pipeline stage
- **Metrics**: Execution tracking and analysis
- **Autonomous Testing**: MCP virtual sessions for functional tests
- **Isolated Testing**: Custom data directories for safe experimentation
- **Chunked Writing**: Pattern for generating large files without hitting response limits

## Chunked Writing Pattern

For large agent files (> 200 lines):
1. Create sections directory: `_sections_<name>/`
2. Write numbered section files: `01-frontmatter.md`, `02-role.md`, etc.
3. Concatenate: `cat _sections_<name>/*.md > <name>.agent.md`
4. Clean up: `rm -rf _sections_<name>`

---

_See [AGENTS.md](AGENTS.md) for comprehensive LLM context._
