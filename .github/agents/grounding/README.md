# Grounding System

The grounding system enables migration of agents from one project to another while preserving their core functionality and adapting them to the target project's conventions.

## Agents

- **Grounding Agent** (`grounding-agent.agent.md`) - Orchestrator that analyzes target projects and delegates agent rewrites
- **Grounding Runner** (`grounding-runner.agent.md`) - Worker that rewrites individual agents for new projects

## Usage

1. Invoke the Grounding Agent with a target project path
2. Optionally specify which agents to migrate (defaults to the full Problem Solver pipeline)
3. The agent will analyze the target project and create adapted versions of all agents

## Output Files

This directory stores:
- `project-profile_<project-name>.md` - Analysis of target projects
- `grounding_<date>_<project>-stats.md` - Migration statistics

## Default Agent Set

When no specific agents are requested, the full pipeline is migrated:

1. Problem Solver (orchestrator)
2. Research Agent
3. Planning Agent
4. Implementation Agent
5. Validation Agent
6. Output Review
7. Post-Mortem
8. Documentation Updater
9. Rollback
10. Agent Updater

Plus supporting files (metrics server, schemas).
