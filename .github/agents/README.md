# EllyMUD Agent Ecosystem

> **Version**: 1.0.0-agents | Multi-Agent Development Pipeline

## Overview

Coordinates specialized AI agents for complex development tasks. The Problem Solver Orchestrator manages workflow through Research → Planning → Implementation → Validation stages.

## Quick Start

Just describe your task. For complex work, the pipeline activates automatically.

Explicit invocation: *"Using the agent pipeline, implement [feature]"*

## Agents

| Agent | Purpose |
|-------|---------|
| **Problem Solver** | Main orchestrator |
| **Research** | Codebase investigation |
| **Planning** | Implementation plans |
| **Implementation** | Code execution |
| **Validation** | Quality verification |
| **Rollback** | Safety checkpoints |
| **Post-Mortem** | Pipeline analysis |
| **Documentation** | README/AGENTS maintenance |

## Directory Structure

- `*.agent.md` - Agent prompts
- `tools/` - Operational tooling (metrics, testing, MCP integration)
- `metrics/` - Pipeline execution data
- `research/`, `planning/`, `implementation/`, `validation/` - Stage outputs

## Key Features

- **Safety**: Git stash checkpoints, automated rollback
- **Quality Gates**: Verification at each pipeline stage
- **Metrics**: Execution tracking and analysis
- **Autonomous Testing**: MCP virtual sessions for functional tests
- **Isolated Testing**: Custom data directories for safe experimentation

---

*See [AGENTS.md](AGENTS.md) for comprehensive LLM context.*
