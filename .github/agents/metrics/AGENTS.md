# Pipeline Metrics - LLM Context

## Overview

This directory stores pipeline execution metrics for tracking health, performance, and cost trends across agent pipeline runs.

## Directory Structure

```
metrics/
├── README.md                         # Human documentation
├── AGENTS.md                         # This file (LLM context)
├── pipeline-metrics-schema.json      # JSON schema for metrics files
└── executions/                       # Individual execution records (gitignored)
    └── pipeline_{date}_{task}.json
```

## File Naming Convention

```
pipeline_{YYYY-MM-DD}_{task-slug}.json
```

Example: `pipeline_2025-12-21_npc-dialogue-trees.json`

## Schema Reference

Metrics files follow `pipeline-metrics-schema.json`. Key fields:

| Field | Type | Description |
|-------|------|-------------|
| `pipelineId` | string | Unique ID (e.g., `pipe-2025-12-21-001`) |
| `task` | string | Task description |
| `date` | datetime | ISO 8601 timestamp |
| `complexity` | enum | Trivial, Low, Medium, High, Critical |
| `mode` | enum | Instant, Fast-Track, Standard, Full |
| `stages` | object | Per-stage metrics (duration, grade, retries) |
| `outcome` | enum | success, failure, escalated, rolled-back, abandoned |
| `tokensEstimate` | integer | Estimated total tokens used |
| `costEstimate` | number | Estimated USD cost |

## Stage Metrics Structure

Each stage (`research`, `planning`, `implementation`, `validation`, `review`) contains:

```json
{
  "started": "2025-12-21T14:30:00Z",
  "completed": "2025-12-21T14:45:00Z",
  "duration": 15,
  "grade": 85,
  "retries": 0,
  "skipped": false
}
```

## When to Create Metrics

The Problem Solver Orchestrator should create a metrics file after each pipeline execution:

1. Copy structure from `pipeline-metrics-schema.json`
2. Fill in execution data
3. Save to `executions/` directory

## Analyzing Metrics

Metrics are useful for:
- Identifying slow stages
- Tracking quality trends over time
- Estimating costs
- Finding patterns in failures/rollbacks

## Related

- Problem Solver: `.github/agents/problem-solver-orchestrator-manager.agent.md`
- Post-Mortem Agent: `.github/agents/agent-post-mortem.agent.md`
