# Pipeline Metrics

Track pipeline health and performance over time.

## Purpose

Pipeline metrics provide visibility into:

- How long each stage takes
- Quality scores across executions
- Retry frequency and failure patterns
- Token usage and cost trends

## Where Metrics Are Stored

```
.github/agents/metrics/
├── README.md                          # This file
├── pipeline-metrics-schema.json       # Pipeline-level JSON schema
├── stage-stats-schema.json            # Individual stage stats schema
├── stats/                             # All agent stats files
│   ├── pipeline_2025-12-23_task-name-stats.md
│   ├── research_2025-12-23_task-name-stats.md
│   ├── plan_2025-12-23_task-name-stats.md
│   ├── impl_2025-12-23_task-name-stats.md
│   ├── validation_2025-12-23_task-name-stats.md
│   └── ...
└── executions/                        # Aggregated pipeline JSON records
    └── pipeline_2025-12-21_task-abc.json
```

## Stats System

**Every agent creates a stats file** in `metrics/stats/` with timing, token usage, and quality metrics.

| Agent          | Stats File Pattern                    |
| -------------- | ------------------------------------- |
| Problem Solver | `pipeline_YYYY-MM-DD_task-stats.md`   |
| Research       | `research_YYYY-MM-DD_task-stats.md`   |
| Planning       | `plan_YYYY-MM-DD_task-stats.md`       |
| Implementation | `impl_YYYY-MM-DD_task-stats.md`       |
| Validation     | `validation_YYYY-MM-DD_task-stats.md` |
| Output Review  | `review_YYYY-MM-DD_task-stats.md`     |
| Post-Mortem    | `postmortem_YYYY-MM-DD_task-stats.md` |
| Documentation  | `docs_YYYY-MM-DD_task-stats.md`       |
| Rollback       | `rollback_YYYY-MM-DD_task-stats.md`   |

Each agent has its own stats template inlined in its `.agent.md` file.

## Pipeline Aggregation

The Problem Solver aggregates individual stats files into a single metrics JSON:

1. Read all stats files from `metrics/stats/` for the current pipeline
2. Extract durations, token usage, tool calls from each
3. Sum totals across all stages
4. Include grade reports and output file references
5. Create `executions/pipeline_*.json`

## File Naming Convention

```
pipeline_{YYYY-MM-DD}_{task-slug}.json
```

Example: `pipeline_2025-12-21_npc-dialogue-trees.json`

## Key Schema Fields

### Stage Metrics

Each stage includes: duration, grade, score, verdict, retries, tokensUsed, statsFile path

### Output Files

Each stage tracks: original output, reviewed version, grade report, summary, change suggestions

### Aggregated Metrics

Totals from all stats files: tool calls, files processed, token breakdown, quality scores

## Sample Metrics Record

```json
{
  "pipelineId": "pipe-2025-12-21-001",
  "task": "Implement NPC dialogue trees",
  "date": "2025-12-21T14:30:00Z",
  "branch": "feature/npc-dialogue",
  "complexity": "Medium",
  "stages": {
    "research": {
      "duration": 15,
      "grade": "A",
      "score": 92,
      "verdict": "PASS",
      "retries": 0,
      "statsFile": ".github/agents/metrics/stats/research_2025-12-21_npc-dialogue-stats.md"
    }
  },
  "outputs": {
    "research": {
      "original": ".github/agents/research/research_npc-dialogue.md",
      "reviewed": ".github/agents/research/research_npc-dialogue-reviewed.md",
      "gradeReport": ".github/agents/research/research_npc-dialogue-grade.md"
    }
  },
  "aggregatedFromStats": {
    "totalToolCalls": 145,
    "tokenBreakdown": { "research": 15000, "planning": 8000 }
  },
  "totalDuration": 72,
  "outcome": "success"
}
```

## Analyzing Trends

### Key Metrics to Track

| Metric             | What It Shows       | Target                    |
| ------------------ | ------------------- | ------------------------- |
| Average duration   | Pipeline efficiency | < 60 min for Medium tasks |
| Grade distribution | Quality consistency | 80%+ at B or higher       |
| Retry rate         | First-pass quality  | < 20% retry rate          |
| Success rate       | Overall reliability | > 90% success             |

### Aggregation Queries

To analyze metrics, you can:

1. **Manual Review**: Open recent files and compare
2. **Script Analysis**: Use jq or Node.js to aggregate
3. **Post-Mortem Integration**: Post-Mortem Agent references these metrics

### Example Analysis (using jq)

```bash
# Average duration across all pipelines
cat executions/*.json | jq -s 'map(.totalDuration) | add / length'

# Count outcomes
cat executions/*.json | jq -s 'group_by(.outcome) | map({outcome: .[0].outcome, count: length})'

# Total tokens per stage
cat executions/*.json | jq -s '[.[] | .aggregatedFromStats.tokenBreakdown] | add'
```

## Integration with Post-Mortem Agent

The Post-Mortem Agent should:

1. Read recent metrics files
2. Identify patterns (slow stages, frequent retries)
3. Suggest improvements based on trends
4. Reference specific pipeline IDs in analysis

## Token Usage Estimation

Token estimates are rough calculations:

- Research: ~10,000-20,000 tokens
- Planning: ~5,000-15,000 tokens
- Implementation: ~15,000-40,000 tokens
- Validation: ~5,000-15,000 tokens
- Review (per doc): ~3,000-8,000 tokens

Actual usage varies by task complexity and context size.
