#!/bin/bash
#=============================================================================
# Pipeline Artifacts List - List all pipeline artifacts
# 
# Lists all pipeline artifacts in the .github/agents directory with type,
# date, and file information.
#
# Usage: ./scripts/pipeline-artifacts-list.sh [options]
#   --type=TYPE     Filter by type (research, planning, implementation, 
#                   validation, metrics, suggestions, documentation)
#   --json          Output in JSON format
#   --help          Show this help message
#
# What this script does:
#   1. Scans .github/agents directories for artifact files
#   2. Groups and lists artifacts by type
#   3. Outputs file paths with metadata
#=============================================================================

set -e  # Exit on error

#-----------------------------------------------------------------------------
# Colors
#-----------------------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

#-----------------------------------------------------------------------------
# Helper Functions
#-----------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

print_header() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_step()    { echo -e "${GREEN}▶${NC} $1"; }
print_info()    { echo -e "${BLUE}ℹ${NC} $1"; }
print_warn()    { echo -e "${YELLOW}⚠${NC} $1"; }
print_error()   { echo -e "${RED}✗${NC} $1"; }
print_success() { echo -e "${GREEN}✓${NC} $1"; }

show_help() {
    echo "Pipeline Artifacts List"
    echo ""
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  --type=TYPE     Filter by artifact type"
    echo "                  Types: research, planning, implementation,"
    echo "                         validation, metrics, suggestions, documentation"
    echo "  --json          Output in JSON format"
    echo "  --help, -h      Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                          # List all artifacts"
    echo "  $0 --type=research          # List only research artifacts"
    echo "  $0 --json                   # JSON output for scripting"
    exit 0
}

#-----------------------------------------------------------------------------
# Variables
#-----------------------------------------------------------------------------
AGENTS_DIR="$PROJECT_ROOT/.github/agents"
FILTER_TYPE=""
JSON_OUTPUT=false

#-----------------------------------------------------------------------------
# Argument Parsing
#-----------------------------------------------------------------------------
while [[ $# -gt 0 ]]; do
    case $1 in
        --type=*)
            FILTER_TYPE="${1#*=}"
            shift
            ;;
        --json)
            JSON_OUTPUT=true
            shift
            ;;
        --help|-h)
            show_help
            ;;
        *)
            print_error "Unknown option: $1"
            show_help
            ;;
    esac
done

#-----------------------------------------------------------------------------
# Artifact Patterns
#-----------------------------------------------------------------------------
declare -A ARTIFACT_PATTERNS
ARTIFACT_PATTERNS["research"]="research/research_*.md"
ARTIFACT_PATTERNS["planning"]="planning/plan_*.md"
ARTIFACT_PATTERNS["implementation"]="implementation/impl_*.md"
ARTIFACT_PATTERNS["validation"]="validation/validation_*.md"
ARTIFACT_PATTERNS["metrics-executions"]="metrics/executions/pipeline_*.json"
ARTIFACT_PATTERNS["metrics-stats"]="metrics/stats/*-stats.md"
ARTIFACT_PATTERNS["suggestions"]="suggestions/post-mortem-suggestions-*.md"
ARTIFACT_PATTERNS["documentation"]="documentation/docs_*.md"

#-----------------------------------------------------------------------------
# List Artifacts
#-----------------------------------------------------------------------------
list_artifacts() {
    local type_filter="$1"
    local artifacts=()
    local total_count=0
    
    for type in "${!ARTIFACT_PATTERNS[@]}"; do
        # Skip if type filter is set and doesn't match
        if [[ -n "$type_filter" && "$type" != "$type_filter"* ]]; then
            continue
        fi
        
        local pattern="${ARTIFACT_PATTERNS[$type]}"
        local files=()
        
        # Use find to get files matching the pattern
        while IFS= read -r -d '' file; do
            files+=("$file")
        done < <(find "$AGENTS_DIR" -path "$AGENTS_DIR/$pattern" -type f -print0 2>/dev/null || true)
        
        if [[ ${#files[@]} -gt 0 ]]; then
            for file in "${files[@]}"; do
                [[ -z "$file" ]] && continue
                local rel_path="${file#$PROJECT_ROOT/}"
                local size=$(stat -c%s "$file" 2>/dev/null || stat -f%z "$file" 2>/dev/null || echo "0")
                local mtime=$(stat -c%Y "$file" 2>/dev/null || stat -f%m "$file" 2>/dev/null || echo "0")
                artifacts+=("$type|$rel_path|$size|$mtime")
                ((total_count++)) || true
            done
        fi
    done
    
    if [[ "$JSON_OUTPUT" == true ]]; then
        echo "{"
        echo "  \"totalCount\": $total_count,"
        echo "  \"artifacts\": ["
        local first=true
        for artifact in "${artifacts[@]}"; do
            IFS='|' read -r type path size mtime <<< "$artifact"
            if [[ "$first" == true ]]; then
                first=false
            else
                echo ","
            fi
            printf '    {"type": "%s", "path": "%s", "size": %s, "mtime": %s}' "$type" "$path" "$size" "$mtime"
        done
        echo ""
        echo "  ]"
        echo "}"
    else
        print_header "Pipeline Artifacts"
        
        if [[ $total_count -eq 0 ]]; then
            print_warn "No artifacts found"
            [[ -n "$type_filter" ]] && print_info "Filter: --type=$type_filter"
            return
        fi
        
        local current_type=""
        for artifact in "${artifacts[@]}"; do
            IFS='|' read -r type path size mtime <<< "$artifact"
            if [[ "$type" != "$current_type" ]]; then
                current_type="$type"
                echo ""
                echo -e "${CYAN}[$type]${NC}"
            fi
            # Format size using bash arithmetic (avoiding bc dependency)
            local size_fmt
            if [[ $size -gt 1048576 ]]; then
                size_fmt="$((size / 1048576))M"
            elif [[ $size -gt 1024 ]]; then
                size_fmt="$((size / 1024))K"
            else
                size_fmt="${size}B"
            fi
            printf "  %s (%s)\n" "$path" "$size_fmt"
        done
        
        echo ""
        print_success "Total: $total_count artifacts"
    fi
}

#-----------------------------------------------------------------------------
# Main
#-----------------------------------------------------------------------------
list_artifacts "$FILTER_TYPE"
