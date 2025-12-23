# Agent Stats Files - LLM Context

## Overview

This directory stores stats files created by agents after each execution. Every agent in the pipeline creates a stats file here.

## Directory Purpose

Stats files provide observability into agent performance:

- **Timing**: How long each agent takes
- **Tokens**: Estimated token consumption
- **Tool Calls**: Which tools were used and how often
- **Quality**: Stage-specific metrics (tests run, files modified, etc.)

## File Naming Convention

```
{prefix}_YYYY-MM-DD_{task-slug}-stats.md
```

### Prefixes by Agent

| Agent                 | Prefix       | Stats File              |
| --------------------- | ------------ | ----------------------- |
| Problem Solver        | `pipeline`   | `pipeline_*-stats.md`   |
| Research              | `research`   | `research_*-stats.md`   |
| Planning              | `plan`       | `plan_*-stats.md`       |
| Implementation        | `impl`       | `impl_*-stats.md`       |
| Validation            | `validation` | `validation_*-stats.md` |
| Output Review         | `review`     | `review_*-stats.md`     |
| Post-Mortem           | `postmortem` | `postmortem_*-stats.md` |
| Documentation Updater | `docs`       | `docs_*-stats.md`       |
| Rollback              | `rollback`   | `rollback_*-stats.md`   |

## Stats File Structure

All stats files follow a consistent structure:

```markdown
# [Stage] Stats: [Task Name]

## Timing

| Metric     | Value                    |
| ---------- | ------------------------ |
| Start Time | YYYY-MM-DD HH:MM:SS UTC  |
| End Time   | YYYY-MM-DD HH:MM:SS UTC  |
| Duration   | X minutes                |
| Status     | completed/failed/blocked |

## Token Usage (Estimated)

| Type      | Count      |
| --------- | ---------- |
| Input     | ~X,XXX     |
| Output    | ~X,XXX     |
| **Total** | **~X,XXX** |

## Tool Calls

| Tool        | Count |
| ----------- | ----- |
| [tool_name] | X     |
| **Total**   | **X** |

## Output

| Metric      | Value |
| ----------- | ----- |
| Output File | path  |
| Line Count  | X     |

## Quality Indicators

[Stage-specific metrics]

## Agent Info

| Field         | Value      |
| ------------- | ---------- |
| Agent Version | X.X.X      |
| Model         | model-name |
```

## How Agents Create Stats

1. **At session start**: Agent notes current UTC time
2. **During execution**: Agent tracks tool calls mentally
3. **At session end**: Agent creates stats file with all metrics

## Token Estimation Guidelines

| Content Type               | Estimate         |
| -------------------------- | ---------------- |
| Short message (~100 words) | ~150 tokens      |
| File read (~100 lines)     | ~500 tokens      |
| File read (~500 lines)     | ~2500 tokens     |
| Tool call input            | ~100-200 tokens  |
| Tool result                | ~200-1000 tokens |

**Formula**: `tokens ≈ words × 1.3` for text, `tokens ≈ lines × 5` for code

## Aggregation

The Problem Solver orchestrator reads stats files from this directory and aggregates them into pipeline-level metrics stored in `../executions/`.

## Related Files

- `../README.md` - Human documentation
- `../AGENTS.md` - Full metrics context
- `../pipeline-metrics-schema.json` - Pipeline JSON schema
- `../stage-stats-schema.json` - Stats file JSON schema
