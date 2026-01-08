#!/bin/bash
#=============================================================================
# Sync To Hub - Push local artifacts to hub codespace
# 
# Synchronizes pipeline artifacts from local development to a hub codespace
# using GitHub CLI codespace commands.
#
# Usage: ./scripts/sync-to-hub.sh [options]
#   --dry-run       Preview changes without syncing
#   --hub=NAME      Hub codespace name (default: $PIPELINE_HUB_CODESPACE)
#   --no-stop       Don't stop the codespace after sync
#   --help          Show this help message
#
# What this script does:
#   1. Verifies gh CLI is installed and authenticated
#   2. Finds and starts the hub codespace if needed
#   3. Lists local artifacts to sync
#   4. Copies artifacts to hub codespace
#   5. Stops the codespace (unless --no-stop)
#   6. Reports sync summary
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

check_command() {
    if command -v "$1" &> /dev/null; then
        return 0
    else
        return 1
    fi
}

show_help() {
    echo "Sync To Hub - Push local artifacts to hub codespace"
    echo ""
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  --dry-run       Preview changes without syncing"
    echo "  --hub=NAME      Hub codespace name"
    echo "                  (default: \$PIPELINE_HUB_CODESPACE or 'ellymud-pipeline-hub')"
    echo "  --no-stop       Don't stop the codespace after sync"
    echo "  --help, -h      Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  PIPELINE_HUB_CODESPACE    Default hub codespace name"
    echo ""
    echo "Examples:"
    echo "  $0                        # Sync to default hub"
    echo "  $0 --dry-run              # Preview what would be synced"
    echo "  $0 --hub=my-hub           # Sync to specific hub"
    exit 0
}

#-----------------------------------------------------------------------------
# Variables
#-----------------------------------------------------------------------------
HUB_CODESPACE="${PIPELINE_HUB_CODESPACE:-ellymud-pipeline-hub}"
DRY_RUN=false
STOP_AFTER=true
SYNCED_COUNT=0
FAILED_COUNT=0
SKIPPED_COUNT=0

#-----------------------------------------------------------------------------
# Argument Parsing
#-----------------------------------------------------------------------------
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --hub=*)
            HUB_CODESPACE="${1#*=}"
            shift
            ;;
        --no-stop)
            STOP_AFTER=false
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
# Pre-flight Checks
#-----------------------------------------------------------------------------
preflight_checks() {
    print_header "Pre-flight Checks"
    
    # Check gh CLI
    print_step "Checking GitHub CLI..."
    if ! check_command gh; then
        print_error "GitHub CLI (gh) is not installed"
        print_info "Install: https://cli.github.com/"
        exit 1
    fi
    print_success "GitHub CLI found: $(which gh)"
    
    # Check authentication
    print_step "Checking GitHub authentication..."
    if ! gh auth status &>/dev/null; then
        print_error "Not authenticated with GitHub CLI"
        print_info "Run: gh auth login"
        exit 1
    fi
    print_success "GitHub authentication valid"
    
    # Check hub codespace exists
    print_step "Finding hub codespace: $HUB_CODESPACE"
    if ! gh codespace list --json name -q ".[] | select(.name == \"$HUB_CODESPACE\")" | grep -q "$HUB_CODESPACE"; then
        print_error "Codespace not found: $HUB_CODESPACE"
        print_info "Available codespaces:"
        gh codespace list --json name,state -q '.[] | "  - \(.name) (\(.state))"'
        exit 1
    fi
    print_success "Hub codespace found"
}

#-----------------------------------------------------------------------------
# Codespace Management
#-----------------------------------------------------------------------------
ensure_codespace_running() {
    print_step "Checking codespace status..."
    local state=$(gh codespace list --json name,state -q ".[] | select(.name == \"$HUB_CODESPACE\") | .state")
    
    if [[ "$state" != "Available" ]]; then
        print_info "Codespace is $state, starting..."
        if [[ "$DRY_RUN" == true ]]; then
            print_warn "[DRY RUN] Would start codespace"
        else
            gh codespace start -c "$HUB_CODESPACE"
            # Wait for codespace to be ready
            print_info "Waiting for codespace to start..."
            sleep 10
        fi
    fi
    print_success "Codespace is available"
}

stop_codespace() {
    if [[ "$STOP_AFTER" == true ]]; then
        print_step "Stopping codespace..."
        if [[ "$DRY_RUN" == true ]]; then
            print_warn "[DRY RUN] Would stop codespace"
        else
            gh codespace stop -c "$HUB_CODESPACE" || true
        fi
        print_success "Codespace stopped"
    else
        print_info "Leaving codespace running (--no-stop)"
    fi
}

#-----------------------------------------------------------------------------
# Artifact Sync
#-----------------------------------------------------------------------------
get_local_artifacts() {
    "$SCRIPT_DIR/pipeline-artifacts-list.sh" --json 2>/dev/null || echo '{"artifacts":[]}'
}

sync_artifact() {
    local local_path="$1"
    local full_local_path="$PROJECT_ROOT/$local_path"
    
    if [[ ! -f "$full_local_path" ]]; then
        print_warn "File not found: $local_path"
        ((SKIPPED_COUNT++))
        return
    fi
    
    if [[ "$DRY_RUN" == true ]]; then
        print_info "[DRY RUN] Would sync: $local_path"
        ((SYNCED_COUNT++))
        return
    fi
    
    print_step "Syncing: $local_path"
    
    # Ensure remote directory exists
    local remote_dir=$(dirname "$local_path")
    gh codespace ssh -c "$HUB_CODESPACE" -- "mkdir -p /workspaces/ellymud/$remote_dir" 2>/dev/null || true
    
    # Copy file
    if gh codespace cp "$full_local_path" "remote:$HUB_CODESPACE:/workspaces/ellymud/$local_path" 2>/dev/null; then
        print_success "Synced: $local_path"
        ((SYNCED_COUNT++))
    else
        print_error "Failed: $local_path"
        ((FAILED_COUNT++))
    fi
}

sync_all_artifacts() {
    print_header "Syncing Artifacts to Hub"
    print_info "Hub: $HUB_CODESPACE"
    [[ "$DRY_RUN" == true ]] && print_warn "DRY RUN MODE - No changes will be made"
    echo ""
    
    # Get local artifacts
    local artifacts_json=$(get_local_artifacts)
    local artifact_paths=$(echo "$artifacts_json" | jq -r '.artifacts[].path' 2>/dev/null || echo "")
    
    if [[ -z "$artifact_paths" ]]; then
        print_warn "No artifacts found to sync"
        return
    fi
    
    # Sync each artifact
    while IFS= read -r path; do
        [[ -n "$path" ]] && sync_artifact "$path"
    done <<< "$artifact_paths"
}

#-----------------------------------------------------------------------------
# Summary
#-----------------------------------------------------------------------------
print_summary() {
    print_header "Sync Summary"
    
    if [[ "$DRY_RUN" == true ]]; then
        echo -e "${YELLOW}DRY RUN - No changes made${NC}"
        echo ""
    fi
    
    echo -e "  ${GREEN}Synced:${NC}  $SYNCED_COUNT"
    echo -e "  ${RED}Failed:${NC}  $FAILED_COUNT"
    echo -e "  ${YELLOW}Skipped:${NC} $SKIPPED_COUNT"
    echo ""
    
    if [[ $FAILED_COUNT -gt 0 ]]; then
        print_error "Sync completed with errors"
        exit 1
    else
        print_success "Sync completed successfully"
    fi
}

#-----------------------------------------------------------------------------
# Main
#-----------------------------------------------------------------------------
main() {
    preflight_checks
    ensure_codespace_running
    sync_all_artifacts
    stop_codespace
    print_summary
}

main
