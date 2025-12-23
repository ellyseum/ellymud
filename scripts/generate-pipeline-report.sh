#!/bin/bash
#
# Generate Pipeline Metrics Report
# Reads JSON files from .github/agents/metrics/executions/ and generates
# a markdown summary report.
#
# Usage: ./scripts/generate-pipeline-report.sh [output-file]
# Default output: .github/agents/metrics/pipeline-report.md

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
METRICS_DIR="$PROJECT_ROOT/.github/agents/metrics/executions"
OUTPUT_FILE="${1:-$PROJECT_ROOT/.github/agents/metrics/pipeline-report.md}"

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo "Error: jq is required but not installed."
    echo "Install with: sudo apt install jq (Ubuntu) or brew install jq (Mac)"
    exit 1
fi

# Check if metrics directory exists
if [ ! -d "$METRICS_DIR" ]; then
    echo "No metrics directory found at $METRICS_DIR"
    echo "Pipeline metrics will be generated after running the agent pipeline."
    exit 0
fi

# Find all JSON files (excluding schema)
JSON_FILES=$(find "$METRICS_DIR" -name "*.json" ! -name "*schema*" 2>/dev/null | sort -r)

if [ -z "$JSON_FILES" ]; then
    echo "No pipeline execution metrics found."
    echo "Metrics will be generated after running the agent pipeline."
    exit 0
fi

# Count metrics
TOTAL=$(echo "$JSON_FILES" | wc -l | tr -d ' ')
SUCCESS=$(cat $JSON_FILES 2>/dev/null | jq -s '[.[] | select(.outcome == "success")] | length')
FAILED=$(cat $JSON_FILES 2>/dev/null | jq -s '[.[] | select(.outcome == "failure" or .outcome == "rolled-back")] | length')
ESCALATED=$(cat $JSON_FILES 2>/dev/null | jq -s '[.[] | select(.outcome == "escalated")] | length')

# Calculate success rate
if [ "$TOTAL" -gt 0 ]; then
    SUCCESS_RATE=$(echo "scale=1; $SUCCESS * 100 / $TOTAL" | bc)
else
    SUCCESS_RATE="0"
fi

# Calculate stage averages
calc_stage_stats() {
    local stage=$1
    local data=$(cat $JSON_FILES 2>/dev/null | jq -s "[.[] | select(.stages.$stage != null) | .stages.$stage]")
    
    local count=$(echo "$data" | jq 'length')
    if [ "$count" -eq 0 ]; then
        echo "-|-|-"
        return
    fi
    
    local avg_duration=$(echo "$data" | jq '[.[].duration // 0] | add / length | . * 10 | floor / 10')
    local avg_score=$(echo "$data" | jq '[.[].score // empty] | if length > 0 then add / length | floor else null end')
    local failures=$(echo "$data" | jq '[.[] | select(.grade == "F" or .verdict == "REJECTED")] | length')
    local failure_rate=$(echo "scale=1; $failures * 100 / $count" | bc)
    
    # Convert score to grade
    local grade="-"
    if [ "$avg_score" != "null" ] && [ -n "$avg_score" ]; then
        if [ "$avg_score" -ge 97 ]; then grade="A+"
        elif [ "$avg_score" -ge 93 ]; then grade="A"
        elif [ "$avg_score" -ge 90 ]; then grade="A-"
        elif [ "$avg_score" -ge 87 ]; then grade="B+"
        elif [ "$avg_score" -ge 83 ]; then grade="B"
        elif [ "$avg_score" -ge 80 ]; then grade="B-"
        elif [ "$avg_score" -ge 77 ]; then grade="C+"
        elif [ "$avg_score" -ge 73 ]; then grade="C"
        elif [ "$avg_score" -ge 70 ]; then grade="C-"
        elif [ "$avg_score" -ge 60 ]; then grade="D"
        else grade="F"
        fi
        grade="$grade ($avg_score)"
    fi
    
    echo "${avg_duration} min|$grade|${failure_rate}%"
}

# Get common issues
get_common_issues() {
    cat $JSON_FILES 2>/dev/null | jq -rs '
        [.[].issues // [] | .[]] | 
        group_by(.description) | 
        map({description: .[0].description, count: length, stage: .[0].stage}) |
        sort_by(-.count) |
        .[:5] |
        to_entries |
        map("\(.key + 1). \(.value.description // "Unknown issue") in \(.value.stage // "Unknown") (\(.value.count) occurrences)") |
        .[]
    ' 2>/dev/null || echo "No issues recorded"
}

# Get recent executions
get_recent_executions() {
    cat $JSON_FILES 2>/dev/null | jq -rs '
        sort_by(.date) | reverse | .[:10] |
        .[] | 
        "| `\(.pipelineId // "-")` | \(.task // "-" | .[0:40]) | \(.complexity // "-") | \(.outcome // "-") |"
    ' 2>/dev/null || echo "| - | No executions recorded | - | - |"
}

# Generate report
CURRENT_DATE=$(date +"%B %Y")
GENERATED_AT=$(date -Iseconds)

# Get stage stats
RESEARCH_STATS=$(calc_stage_stats "research")
PLANNING_STATS=$(calc_stage_stats "planning")
IMPLEMENTATION_STATS=$(calc_stage_stats "implementation")
VALIDATION_STATS=$(calc_stage_stats "validation")

cat > "$OUTPUT_FILE" << EOF
# Pipeline Metrics Summary - $CURRENT_DATE

> Generated: $GENERATED_AT
> Source: \`.github/agents/metrics/executions/*.json\`

---

## Success Rate

✅ **$SUCCESS APPROVED** | ❌ **$FAILED REJECTED** | ⚠️ **$ESCALATED ESCALATED** | **${SUCCESS_RATE}% success rate**

**Total Executions**: $TOTAL

---

## Stage Performance

| Stage | Avg Duration | Avg Grade | Failure Rate |
|-------|-------------|-----------|--------------|
| Research | $(echo "$RESEARCH_STATS" | cut -d'|' -f1) | $(echo "$RESEARCH_STATS" | cut -d'|' -f2) | $(echo "$RESEARCH_STATS" | cut -d'|' -f3) |
| Planning | $(echo "$PLANNING_STATS" | cut -d'|' -f1) | $(echo "$PLANNING_STATS" | cut -d'|' -f2) | $(echo "$PLANNING_STATS" | cut -d'|' -f3) |
| Implementation | $(echo "$IMPLEMENTATION_STATS" | cut -d'|' -f1) | $(echo "$IMPLEMENTATION_STATS" | cut -d'|' -f2) | $(echo "$IMPLEMENTATION_STATS" | cut -d'|' -f3) |
| Validation | $(echo "$VALIDATION_STATS" | cut -d'|' -f1) | $(echo "$VALIDATION_STATS" | cut -d'|' -f2) | $(echo "$VALIDATION_STATS" | cut -d'|' -f3) |

---

## Common Issues

$(get_common_issues)

---

## Recent Executions

| Pipeline ID | Task | Complexity | Outcome |
|-------------|------|------------|---------|
$(get_recent_executions)

---

## Complexity Distribution

$(cat $JSON_FILES 2>/dev/null | jq -rs '
    group_by(.complexity) |
    map({complexity: .[0].complexity, count: length}) |
    sort_by(-.count) |
    .[] |
    "- **\(.complexity // "Unknown")**: \(.count) executions"
' 2>/dev/null || echo "- No data available")

---

## Mode Distribution

$(cat $JSON_FILES 2>/dev/null | jq -rs '
    group_by(.mode) |
    map({mode: .[0].mode, count: length}) |
    sort_by(-.count) |
    .[] |
    "- **\(.mode // "Unknown")**: \(.count) executions"
' 2>/dev/null || echo "- No data available")

---

*Report generated by \`scripts/generate-pipeline-report.sh\`*
EOF

echo "✅ Pipeline report generated: $OUTPUT_FILE"
echo ""
echo "Summary:"
echo "  Total: $TOTAL | Success: $SUCCESS | Failed: $FAILED | Rate: ${SUCCESS_RATE}%"
