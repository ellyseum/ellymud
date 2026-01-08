# Make Shards - LLM Context

## Overview

This directory contains modular Makefile definitions, organized by functionality ("shards"). The root `Makefile` includes all shards via `include make/*.mk`.

## Directory Structure

```
make/
├── README.md       # Human documentation
├── AGENTS.md       # This file (LLM context)
├── config.mk       # Shared variables, paths, colors
├── setup.mk        # Bootstrap, install, environment
├── dev.mk          # Development workflow + watch
├── build.mk        # TypeScript compilation + linting
├── server.mk       # Server start/stop/status/health
├── test.mk         # Testing and validation
├── agents.mk       # Agent ecosystem tests
├── artifacts.mk    # Pipeline artifact listing and sync
├── docker.mk       # Docker and deployment
├── utils.mk        # Cleaning, logs, backups
└── docs.mk         # Documentation tasks
```

## How Shards Work

The root `Makefile` uses `include` to pull in all shards:

```makefile
# Root Makefile
include make/config.mk    # Must be first (defines variables)
include make/setup.mk
include make/dev.mk
# ... etc
```

### config.mk - Shared Variables

All shards use these variables from `config.mk`:

```makefile
PROJECT_ROOT := $(shell pwd)
SCRIPTS_DIR := $(PROJECT_ROOT)/scripts
AGENT_TESTS_DIR := $(PROJECT_ROOT)/.github/agents/agent-tests

# Colors
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[1;33m
RED := \033[0;31m
NC := \033[0m

# Directories
DATA_DIR := data
LOGS_DIR := logs
DIST_DIR := dist
```

## Target Format

Each target should have a `## Comment` for the help system:

```makefile
.PHONY: my-target

my-target: ## Short description shown in help
	@printf "$(BLUE)Doing something...$(NC)\n"
	actual-command-here
```

The `##` comment is parsed by `make help` to display all available targets.

**Note**: Always use `printf` instead of `echo` for colored output to ensure proper escape sequence handling.

## Shard Contents

### setup.mk

- `bootstrap` - Full system bootstrap via `./scripts/bootstrap.sh`
- `setup` - Quick setup (install + env)
- `install` - npm install
- `init-data` - Create data directories
- `env-setup` - Create .env from .env.example
- `setup-hooks` - Install git pre-commit hooks (husky)

### dev.mk

- `dev` - Start dev server with hot reload
- `dev-admin` - Dev server with admin auto-login
- `dev-user` - Dev server with user prompt
- `watch` - Watch TypeScript files for changes

### build.mk

- `build` - Compile TypeScript
- `build-clean` - Clean + build
- `build-watch` - Build in watch mode
- `typecheck` - tsc --noEmit
- `compile` - Alias for build
- `lint` - Run ESLint
- `lint-fix` - ESLint with auto-fix
- `format` - Format with Prettier
- `format-check` - Check formatting
- `lint-all` - Combined lint + format check
- `clean-npm` - Remove node_modules
- `outdated` - Check for outdated dependencies
- `deps-check` - Check for unused dependencies
- `info` - Show project info

### server.mk

- `start`, `start-admin`, `start-user` - Start server variants
- `start-bg` - Start in background
- `stop` - Stop background server
- `restart` - Stop + start
- `status` - Check if server is running (ports check)
- `health` - Check server health via MCP endpoint

### test.mk

- `test` - Run all tests
- `test-build` - Test build completes
- `test-start` - Test server starts
- `validate` - Validate JSON data files
- `check` - typecheck + validate
- `ci` - Full CI pipeline (lint, typecheck, validate, build)

### agents.mk

- `agent-test` - Run all agent tests
- `agent-test-dry` - Dry-run mode
- `agent-test-list` - List test IDs
- `agent-validate` - Check naming convention
- `agent-research`, `agent-planning`, etc. - Per-agent tests

### artifacts.mk

- `artifact-list` - List all pipeline artifacts with metadata
- `artifact-push` - Sync artifacts TO hub codespace
- `artifact-pull` - Sync artifacts FROM hub codespace
- `artifact-push-dry` - Preview push (dry run)
- `artifact-pull-dry` - Preview pull (dry run)

**Environment Variables**:
- `PIPELINE_HUB_CODESPACE` - Default hub codespace name (default: `ellymud-pipeline-hub`)

**Usage examples**:

```bash
# List all artifacts
make artifact-list

# Preview what would be synced
make artifact-push-dry

# Sync to hub
make artifact-push

# Pull from hub
make artifact-pull
```

### docker.mk

- `docker-build` - Build Docker image (uses Dockerfile)
- `docker-run` - Run Docker container
- `docker-stop` - Stop Docker container
- `docker-logs` - Show container logs
- `docker-shell` - Open shell in container
- `deploy-check` - Pre-deployment validation
- `prod-start` - Production mode (builds first)

### utils.mk

- `clean`, `clean-dist`, `clean-logs`, `clean-all`
- `logs`, `logs-follow` - View system logs
- `logs-error`, `logs-error-follow` - View error logs
- `logs-mcp`, `logs-mcp-follow` - View MCP logs
- `backup-data` - Create timestamped backup
- `reset-data` - Reset to defaults (destructive)

### docs.mk

- `docs-serve` - Show docs directory
- `docs-check` - Check for broken links
- `docs-list` - List all AGENTS.md files

## Adding a New Shard

1. Create `make/newshard.mk`
2. Add `.PHONY` declarations
3. Add targets with `## Description` comments
4. Add `include make/newshard.mk` to root Makefile
5. Add section to `make help` in root Makefile

## Common Patterns

### Colored output (use printf, not echo!)

```makefile
my-target:
	@printf "$(BLUE)Starting...$(NC)\n"
	@printf "$(GREEN)Done!$(NC)\n"
	@printf "$(RED)Error!$(NC)\n"
	@printf "$(YELLOW)Warning...$(NC)\n"
```

### Conditional execution

```makefile
env-setup:
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
	fi
```

### Dependencies

```makefile
build-clean: clean-dist build  # Runs clean-dist first, then build
```

## npm Script Naming Convention

All npm scripts use **hyphen-separated** names for consistency with Make targets:

- `npm run dev-admin` (not `dev:admin`)
- `npm run lint-fix` (not `lint:fix`)
- `npm run test-agents` (not `test:agents`)

## Docker Support

A `Dockerfile` is provided in the project root for production deployments:

- Multi-stage build for optimized images
- Non-root user for security
- Health check via MCP endpoint
- Volume mounts for data and logs persistence

## Related

- Root Makefile: [`../Makefile`](../Makefile)
- Bootstrap script: [`../scripts/bootstrap.sh`](../scripts/bootstrap.sh)
- Root AGENTS.md: [`../AGENTS.md`](../AGENTS.md)
- Dockerfile: [`../Dockerfile`](../Dockerfile)
