#!/bin/bash
#=============================================================================
# Check Paired Documentation
#
# This script ensures that README.md and AGENTS.md files are updated together.
# When one is modified in a directory, the other should also be modified.
#
# Usage: ./scripts/check-paired-docs.sh [options]
#   --staged    Check only staged files (default, for git hooks)
#   --all       Check all directories for missing pairs
#   --help      Show this help message
#
# Returns: 0 if all pairs are valid, 1 if issues found
#=============================================================================

set -e

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

MODE="staged"

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --staged)
            MODE="staged"
            shift
            ;;
        --all)
            MODE="all"
            shift
            ;;
        --help)
            echo "Usage: $0 [--staged|--all|--help]"
            echo ""
            echo "Options:"
            echo "  --staged    Check only staged files (default, for git hooks)"
            echo "  --all       Check all directories for missing pairs"
            echo "  --help      Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

ERRORS=0
CHECKED_DIRS=""

#=============================================================================
# Check staged files for paired updates
#=============================================================================
check_staged_pair() {
    local file="$1"
    local dir=$(dirname "$file")
    local basename=$(basename "$file")
    
    # Skip .github/README.md - it's intentionally unpaired
    # GitHub treats .github/README.md specially and would override root README
    if [ "$file" = ".github/README.md" ]; then
        return
    fi
    
    # Skip if we already checked this directory
    if echo "$CHECKED_DIRS" | grep -q "^${dir}$"; then
        return
    fi
    CHECKED_DIRS="$CHECKED_DIRS
$dir"
    
    local readme="$dir/README.md"
    local agents="$dir/AGENTS.md"
    
    # Check if both files exist in the directory
    if [ ! -f "$readme" ] || [ ! -f "$agents" ]; then
        return
    fi
    
    # Check if one is staged without the other
    local readme_staged=$(echo "$STAGED_FILES" | grep -x "$readme" || true)
    local agents_staged=$(echo "$STAGED_FILES" | grep -x "$agents" || true)
    
    if [ -n "$readme_staged" ] && [ -z "$agents_staged" ]; then
        printf "${YELLOW}⚠ Warning:${NC} $readme modified but $agents not staged\n"
        printf "   Paired documentation should be updated together.\n"
        ERRORS=1
    elif [ -z "$readme_staged" ] && [ -n "$agents_staged" ]; then
        printf "${YELLOW}⚠ Warning:${NC} $agents modified but $readme not staged\n"
        printf "   Paired documentation should be updated together.\n"
        ERRORS=1
    fi
}

#=============================================================================
# Build exclusion patterns from .gitignore
#=============================================================================
build_gitignore_patterns() {
    local patterns=""
    
    # Always exclude these standard directories
    patterns='^\./node_modules($|/)|^\./dist($|/)|^\./\.git($|/)|^\./logs($|/)|^\./backups($|/)|^\./coverage($|/)|^\./\.husky/_|/results($|/)'
    
    # Read additional patterns from .gitignore if it exists
    if [ -f ".gitignore" ]; then
        while IFS= read -r line || [ -n "$line" ]; do
            # Skip empty lines and comments
            [[ -z "$line" || "$line" =~ ^# ]] && continue
            
            # Remove leading/trailing whitespace
            line=$(echo "$line" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
            
            # Skip empty after trim
            [ -z "$line" ] && continue
            
            # Convert gitignore pattern to regex for directory matching
            # Handle directory patterns (ending with /)
            if [[ "$line" == */ ]]; then
                # Directory pattern: logs/ -> match ./logs or any path containing /logs/
                local dir_name="${line%/}"
                # Escape special regex characters
                dir_name=$(echo "$dir_name" | sed 's/[.[\*^$()+?{|]/\\&/g')
                patterns="$patterns|^\.\/$dir_name(\$|/)|/$dir_name(\$|/)"
            elif [[ "$line" == /* ]]; then
                # Root-relative pattern: /build -> match only ./build
                local dir_name="${line#/}"
                dir_name=$(echo "$dir_name" | sed 's/[.[\*^$()+?{|]/\\&/g')
                patterns="$patterns|^\.\/$dir_name(\$|/)"
            elif [[ "$line" != *"*"* && "$line" != *"?"* ]]; then
                # Simple name (no wildcards): .env, .claude -> match as directory
                local dir_name="$line"
                dir_name=$(echo "$dir_name" | sed 's/[.[\*^$()+?{|]/\\&/g')
                patterns="$patterns|^\.\/$dir_name(\$|/)|/$dir_name(\$|/)"
            fi
            # Skip wildcard patterns like *.log - they're for files, not directories
        done < ".gitignore"
    fi
    
    echo "$patterns"
}

#=============================================================================
# Check all directories for missing pairs
#=============================================================================
check_all_pairs() {
    printf "${BLUE}Scanning all directories for README.md and AGENTS.md pairs...${NC}\n\n"
    
    local missing_both=0
    local missing_agents=0
    local missing_readme=0
    local valid_pairs=0
    local undocumented_dirs=""
    local partial_agents=""
    local partial_readme=""
    
    # Build exclusion pattern from hardcoded defaults + .gitignore
    local exclude_pattern
    exclude_pattern=$(build_gitignore_patterns)
    
    # Special files that are intentionally unpaired
    # .github/README.md is excluded because GitHub treats it specially - it would override root README.md
    local unpaired_exceptions=".github/README.md"
    
    # Find ALL directories recursively (excluding standard ignores)
    while IFS= read -r dir; do
        # Skip the excluded directories
        if echo "$dir" | grep -qE "$exclude_pattern"; then
            continue
        fi
        
        local readme="$dir/README.md"
        local agents="$dir/AGENTS.md"
        local has_readme=false
        local has_agents=false
        
        [ -f "$readme" ] && has_readme=true
        [ -f "$agents" ] && has_agents=true
        
        if $has_readme && $has_agents; then
            valid_pairs=$((valid_pairs + 1))
        elif $has_readme && ! $has_agents; then
            partial_agents="$partial_agents$dir\n"
            missing_agents=$((missing_agents + 1))
            ERRORS=1
        elif ! $has_readme && $has_agents; then
            # Skip .github directory - README.md is intentionally absent
            # GitHub treats .github/README.md specially and would override root README.md
            if [ "$dir" = "./.github" ]; then
                valid_pairs=$((valid_pairs + 1))  # Count as valid (intentional exception)
            else
                partial_readme="$partial_readme$dir\n"
                missing_readme=$((missing_readme + 1))
                ERRORS=1
            fi
        else
            # Neither file exists - check if directory has meaningful content
            # Skip empty dirs or dirs with only subdirectories
            # Include common source/config file types
            local file_count=$(find "$dir" -maxdepth 1 -type f \( -name "*.ts" -o -name "*.js" -o -name "*.json" -o -name "*.sh" -o -name "*.html" -o -name "*.css" -o -name "*.md" -o -name "*.yml" -o -name "*.yaml" -o -name "Makefile" -o -name "*.mk" \) 2>/dev/null | wc -l)
            if [ "$file_count" -gt 0 ]; then
                undocumented_dirs="$undocumented_dirs$dir\n"
                missing_both=$((missing_both + 1))
                ERRORS=1
            fi
        fi
    done < <(find . -type d -not -path "./node_modules/*" -not -path "./dist/*" -not -path "./.git/*" -not -path "./logs/*" -not -path "./backups/*" -not -path "./coverage/*" 2>/dev/null | sort)
    
    # Report undocumented directories FIRST (most critical for agents)
    if [ $missing_both -gt 0 ]; then
        printf "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
        printf "${RED}UNDOCUMENTED DIRECTORIES (missing both README.md and AGENTS.md):${NC}\n"
        printf "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
        printf "$undocumented_dirs" | while read -r dir; do
            [ -n "$dir" ] && printf "  ${RED}✗${NC} $dir/\n"
        done
        echo ""
    fi
    
    # Report partial pairs (missing one file)
    if [ $missing_agents -gt 0 ]; then
        printf "${YELLOW}Missing AGENTS.md (has README.md):${NC}\n"
        printf "$partial_agents" | while read -r dir; do
            [ -n "$dir" ] && printf "  ${YELLOW}⚠${NC} $dir/\n"
        done
        echo ""
    fi
    
    if [ $missing_readme -gt 0 ]; then
        printf "${YELLOW}Missing README.md (has AGENTS.md):${NC}\n"
        printf "$partial_readme" | while read -r dir; do
            [ -n "$dir" ] && printf "  ${YELLOW}⚠${NC} $dir/\n"
        done
        echo ""
    fi
    
    # Summary
    printf "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
    printf "${BLUE}Summary:${NC}\n"
    printf "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
    printf "  ${GREEN}Valid pairs:${NC}        $valid_pairs\n"
    printf "  ${RED}Undocumented:${NC}       $missing_both\n"
    printf "  ${YELLOW}Missing AGENTS.md:${NC}  $missing_agents\n"
    printf "  ${YELLOW}Missing README.md:${NC}  $missing_readme\n"
}

#=============================================================================
# Main
#=============================================================================

if [ "$MODE" = "staged" ]; then
    # Get staged files
    STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACMR 2>/dev/null || echo "")
    
    if [ -z "$STAGED_FILES" ]; then
        exit 0
    fi
    
    # Check all staged markdown files
    for file in $STAGED_FILES; do
        if [[ "$file" == */README.md ]] || [[ "$file" == */AGENTS.md ]]; then
            check_staged_pair "$file"
        fi
    done
    
    if [ $ERRORS -eq 1 ]; then
        printf "\n${YELLOW}Hint:${NC} Review and stage the paired file, or use 'git commit --no-verify' to skip.\n"
        printf "See AGENTS.md 'Paired Documentation Rule' for details.\n\n"
        # Warning only - don't block commit
        exit 0
    fi
else
    # Check all directories
    check_all_pairs
    
    if [ $ERRORS -eq 1 ]; then
        printf "\n${YELLOW}Hint:${NC} Create missing paired files to maintain documentation consistency.\n"
        printf "See AGENTS.md 'Paired Documentation Rule' for details.\n\n"
        exit 1
    else
        printf "\n${GREEN}✓ All documentation pairs are complete${NC}\n"
    fi
fi

exit 0
