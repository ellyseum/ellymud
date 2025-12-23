#!/bin/bash
# Agent Test Runner
# Runs agent test cases and validates outputs against expected patterns
#
# Usage: ./run-tests.sh [agent-name] [test-id]
#   ./run-tests.sh                    # Run all tests
#   ./run-tests.sh research           # Run all research agent tests
#   ./run-tests.sh research TC-R01    # Run specific test
#
# Naming Convention: Test files must match pattern: <agent>.agent-tests.md

# Note: Don't use set -e as it causes issues with arithmetic operations
# that evaluate to 0 (e.g., ((total++)) when total=0)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEST_CASES_DIR="$SCRIPT_DIR/test-cases"
RESULTS_DIR="$SCRIPT_DIR/results"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Test file naming pattern (enforced)
TEST_FILE_PATTERN="*.agent-tests.md"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Create results directory
mkdir -p "$RESULTS_DIR"

# Agent name mapping
declare -A AGENT_MAP
AGENT_MAP["research"]="Research"
AGENT_MAP["planning"]="Plan"
AGENT_MAP["implementation"]="Implementation"
AGENT_MAP["validation"]="Validation"

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
}

log_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
}

# Validate test file naming convention
validate_test_file_naming() {
    log_info "Validating test file naming convention..."
    local invalid_files=()
    
    # Find all .md files in test-cases that don't match the pattern
    while IFS= read -r -d '' file; do
        local basename=$(basename "$file")
        # Skip README.md and AGENTS.md
        if [[ "$basename" == "README.md" || "$basename" == "AGENTS.md" ]]; then
            continue
        fi
        # Check if it matches *.agent-tests.md
        if [[ ! "$basename" =~ ^[a-z]+\.agent-tests\.md$ ]]; then
            invalid_files+=("$basename")
        fi
    done < <(find "$TEST_CASES_DIR" -maxdepth 1 -name "*.md" -print0)
    
    if [[ ${#invalid_files[@]} -gt 0 ]]; then
        log_error "Invalid test file names found! Must match pattern: <agent>.agent-tests.md"
        for f in "${invalid_files[@]}"; do
            log_error "  - $f"
        done
        log_info "Valid examples: research.agent-tests.md, planning.agent-tests.md"
        return 1
    fi
    
    log_info "All test files follow naming convention ✓"
    return 0
}

# List available test files
list_test_files() {
    log_info "Available test files:"
    for file in "$TEST_CASES_DIR"/*.agent-tests.md; do
        if [[ -f "$file" ]]; then
            local basename=$(basename "$file" .agent-tests.md)
            echo "  - $basename ($(basename "$file"))"
        fi
    done
}

# Check if GitHub Copilot CLI is available and functional
check_copilot_cli() {
    local dry_run=${1:-false}
    
    # Look for the new npm-based Copilot CLI (github-copilot binary)
    if command -v github-copilot &> /dev/null; then
        COPILOT_CMD="github-copilot"
        log_info "GitHub Copilot CLI found: $COPILOT_CMD"
        export COPILOT_CMD
        return 0
    fi
    
    # Check if npx is available - we can use it to run @github/copilot directly
    if command -v npx &> /dev/null; then
        COPILOT_CMD="npx -y @githubnext/github-copilot-cli"
        log_info "Will use npx to run Copilot CLI (auto-install on first run)"
        export COPILOT_CMD
        return 0
    fi
    
    # NOTE: We intentionally DO NOT check for bare 'copilot' command
    # The old gh-copilot extension leaves behind a wrapper that prompts
    # interactively "Install GitHub Copilot CLI? [y/N]" and hangs
    
    # Not found and no npx
    log_error "GitHub Copilot CLI not found and npx not available."
    log_info "Install Node.js/npm from: https://nodejs.org/"
    log_info "Or install Copilot CLI globally: npm install -g @githubnext/github-copilot-cli"
    if [[ "$dry_run" == "true" ]]; then
        log_warn "Dry-run mode: continuing without CLI"
        COPILOT_CMD=""
        export COPILOT_CMD
        return 1
    fi
    exit 1
}

# Run a single test case
run_test() {
    local agent_key=$1
    local test_id=$2
    local prompt=$3
    local expected_patterns=$4
    local anti_patterns=$5
    local dry_run=${DRY_RUN:-false}
    
    local agent_name="${AGENT_MAP[$agent_key]}"
    local output_file="$RESULTS_DIR/${agent_key}_${test_id}_${TIMESTAMP}.md"
    
    log_info "Running test $test_id for agent: $agent_name"
    
    if [[ "$dry_run" == "true" ]]; then
        log_info "[DRY-RUN] Would invoke: gh copilot --agent=$agent_name"
        log_info "[DRY-RUN] Prompt: ${prompt:0:80}..."
        log_info "[DRY-RUN] Expected patterns: $expected_patterns"
        log_info "[DRY-RUN] Anti-patterns: $anti_patterns"
        # Return 2 to indicate "skipped" (not passed, not failed)
        return 2
    fi
    
    # Invoke agent via GitHub Copilot CLI
    # Note: The exact invocation syntax may vary based on CLI version
    # This uses the @github/copilot package (npm install -g @github/copilot)
    log_info "Invoking agent via: $COPILOT_CMD"
    
    # Try to invoke the agent - adjust syntax as needed for your CLI version
    if $COPILOT_CMD chat "@${agent_name} ${prompt}" > "$output_file" 2>&1; then
        log_info "Agent completed, output saved to $output_file"
    else
        log_warn "Agent returned non-zero exit code (check $output_file for details)"
    fi
    
    # Validate output
    validate_output "$output_file" "$expected_patterns" "$anti_patterns" "$test_id"
}

# Validate output against patterns
validate_output() {
    local output_file=$1
    local expected_patterns=$2
    local anti_patterns=$3
    local test_id=$4
    
    local passed=true
    local issues=""
    
    # Check expected patterns
    IFS='|' read -ra EXPECTED <<< "$expected_patterns"
    for pattern in "${EXPECTED[@]}"; do
        if [[ -n "$pattern" ]]; then
            if ! grep -qi "$pattern" "$output_file" 2>/dev/null; then
                passed=false
                issues+="  - Missing expected: $pattern\n"
            fi
        fi
    done
    
    # Check anti-patterns
    IFS='|' read -ra ANTI <<< "$anti_patterns"
    for pattern in "${ANTI[@]}"; do
        if [[ -n "$pattern" ]]; then
            if grep -qi "$pattern" "$output_file" 2>/dev/null; then
                passed=false
                issues+="  - Found anti-pattern: $pattern\n"
            fi
        fi
    done
    
    if $passed; then
        log_pass "$test_id"
        return 0
    else
        log_fail "$test_id"
        echo -e "$issues"
        return 1
    fi
}

# Parse test cases from markdown file
parse_and_run_tests() {
    local agent_key=$1
    local specific_test=$2
    local test_file="$TEST_CASES_DIR/${agent_key}.agent-tests.md"
    
    if [[ ! -f "$test_file" ]]; then
        log_error "Test file not found: $test_file"
        return 1
    fi
    
    # Filter for *.agent-tests.md files only (exclude README.md, AGENTS.md, etc)
    if [[ ! "$test_file" =~ \.agent-tests\.md$ ]]; then
        log_error "Invalid test file format. Must match pattern: *.agent-tests.md"
        return 1
    fi
    
    log_info "Parsing test cases from $test_file"
    
    # This is a simplified parser - for production, use a proper markdown parser
    # For now, we'll use the JSON test definitions
    log_warn "Direct markdown parsing not implemented - use JSON test definitions"
    log_info "See test-definitions.json for structured test cases"
}

# Run tests from JSON definitions
run_from_json() {
    local agent_filter=$1
    local test_filter=$2
    local json_file="$SCRIPT_DIR/test-definitions.json"
    
    if [[ ! -f "$json_file" ]]; then
        log_error "Test definitions not found: $json_file"
        log_info "Creating template test definitions file..."
        create_test_definitions_template
        return 1
    fi
    
    # Parse JSON and run tests (requires jq)
    if ! command -v jq &> /dev/null; then
        log_error "jq is required for JSON parsing. Install with: sudo apt install jq"
        exit 1
    fi
    
    local total=0
    local passed=0
    local failed=0
    local skipped=0
    local found_tests=false
    
    # Read tests from JSON
    while IFS= read -r test; do
        local agent=$(echo "$test" | jq -r '.agent')
        local test_id=$(echo "$test" | jq -r '.id')
        local prompt=$(echo "$test" | jq -r '.prompt')
        local expected=$(echo "$test" | jq -r '.expected | join("|")')
        local anti=$(echo "$test" | jq -r '.antiPatterns | join("|")')
        
        # Apply filters
        if [[ -n "$agent_filter" && "$agent" != "$agent_filter" ]]; then
            continue
        fi
        if [[ -n "$test_filter" && "$test_id" != "$test_filter" ]]; then
            continue
        fi
        
        found_tests=true
        total=$((total + 1))
        
        run_test "$agent" "$test_id" "$prompt" "$expected" "$anti"
        local result=$?
        
        if [[ $result -eq 0 ]]; then
            passed=$((passed + 1))
        elif [[ $result -eq 2 ]]; then
            skipped=$((skipped + 1))
        else
            failed=$((failed + 1))
        fi
        
    done < <(jq -c '.tests[]' "$json_file")
    
    # Check if any tests matched the filters
    if [[ "$found_tests" == "false" ]]; then
        log_warn "No tests found matching filters: agent='$agent_filter' test='$test_filter'"
        log_info "Available tests in $json_file:"
        jq -r '.tests[] | "  - \(.id) (\(.agent)): \(.name)"' "$json_file"
        return 1
    fi
    
    # Summary
    echo ""
    echo "================================"
    echo "Test Results Summary"
    echo "================================"
    echo -e "Total:   $total"
    echo -e "Passed:  ${GREEN}$passed${NC}"
    echo -e "Failed:  ${RED}$failed${NC}"
    if [[ $skipped -gt 0 ]]; then
        echo -e "Skipped: ${YELLOW}$skipped${NC} (dry-run)"
    fi
    echo "================================"
    
    # Return non-zero if any failed
    [[ $failed -eq 0 ]]
}

# Create template test definitions
create_test_definitions_template() {
    cat > "$SCRIPT_DIR/test-definitions.json" << 'EOF'
{
  "version": "1.0.0",
  "tests": [
    {
      "id": "TC-R01",
      "agent": "research",
      "name": "Basic Feature Research",
      "prompt": "Research how the command system works in EllyMUD. Focus on how commands are registered and executed.",
      "expected": [
        "commandRegistry",
        "src/command",
        "BaseCommand",
        "execute"
      ],
      "antiPatterns": [
        "I don't know",
        "I'm not sure",
        "implementation code"
      ]
    },
    {
      "id": "TC-P01",
      "agent": "planning",
      "name": "Basic Implementation Plan",
      "prompt": "Create an implementation plan for adding a 'wave' social command that lets players wave at each other. Research has shown commands are in src/command/commands/.",
      "expected": [
        "Task",
        "src/command/commands",
        "execute",
        "Success Criteria"
      ],
      "antiPatterns": [
        "research",
        "investigate",
        "I need to find"
      ]
    },
    {
      "id": "TC-I01",
      "agent": "implementation",
      "name": "Simple File Creation",
      "prompt": "Following the plan: Create a new file at src/command/commands/wave.ts that implements a 'wave' command following the BaseCommand pattern.",
      "expected": [
        "create_file",
        "BaseCommand",
        "wave"
      ],
      "antiPatterns": [
        "research",
        "plan",
        "I'm not sure"
      ]
    },
    {
      "id": "TC-V01",
      "agent": "validation",
      "name": "Build Verification",
      "prompt": "Validate that the implementation of the wave command is complete. Check that the file exists and the build passes.",
      "expected": [
        "npm run build",
        "PASS",
        "verdict"
      ],
      "antiPatterns": [
        "implementing",
        "creating",
        "I'll fix"
      ]
    }
  ]
}
EOF
    log_info "Created test-definitions.json template"
}

# Main
main() {
    local agent_filter=$1
    local test_filter=$2
    
    echo "================================"
    echo "Agent Test Runner"
    echo "$(date)"
    echo "================================"
    echo ""
    
    # Validate naming convention first
    if ! validate_test_file_naming; then
        log_error "Fix naming convention errors before running tests"
        exit 1
    fi
    echo ""
    
    # Check CLI (allow failure in dry-run mode)
    local dry_run=${DRY_RUN:-false}
    check_copilot_cli "$dry_run"
    
    if [[ -n "$agent_filter" || -n "$test_filter" ]]; then
        log_info "Filters: agent=$agent_filter test=$test_filter"
    fi
    
    run_from_json "$agent_filter" "$test_filter"
}

# Help
if [[ "$1" == "-h" || "$1" == "--help" ]]; then
    echo "Agent Test Runner"
    echo ""
    echo "Usage: ./run-tests.sh [OPTIONS] [agent-name] [test-id]"
    echo ""
    echo "Arguments:"
    echo "  agent-name   Filter by agent (research, planning, implementation, validation)"
    echo "  test-id      Filter by specific test ID (e.g., TC-R01)"
    echo ""
    echo "Options:"
    echo "  --list              List available test files"
    echo "  --validate          Only validate naming convention"
    echo "  --dry-run           Show what would run without invoking agents"
    echo "  --check-output FILE Validate an existing output file against test patterns"
    echo "  --show-tests        List all test IDs from test-definitions.json"
    echo ""
    echo "Examples:"
    echo "  ./run-tests.sh                        # Run all tests"
    echo "  ./run-tests.sh research               # Run all research agent tests"
    echo "  ./run-tests.sh research TC-R01        # Run specific test"
    echo "  ./run-tests.sh --list                 # Show available test files"
    echo "  ./run-tests.sh --dry-run research     # Preview without running"
    echo "  ./run-tests.sh --check-output results/output.md TC-V01  # Validate file"
    echo ""
    echo "Naming Convention:"
    echo "  Test files must match: <agent>.agent-tests.md"
    echo "  Valid: research.agent-tests.md, planning.agent-tests.md"
    echo "  Invalid: research-agent-tests.md, research_tests.md"
    echo ""
    echo "Prerequisites:"
    echo "  1. Node.js/npm: https://nodejs.org/"
    echo "  2. Copilot CLI: npm install -g @github/copilot"
    echo "  3. jq for JSON: sudo apt install jq"
    echo "  4. GitHub authentication configured"
    echo ""
    exit 0
fi

# Handle special flags
if [[ "$1" == "--list" ]]; then
    list_test_files
    exit 0
fi

if [[ "$1" == "--validate" ]]; then
    validate_test_file_naming
    exit $?
fi

if [[ "$1" == "--show-tests" ]]; then
    if command -v jq &> /dev/null && [[ -f "$SCRIPT_DIR/test-definitions.json" ]]; then
        echo "Available tests:"
        jq -r '.tests[] | "  \(.id) (\(.agent)): \(.name)"' "$SCRIPT_DIR/test-definitions.json"
    else
        log_error "jq or test-definitions.json not found"
        exit 1
    fi
    exit 0
fi

if [[ "$1" == "--dry-run" ]]; then
    export DRY_RUN=true
    shift
    main "$1" "$2"
    exit $?
fi

if [[ "$1" == "--check-output" ]]; then
    if [[ -z "$2" || -z "$3" ]]; then
        log_error "Usage: --check-output <output-file> <test-id>"
        exit 1
    fi
    output_file="$2"
    test_id="$3"
    
    if [[ ! -f "$output_file" ]]; then
        log_error "Output file not found: $output_file"
        exit 1
    fi
    
    # Get test patterns from JSON
    if ! command -v jq &> /dev/null; then
        log_error "jq required for pattern lookup"
        exit 1
    fi
    
    json_file="$SCRIPT_DIR/test-definitions.json"
    test_data=$(jq -c ".tests[] | select(.id == \"$test_id\")" "$json_file")
    
    if [[ -z "$test_data" ]]; then
        log_error "Test ID not found: $test_id"
        log_info "Available tests:"
        jq -r '.tests[] | "  \(.id)"' "$json_file"
        exit 1
    fi
    
    expected=$(echo "$test_data" | jq -r '.expected | join("|")')
    anti=$(echo "$test_data" | jq -r '.antiPatterns | join("|")')
    
    echo "Validating $output_file against test $test_id"
    echo "Expected patterns: $expected"
    echo "Anti-patterns: $anti"
    echo ""
    
    validate_output "$output_file" "$expected" "$anti" "$test_id"
    exit $?
fi

main "$1" "$2"
