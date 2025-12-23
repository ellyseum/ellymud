# Pipeline Metrics - LLM Context

## Overview

This directory stores pipeline execution metrics for tracking health, performance, and cost trends across agent pipeline runs.

## Directory Structure

```
metrics/
├── README.md                         # Human documentation
├── AGENTS.md                         # This file (LLM context)
├── pipeline-metrics-schema.json      # JSON schema for pipeline aggregation
├── stage-stats-schema.json           # JSON schema for individual stats files
├── stats/                            # All agent stats files
│   ├── pipeline_*-stats.md           # Problem Solver stats
│   ├── research_*-stats.md           # Research Agent stats
│   ├── plan_*-stats.md               # Planning Agent stats
│   ├── impl_*-stats.md               # Implementation Agent stats
│   ├── validation_*-stats.md         # Validation Agent stats
│   ├── review_*-stats.md             # Output Review stats
│   ├── postmortem_*-stats.md         # Post-Mortem stats
│   ├── docs_*-stats.md               # Documentation Updater stats
│   └── rollback_*-stats.md           # Rollback Agent stats
└── executions/                       # Aggregated pipeline JSON records
    └── pipeline_{date}_{task}.json
```

## Stats Files

**Every agent creates a stats file** in `metrics/stats/` after completing their work.

### Stats File Naming

```
{agent-prefix}_YYYY-MM-DD_{task-slug}-stats.md
```

| Agent | Prefix | Example |
|-------|--------|---------|
| Problem Solver | `pipeline` | `pipeline_2025-12-23_wave-command-stats.md` |
| Research | `research` | `research_2025-12-23_wave-command-stats.md` |
| Planning | `plan` | `plan_2025-12-23_wave-command-stats.md` |
| Implementation | `impl` | `impl_2025-12-23_wave-command-stats.md` |
| Validation | `validation` | `validation_2025-12-23_wave-command-stats.md` |
| Output Review | `review` | `review_2025-12-23_wave-command-stats.md` |
| Post-Mortem | `postmortem` | `postmortem_2025-12-23_wave-command-stats.md` |
| Documentation | `docs` | `docs_2025-12-23_wave-command-stats.md` |
| Rollback | `rollback` | `rollback_2025-12-23_wave-command-stats.md` |

### Stats File Contents

Each stats file contains:
- **Timing**: Start/end times, duration, status
- **Token Usage**: Estimated input/output/total tokens
- **Tool Calls**: Breakdown by tool type
- **Output**: File paths, line counts
- **Quality Indicators**: Stage-specific metrics
- **Agent Info**: Version, model

Templates are inlined in each agent's `.agent.md` file under "## Stats Tracking".

## Pipeline Aggregation

The Problem Solver orchestrator aggregates individual stats into `executions/pipeline_*.json` for trend analysis.

## Schema Reference

See `pipeline-metrics-schema.json` for the full JSON schema. Key fields:

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

## Related Files

- Problem Solver: `.github/agents/problem-solver-orchestrator-manager.agent.md`
- Post-Mortem Agent: `.github/agents/agent-post-mortem.agent.md`
- All agent files have stats templates in their "## Stats Tracking" section
