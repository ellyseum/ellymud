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

| Agent          | Prefix       | Example                                       |
| -------------- | ------------ | --------------------------------------------- |
| Problem Solver | `pipeline`   | `pipeline_2025-12-23_wave-command-stats.md`   |
| Research       | `research`   | `research_2025-12-23_wave-command-stats.md`   |
| Planning       | `plan`       | `plan_2025-12-23_wave-command-stats.md`       |
| Implementation | `impl`       | `impl_2025-12-23_wave-command-stats.md`       |
| Validation     | `validation` | `validation_2025-12-23_wave-command-stats.md` |
| Output Review  | `review`     | `review_2025-12-23_wave-command-stats.md`     |
| Post-Mortem    | `postmortem` | `postmortem_2025-12-23_wave-command-stats.md` |
| Documentation  | `docs`       | `docs_2025-12-23_wave-command-stats.md`       |
| Rollback       | `rollback`   | `rollback_2025-12-23_wave-command-stats.md`   |

### Stats File Contents

Each stats file contains:

- **Timing**: Start/end times, duration, status
- **Token Usage**: Estimated input/output/total tokens
- **Tool Calls**: Breakdown by tool type
- **Output**: File paths, line counts
- **Review Results**: Grade report path, grade, score, verdict
- **Quality Indicators**: Stage-specific metrics
- **Agent Info**: Version, model

Templates are inlined in each agent's `.agent.md` file under "## Stats Tracking".

## Pipeline Aggregation

The Problem Solver orchestrator aggregates individual stats files from `metrics/stats/` into `executions/pipeline_*.json` for trend analysis.

### Aggregation Process

1. **Read stats files**: Find all `{stage}_YYYY-MM-DD_{task}-stats.md` files
2. **Extract metrics**: Duration, tokens, tool calls, quality indicators
3. **Sum totals**: Aggregate durations, tokens, tool calls across stages
4. **Reference files**: Include paths to stats files in the pipeline JSON

## Schema Reference

See `pipeline-metrics-schema.json` for the full JSON schema.

### Core Fields

| Field            | Type     | Description                                         |
| ---------------- | -------- | --------------------------------------------------- |
| `pipelineId`     | string   | Unique ID (e.g., `pipe-2025-12-21-001`)             |
| `task`           | string   | Task description                                    |
| `date`           | datetime | ISO 8601 timestamp                                  |
| `complexity`     | enum     | Trivial, Low, Medium, High, Critical                |
| `mode`           | enum     | Instant, Fast-Track, Standard, Full                 |
| `stages`         | object   | Per-stage metrics (duration, grade, retries)        |
| `outcome`        | enum     | success, failure, escalated, rolled-back, abandoned |
| `tokensEstimate` | integer  | Estimated total tokens used                         |

### Stats File References

| Field                       | Description                             |
| --------------------------- | --------------------------------------- |
| `statsFiles.research`       | Path to research agent stats file       |
| `statsFiles.planning`       | Path to planning agent stats file       |
| `statsFiles.implementation` | Path to implementation agent stats file |
| `statsFiles.validation`     | Path to validation agent stats file     |
| `statsFiles.*`              | Other stage stats files                 |

### Output File References

| Field                               | Description                       |
| ----------------------------------- | --------------------------------- |
| `outputs.{stage}.original`          | Original agent output file        |
| `outputs.{stage}.reviewed`          | Reviewed version (\*-reviewed.md) |
| `outputs.{stage}.gradeReport`       | Grade report (\*-grade.md)        |
| `outputs.{stage}.summary`           | Summary file (\*-summary.md)      |
| `outputs.{stage}.changeSuggestions` | Improvement suggestions           |

### Aggregated Metrics (from stats files)

| Field                                | Description                           |
| ------------------------------------ | ------------------------------------- |
| `aggregatedFromStats.totalToolCalls` | Sum of all tool calls                 |
| `aggregatedFromStats.filesProcessed` | Read/created/modified/deleted counts  |
| `aggregatedFromStats.tokenBreakdown` | Tokens per stage                      |
| `aggregatedFromStats.qualityScores`  | Citations, tasks, tests, build status |

### Stage Metrics

Each stage in `stages` contains:

| Field        | Type    | Description                 |
| ------------ | ------- | --------------------------- |
| `duration`   | integer | Minutes (from stats file)   |
| `grade`      | string  | Letter grade (A-F with +/-) |
| `score`      | integer | Numeric score (0-100)       |
| `verdict`    | enum    | PASS/FAIL/SKIP              |
| `retries`    | integer | Retry attempts              |
| `skipped`    | boolean | Whether stage was skipped   |
| `tokensUsed` | integer | From stats file             |
| `statsFile`  | string  | Path to stage stats file    |

## Related Files

- Problem Solver: `.github/agents/problem-solver-orchestrator-manager.agent.md`
- Post-Mortem Agent: `.github/agents/agent-post-mortem.agent.md`
- All agent files have stats templates in their "## Stats Tracking" section
