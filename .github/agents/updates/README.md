# Agent Updates Directory

> **Purpose**: Storage for agent improvement tracking and update plans.

## Overview

This directory contains the outputs of the **Agent Updater** agent, which analyzes grade reports across the agent ecosystem and creates systematic improvement plans.

## Contents

| File Pattern | Description |
|--------------|-------------|
| `update-matrix.md` | Master tracking of processed grades and update plans |
| `update-{agent}-{timestamp}.md` | Individual update proposals per agent |
| `updateplan-{id}-{timestamp}.md` | Comprehensive update plans for user review |

## Workflow

1. **Agent Updater** scans all `*-grade.md` files across agent directories
2. Extracts problems (P0, P1, P2) and improvement suggestions
3. Groups suggestions by target agent
4. Creates individual update files per affected agent
5. Creates an update plan with unique ID
6. Updates the matrix to track processing
7. **Waits for user approval**
8. Creates branch, applies updates, commits, and creates PR

## Update Matrix

The `update-matrix.md` file tracks:

- Which grade files have been processed
- Which update plan processed them
- Status of each plan (Pending, Applied, Cancelled)

## File Naming Conventions

### Update Files
```
update-{agent-slug}-{YYYYMMDD_HHMMSS}.md
```

Agent slugs:
- `problem-solver`
- `research`
- `planning`
- `implementation`
- `validation`
- `post-mortem`
- `documentation`

### Update Plans
```
updateplan-UP-{YYYYMMDD}-{sequence}-{YYYYMMDD_HHMMSS}.md
```

Example: `updateplan-UP-20251224-001-20251224_143000.md`

## Usage

To run the Agent Updater:

```
@agent-updater Process all unprocessed grades
```

Or specify a task:

```
@agent-updater Process grades for wave-command pipeline
```
