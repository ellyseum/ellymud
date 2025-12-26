# EllyMUD Agent Ecosystem

> **Version**: 1.0.0-agents | Multi-Agent Development Pipeline

## Overview

Coordinates specialized AI agents for complex development tasks. The Problem Solver Orchestrator manages workflow through Research → Planning → Implementation → Validation stages.

## Quick Start

Just describe your task. For complex work, the pipeline activates automatically.

Explicit invocation: _"Using the agent pipeline, implement [feature]"_

## Agents

| Agent                      | Purpose                       |
| -------------------------- | ----------------------------- |
| **Problem Solver**         | Main orchestrator             |
| **Research**               | Codebase investigation        |
| **Planning**               | Implementation plans          |
| **Implementation**         | Code execution                |
| **Validation**             | Quality verification          |
| **Rollback**               | Safety checkpoints            |
| **Post-Mortem**            | Pipeline analysis             |
| **Documentation**          | README/AGENTS maintenance     |
| **Unit Test Orchestrator** | Test coverage analysis        |
| **Unit Test Creator**      | Individual test file creation |

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

---

_See [AGENTS.md](AGENTS.md) for comprehensive LLM context._
