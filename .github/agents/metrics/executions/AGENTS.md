# Executions Directory - LLM Context

## Overview

Storage directory for individual pipeline execution metrics. Each file represents one agent pipeline run.

## File Format

### Naming Convention

```
pipeline_YYYY-MM-DD_task-slug.json
```

Examples:
- `pipeline_2025-12-22_whisper-command.json`
- `pipeline_2025-12-22_combat-fix.json`

### JSON Structure

```json
{
  "taskId": "task-slug",
  "date": "2025-12-22",
  "startTime": "2025-12-22T10:30:00Z",
  "endTime": "2025-12-22T10:45:00Z",
  "duration": 900,
  "agents": [
    {
      "name": "Research",
      "startTime": "...",
      "endTime": "...",
      "duration": 120,
      "status": "success"
    }
  ],
  "status": "success",
  "errors": []
}
```

## Usage

### Reading Metrics

```bash
# List all executions
ls -la .github/agents/metrics/executions/

# View specific execution
cat .github/agents/metrics/executions/pipeline_2025-12-22_task.json | jq .

# Find failed executions
grep -l '"status": "failed"' .github/agents/metrics/executions/*.json
```

### Analyzing Metrics

The parent `metrics/` directory may contain aggregation scripts that process these files.

## Retention Policy

- Keep all metrics for historical analysis
- Consider archiving files older than 90 days to a separate location
- Do not delete metrics without archiving

## Related

- [../](../) - Parent metrics directory
- [../../AGENTS.md](../../AGENTS.md) - Agent ecosystem documentation
