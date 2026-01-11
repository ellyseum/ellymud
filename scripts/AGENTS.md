# Scripts - LLM Context

## Overview

This directory contains shell scripts for project automation. These are standalone bash scripts that handle setup, validation, and maintenance tasks that aren't suitable for the Makefile system.

## File Reference

### `bootstrap.sh`

**Purpose**: Complete fresh system setup for new developers or CI environments.

**What it does**:

1. Checks system requirements (git, curl, make)
2. Ensures Node.js 20.19+ and npm are installed
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

### `pipeline-artifacts-list.sh`

**Purpose**: List all pipeline artifacts in the `.github/agents` directory with metadata.

**What it does**:

1. Scans `.github/agents` directories for artifact files
2. Groups and lists artifacts by type (research, planning, implementation, validation, metrics, suggestions, documentation)
3. Outputs file paths with date and type information

**Usage**:

```bash
# List all artifacts
./scripts/pipeline-artifacts-list.sh

# Filter by type
./scripts/pipeline-artifacts-list.sh --type=research

# JSON output for scripting
./scripts/pipeline-artifacts-list.sh --json
```

**Options**:

- `--type=TYPE` - Filter by artifact type (research, planning, implementation, validation, metrics, suggestions, documentation)
- `--json` - Output in JSON format for programmatic consumption
- `--help` - Show help message

**Exit codes**:

- `0`: Success

### `sync-to-hub.sh`

**Purpose**: Push local pipeline artifacts to a hub codespace for sharing across environments.

**What it does**:

1. Verifies GitHub CLI is installed and authenticated
2. Finds and starts the hub codespace if needed
3. Lists local artifacts to sync
4. Copies artifacts to hub codespace via `gh codespace cp`
5. Stops the codespace (unless `--no-stop`)
6. Reports sync summary

**Usage**:

```bash
# Sync to default hub
./scripts/sync-to-hub.sh

# Preview what would be synced
./scripts/sync-to-hub.sh --dry-run

# Sync to specific hub
./scripts/sync-to-hub.sh --hub=my-hub-codespace
```

**Options**:

- `--dry-run` - Preview changes without actually syncing
- `--hub=NAME` - Hub codespace name (default: `$PIPELINE_HUB_CODESPACE` or `ellymud-pipeline-hub`)
- `--no-stop` - Don't stop the codespace after sync
- `--help` - Show help message

**Environment Variables**:

- `PIPELINE_HUB_CODESPACE` - Default hub codespace name

**Exit codes**:

- `0`: Success
- `1`: GitHub CLI not installed, not authenticated, or codespace not found

**Requirements**:

- `gh` - GitHub CLI (install: https://cli.github.com/)
- GitHub authentication (`gh auth login`)
- Access to the target codespace

### `sync-from-hub.sh`

**Purpose**: Pull pipeline artifacts from a hub codespace to local development.

**What it does**:

1. Verifies GitHub CLI is installed and authenticated
2. Finds and starts the hub codespace if needed
3. Lists remote artifacts on hub
4. Copies artifacts from hub to local via `gh codespace cp`
5. Stops the codespace (unless `--no-stop`)
6. Reports sync summary

**Usage**:

```bash
# Sync from default hub
./scripts/sync-from-hub.sh

# Preview what would be synced
./scripts/sync-from-hub.sh --dry-run

# Force overwrite local files
./scripts/sync-from-hub.sh --force
```

**Options**:

- `--dry-run` - Preview changes without actually syncing
- `--hub=NAME` - Hub codespace name (default: `$PIPELINE_HUB_CODESPACE` or `ellymud-pipeline-hub`)
- `--no-stop` - Don't stop the codespace after sync
- `--force` - Overwrite local files even if they are newer
- `--help` - Show help message

**Environment Variables**:

- `PIPELINE_HUB_CODESPACE` - Default hub codespace name

**Exit codes**:

- `0`: Success
- `1`: GitHub CLI not installed, not authenticated, or codespace not found

**Requirements**:

- `gh` - GitHub CLI (install: https://cli.github.com/)
- GitHub authentication (`gh auth login`)
- Access to the target codespace

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

| Stage    | Avg Duration | Avg Grade | Failure Rate |
| -------- | ------------ | --------- | ------------ |
| Research | 3.2 min      | A- (89)   | 5%           |

...
```

**Exit codes**:

- `0`: Success (report generated or no data)
- `1`: Missing jq dependency

### `data-migrate.ts`

**Purpose**: Bidirectional migration tool for data between JSON files and database (SQLite/PostgreSQL).

**Commands**:
- `status` - Show current backend configuration and data counts
- `export` - Export database → JSON files
- `import` - Import JSON files → database
- `backup` - Create timestamped backup of all data
- `switch <target>` - Switch to target backend (json|sqlite|postgres)

**Entities migrated**:
- Users (`users.json` ↔ `users` table)
- Rooms (`rooms.json` ↔ `rooms` table)
- Items (`items.json` ↔ `item_templates` table)
- Item Instances (`itemInstances.json` ↔ `item_instances` table)
- NPCs (`npcs.json` ↔ `npc_templates` table)

**NPC Template Table Schema**:
```sql
CREATE TABLE npc_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  health INTEGER NOT NULL,
  max_health INTEGER NOT NULL,
  damage_min INTEGER NOT NULL,
  damage_max INTEGER NOT NULL,
  is_hostile INTEGER NOT NULL DEFAULT 0,
  is_passive INTEGER NOT NULL DEFAULT 0,
  experience_value INTEGER NOT NULL DEFAULT 50,
  attack_texts TEXT NOT NULL,  -- JSON array
  death_messages TEXT NOT NULL, -- JSON array
  merchant INTEGER,            -- nullable boolean
  inventory TEXT,              -- nullable JSON array
  stock_config TEXT            -- nullable JSON array
);
```

**Usage**:
```bash
npx ts-node scripts/data-migrate.ts status
npx ts-node scripts/data-migrate.ts import --force
npx ts-node scripts/data-migrate.ts export
npx ts-node scripts/data-migrate.ts switch sqlite
```

### `migrate-room-state.ts`

**Purpose**: Split existing room data into templates (static) and state (mutable).

**What it does**:

1. Reads existing `rooms.json`
2. Extracts mutable state (items, NPCs, currency) into `room_state.json`
3. Optionally cleans `rooms.json` to contain only template data

**Usage**:

```bash
# Dry run - see what would change
npx ts-node scripts/migrate-room-state.ts --dry-run

# Create room_state.json from existing data
npx ts-node scripts/migrate-room-state.ts

# Also remove state fields from rooms.json
npx ts-node scripts/migrate-room-state.ts --clean-templates
```

**Options**:

- `--dry-run` - Show what would be done without writing files
- `--clean-templates` - Remove state fields from rooms.json (creates backup first)

**Output files**:

- `data/room_state.json` - Extracted state data
- `data/rooms.json.backup` - Backup before cleaning (if --clean-templates used)

**State fields extracted**:

| Field | Type | Description |
|-------|------|-------------|
| `roomId` | string | Links to room template |
| `itemInstances` | array | Items in room (instanceId → templateId) |
| `npcTemplateIds` | string[] | NPCs to spawn in room |
| `currency` | object | Gold/silver/copper on floor |
| `items` | string[] | Legacy items (deprecated) |

**Sample output**:

```
=== Room State Migration Script ===

Mode: LIVE
Clean templates: false

Loaded 45 rooms from data/rooms.json

State summary:
  Total rooms: 45
  Rooms with state data: 12

Sample state entries:
  - town-square: 2 items, 3 NPCs, 100g/50s/25c
  - tavern: 5 items, 1 NPCs, 0g/0s/0c
  ... and 10 more

✓ Created data/room_state.json

=== Migration Complete ===
```

### `migrate-json-to-sqlite.ts`

**Purpose**: Legacy one-time migration script (superseded by `data-migrate.ts`).

**What it does**:

1. Connects to (or creates) `data/game.db`
2. Creates `users` and `rooms` tables using Kysely schema builder
3. Reads `data/users.json` and migrates all users
4. Reads `data/rooms.json` and migrates all rooms
5. Reports migration statistics

**Usage**:

```bash
npx ts-node scripts/migrate-json-to-sqlite.ts
```

**Requirements**:

- `ts-node` - TypeScript execution
- `better-sqlite3` - Native SQLite bindings
- `kysely` - Query builder

**Data transformations**:

- `passwordHash` → `password_hash` (snake_case)
- `maxHealth` → `max_health` (snake_case)
- `equipment` object → JSON string
- `inventory.items` → `inventory_items` (JSON string)
- `inventory.currency.gold` → `inventory_gold` (flattened)
- Boolean fields → 0/1 integers
- Date objects → ISO 8601 strings

**Output example**:

```
=== EllyMUD JSON to SQLite Migration ===

Database: /path/to/data/game.db

Creating tables...
Tables created.

Migrating users...
Migrated 15 users.

Migrating rooms...
Migrated 42 rooms.

=== Migration Complete ===
Users: 15 | Rooms: 42 | Database: /path/to/data/game.db
```

**Exit codes**:

- `0`: Success
- `1`: Missing JSON files or migration error

**Idempotency**: Uses `INSERT ... ON CONFLICT DO NOTHING` so safe to run multiple times.

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
- [src/data/](../src/data/) - Database schema and connection used by migration script
- [data/](../data/) - Contains game.db output and source JSON files
