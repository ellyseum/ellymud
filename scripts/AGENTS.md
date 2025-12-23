# Scripts - LLM Context

## Overview

This directory contains shell scripts for project automation. These are standalone bash scripts that handle setup, validation, and maintenance tasks that aren't suitable for the Makefile system.

## File Reference

### `bootstrap.sh`

**Purpose**: Complete fresh system setup for new developers or CI environments.

**What it does**:
1. Checks system requirements (git, curl, make)
2. Ensures Node.js 18+ and npm are installed
3. Runs `npm install` for dependencies
4. Creates `.env` file from template
5. Initializes data directories
6. Installs optional tools (jq for agent tests)
7. Verifies installation with build test

**Usage**:
```bash
# Full bootstrap
./scripts/bootstrap.sh

# Skip specific steps
./scripts/bootstrap.sh --skip-node    # Skip Node.js check
./scripts/bootstrap.sh --skip-deps    # Skip npm install
./scripts/bootstrap.sh --skip-env     # Skip .env setup
./scripts/bootstrap.sh --minimal      # Essential requirements only
```

**Exit codes**:
- `0`: Success
- `1`: Missing requirements or installation failed

**Key functions**:
- `check_command()` - Verify a command exists
- `install_node()` - Platform-specific Node.js installation
- `setup_env()` - Create .env from template
- `verify_install()` - Run build to confirm setup

### `check-paired-docs.sh`

**Purpose**: Enforce the paired documentation rule (README.md + AGENTS.md must be updated together).

**Modes**:

1. **Staged mode** (default, for git hooks):
   ```bash
   ./scripts/check-paired-docs.sh --staged
   ```
   Checks only staged files. Warns if one doc is staged without its pair.

2. **All mode** (for audits):
   ```bash
   ./scripts/check-paired-docs.sh --all
   ```
   Recursively scans entire project for directories missing README.md or AGENTS.md.

**Output example**:
```
Scanning all directories for README.md and AGENTS.md pairs...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
UNDOCUMENTED DIRECTORIES (missing both README.md and AGENTS.md):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✗ ./.devcontainer/
  ✗ ./.github/

Missing AGENTS.md (has README.md):
  ⚠ ./some-dir/

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Summary:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Valid pairs:        44
  Undocumented:       2
  Missing AGENTS.md:  1
  Missing README.md:  0
```

**Exit codes**:
- `0`: All pairs valid
- `1`: Missing pairs found

**What it checks**:
- All directories recursively (including hidden dirs like `.github/`)
- Reports directories missing BOTH files first (most critical)
- Then reports partial pairs (missing one file)

**Exclusions** (directories not checked):
- `node_modules/`
- `dist/`
- `.git/`
- `logs/`
- `backups/`
- `coverage/`
- `.husky/_/` (husky internals)
- `*/results/` (generated output directories)

**File patterns checked** (to determine if directory has content):

### `generate-pipeline-report.sh`

**Purpose**: Generate a markdown summary report from agent pipeline execution metrics.

**What it does**:
1. Reads all JSON files from `.github/agents/metrics/executions/`
2. Aggregates success/failure rates
3. Calculates stage performance averages
4. Identifies common issues
5. Generates formatted markdown report

**Usage**:
```bash
# Generate report to default location
./scripts/generate-pipeline-report.sh
# Output: .github/agents/metrics/pipeline-report.md

# Custom output path
./scripts/generate-pipeline-report.sh ./custom-report.md
```

**Requirements**:
- `jq` - JSON processor (install: `apt install jq` or `brew install jq`)

**Output sections**:
- Success Rate summary
- Stage Performance table (avg duration, grade, failure rate)
- Common Issues list
- Recent Executions table
- Complexity Distribution
- Mode Distribution

**Report format**:
```markdown
# Pipeline Metrics Summary - December 2025

## Success Rate
✅ 12 APPROVED | ❌ 3 REJECTED | 80% success

## Stage Performance
| Stage | Avg Duration | Avg Grade | Failure Rate |
|-------|-------------|-----------|--------------|
| Research | 3.2 min | A- (89) | 5% |
...
```

**Exit codes**:
- `0`: Success (report generated or no data)
- `1`: Missing jq dependency

---

**File patterns checked** (to determine if directory has content):
- `*.ts`, `*.js`, `*.json`, `*.sh`
- `*.html`, `*.css`, `*.md`
- `*.yml`, `*.yaml`
- `Makefile`, `*.mk`

## Conventions

### Script Headers

All scripts should include a header block:

```bash
#!/bin/bash
#=============================================================================
# Script Name
#
# Description of what the script does.
#
# Usage: ./scripts/script-name.sh [options]
#   --option1    Description
#   --help       Show help
#=============================================================================
```

### Error Handling

Scripts use `set -e` to exit on error. Critical operations should have explicit error handling:

```bash
set -e

# For operations that might fail gracefully
if ! some_command; then
    echo "Warning: some_command failed, continuing..."
fi
```

### Colors

Use consistent ANSI color codes defined at the top:

```bash
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'  # No Color

echo -e "${GREEN}Success${NC}"
```

## Adding New Scripts

1. Create script with proper header and `#!/bin/bash`
2. Add `set -e` for error handling
3. Include `--help` option
4. Add entry to this AGENTS.md and README.md
5. Consider adding a Makefile target in `make/utils.mk`

## Common Tasks

### Running Bootstrap on CI

```bash
# Minimal setup for CI (faster)
./scripts/bootstrap.sh --minimal --skip-env
```

### Validating Docs Before Commit

```bash
# Check everything
./scripts/check-paired-docs.sh --all

# Or use make target
make check-docs
```

## Related Context

- [make/](../make/) - Makefile shards that may call these scripts
- [.github/agents/](../.github/agents/) - Agents use check-paired-docs.sh
- [AGENTS.md](../AGENTS.md) - Documents the paired docs rule these scripts enforce
