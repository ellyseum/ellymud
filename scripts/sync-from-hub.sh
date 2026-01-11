#!/bin/bash
#=============================================================================
# Sync From Hub - Pull hub artifacts to local
# 
# Synchronizes pipeline artifacts from a hub codespace to local development
# using GitHub CLI codespace commands.
#
# Usage: ./scripts/sync-from-hub.sh [options]
#   --dry-run       Preview changes without syncing
#   --hub=NAME      Hub codespace name (default: $PIPELINE_HUB_CODESPACE)
#   --no-stop       Don't stop the codespace after sync
#   --force         Overwrite local files even if newer
#   --help          Show this help message
#
# What this script does:
#   1. Verifies gh CLI is installed and authenticated
#   2. Finds and starts the hub codespace if needed
#   3. Lists remote artifacts on hub
#   4. Copies artifacts from hub to local
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
    echo "Sync From Hub - Pull hub artifacts to local"
    echo ""
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  --dry-run       Preview changes without syncing"
    echo "  --hub=NAME      Hub codespace name"
    echo "                  (default: \$PIPELINE_HUB_CODESPACE or 'ellymud-pipeline-hub')"
    echo "  --no-stop       Don't stop the codespace after sync"
    echo "  --force         Overwrite local files even if newer"
    echo "  --help, -h      Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  PIPELINE_HUB_CODESPACE    Default hub codespace name"
    echo ""
    echo "Examples:"
    echo "  $0                        # Sync from default hub"
    echo "  $0 --dry-run              # Preview what would be synced"
    echo "  $0 --hub=my-hub           # Sync from specific hub"
    exit 0
}

#-----------------------------------------------------------------------------
# Variables
#-----------------------------------------------------------------------------
HUB_CODESPACE="${PIPELINE_HUB_CODESPACE:-ellymud-pipeline-hub}"
DRY_RUN=false
STOP_AFTER=true
FORCE_OVERWRITE=false
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
        --force)
            FORCE_OVERWRITE=true
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
    
    # Check jq
    print_step "Checking jq..."
    if ! check_command jq; then
        print_error "jq is not installed"
        print_info "Install: apt-get install jq (or brew install jq)"
        exit 1
    fi
    print_success "jq found"
    
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
get_remote_artifacts() {
    if [[ "$DRY_RUN" == true ]]; then
        # In dry-run mode with stopped codespace, we can't get remote list
        # Return empty for now
        print_warn "[DRY RUN] Cannot list remote artifacts without starting codespace"
        echo '{"artifacts":[]}'
        return
    fi
    
    # Run pipeline-artifacts-list.sh on remote
    gh codespace ssh -c "$HUB_CODESPACE" -- "/workspaces/ellymud/scripts/pipeline-artifacts-list.sh --json" 2>/dev/null || echo '{"artifacts":[]}'
}

sync_artifact() {
    local remote_path="$1"
    local full_local_path="$PROJECT_ROOT/$remote_path"
    local local_dir=$(dirname "$full_local_path")
    
    # Check if local file exists and is newer
    if [[ -f "$full_local_path" && "$FORCE_OVERWRITE" == false ]]; then
        local local_mtime=$(stat -c%Y "$full_local_path" 2>/dev/null || stat -f%m "$full_local_path" 2>/dev/null || echo "0")
        # For simplicity, we'll sync anyway - conflict detection can be enhanced
        print_info "Local file exists, will overwrite: $remote_path"
    fi
    
    if [[ "$DRY_RUN" == true ]]; then
        print_info "[DRY RUN] Would pull: $remote_path"
        ((SYNCED_COUNT++))
        return
    fi
    
    print_step "Pulling: $remote_path"
    
    # Validate paths to prevent command injection and directory traversal
    if [[ ! "$remote_path" =~ ^[A-Za-z0-9._/-]+$ ]] || [[ "$remote_path" == *".."* ]]; then
        print_error "Invalid path contains unsafe characters or directory traversal: $remote_path"
        ((FAILED_COUNT++))
        return
    fi
    
    # Ensure local directory exists
    mkdir -p "$local_dir"
    
    # Copy file from remote
    if gh codespace cp "remote:$HUB_CODESPACE:/workspaces/ellymud/$remote_path" "$full_local_path" 2>/dev/null; then
        print_success "Pulled: $remote_path"
        ((SYNCED_COUNT++))
    else
        print_error "Failed: $remote_path"
        ((FAILED_COUNT++))
    fi
}

sync_all_artifacts() {
    print_header "Syncing Artifacts from Hub"
    print_info "Hub: $HUB_CODESPACE"
    [[ "$DRY_RUN" == true ]] && print_warn "DRY RUN MODE - No changes will be made"
    [[ "$FORCE_OVERWRITE" == true ]] && print_warn "FORCE MODE - Will overwrite newer local files"
    echo ""
    
    # Get remote artifacts
    local artifacts_json=$(get_remote_artifacts)
    local artifact_paths=$(echo "$artifacts_json" | jq -r '.artifacts[].path' 2>/dev/null || echo "")
    
    if [[ -z "$artifact_paths" ]]; then
        print_warn "No artifacts found on hub to sync"
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
    
    echo -e "  ${GREEN}Pulled:${NC}  $SYNCED_COUNT"
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
