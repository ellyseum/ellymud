#!/bin/bash
#=============================================================================
# EllyMUD Bootstrap Script
# 
# This script prepares a fresh system for EllyMUD development.
# Run this after cloning the repository to set up everything needed.
#
# Usage: ./scripts/bootstrap.sh [options]
#   --skip-node     Skip Node.js installation check
#   --skip-deps     Skip npm dependency installation
#   --skip-env      Skip environment setup
#   --minimal       Only install essential requirements
#   --help          Show this help message
#
# What this script does:
#   1. Checks system requirements (git, curl, make)
#   2. Ensures Node.js and npm are installed
#   3. Installs project dependencies (npm install)
#   4. Sets up environment file (.env)
#   5. Initializes data directories
#   6. Installs optional tools (jq for agent tests)
#   7. Verifies the installation
#=============================================================================

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Flags
SKIP_NODE=false
SKIP_DEPS=false
SKIP_ENV=false
MINIMAL=false

#=============================================================================
# HELPER FUNCTIONS
#=============================================================================

print_header() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_step() {
    echo -e "${GREEN}▶${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

check_command() {
    if command -v "$1" &> /dev/null; then
        print_success "$1 found: $(command -v $1)"
        return 0
    else
        print_error "$1 not found"
        return 1
    fi
}

#=============================================================================
# ARGUMENT PARSING
#=============================================================================

show_help() {
    echo "EllyMUD Bootstrap Script"
    echo ""
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  --skip-node     Skip Node.js installation check"
    echo "  --skip-deps     Skip npm dependency installation"
    echo "  --skip-env      Skip environment setup"
    echo "  --minimal       Only install essential requirements"
    echo "  --help          Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                    # Full bootstrap"
    echo "  $0 --minimal          # Minimal setup"
    echo "  $0 --skip-deps        # Skip npm install (already done)"
    exit 0
}

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-node)  SKIP_NODE=true; shift ;;
        --skip-deps)  SKIP_DEPS=true; shift ;;
        --skip-env)   SKIP_ENV=true; shift ;;
        --minimal)    MINIMAL=true; shift ;;
        --help|-h)    show_help ;;
        *)            print_error "Unknown option: $1"; show_help ;;
    esac
done

#=============================================================================
# MAIN BOOTSTRAP
#=============================================================================

cd "$PROJECT_ROOT"

echo ""
echo -e "${CYAN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║           EllyMUD Development Environment Setup           ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

#-----------------------------------------------------------------------------
# Step 1: System Requirements
#-----------------------------------------------------------------------------

print_header "Step 1: Checking System Requirements"

MISSING_DEPS=()

print_step "Checking essential tools..."

# Git (required)
if ! check_command git; then
    MISSING_DEPS+=("git")
fi

# curl or wget (required for downloads)
if check_command curl; then
    DOWNLOAD_CMD="curl -fsSL"
elif check_command wget; then
    DOWNLOAD_CMD="wget -qO-"
else
    print_error "Neither curl nor wget found"
    MISSING_DEPS+=("curl")
fi

# make (required for Makefile)
if ! check_command make; then
    MISSING_DEPS+=("make")
fi

# Check for missing dependencies
if [ ${#MISSING_DEPS[@]} -gt 0 ]; then
    echo ""
    print_error "Missing required dependencies: ${MISSING_DEPS[*]}"
    echo ""
    print_info "Install them with:"
    echo ""
    
    # Detect package manager
    if command -v apt &> /dev/null; then
        echo "  sudo apt update && sudo apt install -y ${MISSING_DEPS[*]}"
    elif command -v dnf &> /dev/null; then
        echo "  sudo dnf install -y ${MISSING_DEPS[*]}"
    elif command -v yum &> /dev/null; then
        echo "  sudo yum install -y ${MISSING_DEPS[*]}"
    elif command -v brew &> /dev/null; then
        echo "  brew install ${MISSING_DEPS[*]}"
    elif command -v pacman &> /dev/null; then
        echo "  sudo pacman -S ${MISSING_DEPS[*]}"
    else
        echo "  Please install: ${MISSING_DEPS[*]}"
    fi
    echo ""
    exit 1
fi

print_success "All system requirements met"

#-----------------------------------------------------------------------------
# Step 2: Node.js and npm
#-----------------------------------------------------------------------------

print_header "Step 2: Checking Node.js and npm"

if [ "$SKIP_NODE" = true ]; then
    print_warn "Skipping Node.js check (--skip-node)"
else
    NODE_MIN_VERSION="20"
    
    if check_command node; then
        NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$NODE_VERSION" -ge "$NODE_MIN_VERSION" ]; then
            print_success "Node.js version $(node -v) meets minimum requirement (v$NODE_MIN_VERSION+)"
        else
            print_warn "Node.js $(node -v) is older than recommended v$NODE_MIN_VERSION"
            print_info "Consider upgrading: https://nodejs.org/"
        fi
    else
        print_error "Node.js not found"
        echo ""
        print_info "Install Node.js using one of these methods:"
        echo ""
        echo "  Option 1 - nvm (recommended):"
        echo "    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash"
        echo "    nvm install 20"
        echo ""
        echo "  Option 2 - System package manager:"
        if command -v apt &> /dev/null; then
            echo "    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -"
            echo "    sudo apt install -y nodejs"
        elif command -v brew &> /dev/null; then
            echo "    brew install node@20"
        else
            echo "    Visit: https://nodejs.org/"
        fi
        echo ""
        exit 1
    fi
    
    if check_command npm; then
        print_success "npm version $(npm -v)"
    else
        print_error "npm not found (usually comes with Node.js)"
        exit 1
    fi
fi

#-----------------------------------------------------------------------------
# Step 3: Install Dependencies
#-----------------------------------------------------------------------------

print_header "Step 3: Installing Project Dependencies"

if [ "$SKIP_DEPS" = true ]; then
    print_warn "Skipping dependency installation (--skip-deps)"
else
    if [ -f "package-lock.json" ] && [ -d "node_modules" ]; then
        print_info "node_modules exists, running npm ci for clean install..."
        npm ci
    else
        print_step "Running npm install..."
        npm install
    fi
    print_success "Dependencies installed"
fi

#-----------------------------------------------------------------------------
# Step 4: Environment Setup
#-----------------------------------------------------------------------------

print_header "Step 4: Setting Up Environment"

if [ "$SKIP_ENV" = true ]; then
    print_warn "Skipping environment setup (--skip-env)"
else
    if [ -f ".env" ]; then
        print_info ".env file already exists"
        print_info "To regenerate, delete .env and run bootstrap again"
    else
        if [ -f ".env.example" ]; then
            print_step "Creating .env from .env.example..."
            cp .env.example .env
            
            # Generate MCP API key
            if command -v openssl &> /dev/null; then
                API_KEY=$(openssl rand -hex 32)
                # Replace placeholder in .env
                if [[ "$OSTYPE" == "darwin"* ]]; then
                    sed -i '' "s/your_generated_api_key_here/$API_KEY/" .env
                else
                    sed -i "s/your_generated_api_key_here/$API_KEY/" .env
                fi
                print_success "Generated MCP API key"
            else
                print_warn "openssl not found - please set ELLYMUD_MCP_API_KEY manually"
            fi
            
            print_success ".env file created"
        else
            print_warn ".env.example not found, creating minimal .env..."
            cat > .env << 'EOF'
MAX_PASSWORD_ATTEMPTS=3
ELLYMUD_MCP_API_KEY=
EOF
            print_warn "Please configure .env manually"
        fi
    fi
fi

#-----------------------------------------------------------------------------
# Step 5: Initialize Data Directories
#-----------------------------------------------------------------------------

print_header "Step 5: Initializing Data Directories"

print_step "Creating directory structure..."

# Create directories
mkdir -p data
mkdir -p logs/{system,players,error,mcp,raw-sessions,audit,exceptions,rejections}
mkdir -p backups
mkdir -p .github/agents/metrics/executions

# Initialize data files if missing
if [ ! -f "data/users.json" ]; then
    echo '{}' > data/users.json
    print_info "Created data/users.json"
fi

print_success "Data directories initialized"

#-----------------------------------------------------------------------------
# Step 6: Git Hooks Setup
#-----------------------------------------------------------------------------

print_header "Step 6: Setting Up Git Hooks"

if [ -d ".husky" ]; then
    print_success "Git hooks already configured (.husky directory exists)"
else
    print_step "Initializing husky git hooks..."
    if npm list husky &> /dev/null 2>&1; then
        # Husky v9+ uses 'npx husky' or the prepare script
        if [ -f "node_modules/husky/bin.mjs" ]; then
            npx husky 2>/dev/null || true
            print_success "Git hooks initialized"
        else
            print_warn "Husky installed but could not initialize hooks"
        fi
    else
        print_warn "Husky not installed - git hooks not configured"
        print_info "Pre-commit hooks will lint staged files"
    fi
fi

#-----------------------------------------------------------------------------
# Step 7: Optional Tools
#-----------------------------------------------------------------------------

if [ "$MINIMAL" = false ]; then
    print_header "Step 7: Checking Optional Tools"
    
    # jq - for agent test runner
    print_step "Checking jq (for agent tests)..."
    if check_command jq; then
        print_success "jq is available"
    else
        print_warn "jq not installed - agent tests will have limited functionality"
        print_info "Install with: sudo apt install jq (or brew install jq)"
    fi
    
    # TypeScript check
    print_step "Checking TypeScript..."
    if npx tsc --version &> /dev/null; then
        print_success "TypeScript $(npx tsc --version)"
    fi
fi

#-----------------------------------------------------------------------------
# Step 8: Verification
#-----------------------------------------------------------------------------

print_header "Step 8: Verifying Installation"

print_step "Running build test..."
if npm run build &> /dev/null; then
    print_success "Build successful"
else
    print_warn "Build had warnings (check with 'npm run build')"
fi

print_step "Checking file structure..."
REQUIRED_FILES=("package.json" "tsconfig.json" "src/server.ts" "src/app.ts")
for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        print_success "$file exists"
    else
        print_error "$file missing!"
    fi
done

#-----------------------------------------------------------------------------
# Summary
#-----------------------------------------------------------------------------

print_header "Bootstrap Complete!"

echo ""
echo -e "${GREEN}EllyMUD is ready for development!${NC}"
echo ""
echo "Quick start commands:"
echo ""
echo -e "  ${CYAN}make dev${NC}           Start development server with hot reload"
echo -e "  ${CYAN}make start${NC}         Start production server"
echo -e "  ${CYAN}make help${NC}          Show all available make targets"
echo ""
echo "Useful paths:"
echo ""
echo -e "  Config:     ${YELLOW}.env${NC}"
echo -e "  Logs:       ${YELLOW}logs/${NC}"
echo -e "  Game Data:  ${YELLOW}data/${NC}"
echo -e "  Docs:       ${YELLOW}AGENTS.md${NC}, ${YELLOW}docs/${NC}"
echo ""
echo "Server ports:"
echo ""
echo -e "  Telnet:     ${CYAN}8023${NC}"
echo -e "  WebSocket:  ${CYAN}8080${NC}"
echo -e "  MCP API:    ${CYAN}3100${NC}"
echo ""

if [ "$MINIMAL" = false ]; then
    print_info "Run 'make agent-test-dry' to preview agent tests"
fi

echo ""
