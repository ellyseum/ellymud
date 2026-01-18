# Scripts

Shell scripts and utilities for project setup, maintenance, data migration, and automation tasks.

For technical details, command syntax, and examples, see [AGENTS.md](AGENTS.md).

## Contents

| File                          | Description                                                               |
| ----------------------------- | ------------------------------------------------------------------------- |
| `bootstrap.sh`                | Fresh system setup - installs dependencies and configures environment     |
| `check-paired-docs.sh`        | Validates README.md and AGENTS.md pairs across all directories            |
| `data-migrate.ts`             | Bidirectional migration between JSON and database (SQLite/PostgreSQL)     |
| `docker-entrypoint.sh`        | Docker entrypoint that generates MCP API key when missing                |
| `migrate-room-state.ts`       | Split room data into templates and mutable state                          |
| `generate-pipeline-report.sh` | Generates markdown report from agent pipeline metrics                     |
| `migrate-json-to-sqlite.ts`   | Legacy migration script (superseded by `data-migrate.ts`)                 |
| `pipeline-artifacts-list.sh`  | Lists all pipeline artifacts with type filtering and JSON output          |
| `sync-to-hub.sh`              | Syncs pipeline artifacts from local to hub codespace                      |
| `sync-from-hub.sh`            | Syncs pipeline artifacts from hub codespace to local                      |

## Purpose

### Bootstrap Script

Sets up a fresh development environment. Run once after cloning the repository. Supports options for skipping specific setup steps.

### Database Migration

The `data-migrate.ts` script provides bidirectional migration between JSON files and database (SQLite or PostgreSQL). It supports migrating users, rooms, items, item instances, and NPCs. Safe to run multiple times using upsert logic.

### Room State Migration

The `migrate-room-state.ts` script separates room templates (static definitions) from runtime state (items, NPCs, currency). This enables autosave of mutable data while keeping templates immutable.

**Options**:
- `--dry-run` - Preview changes without writing files
- `--clean-templates` - Remove runtime state from rooms.json
- `--extract-spawn-defaults` - Copy current state as spawn defaults in templates (for setting up respawn data)

### Documentation Validation

Scans directories for missing or incomplete documentation pairs. Used by pre-commit hooks to ensure README.md and AGENTS.md files are kept in sync.

### Docker Entrypoint

Generates a random MCP API key at container startup when one is not provided, then starts the server.

### Pipeline Report Generation

Aggregates agent pipeline execution metrics into a readable summary report.

### Pipeline Artifact Sync

A suite of scripts for synchronizing pipeline artifacts between local development and a hub codespace. Useful for multi-environment agent workflows where artifacts need to be shared.

- **List artifacts** - View all local artifacts by type
- **Push to hub** - Sync artifacts to a central hub codespace
- **Pull from hub** - Pull artifacts from hub to local

Requires GitHub CLI (`gh`) to be installed and authenticated.

## Related

- [AGENTS.md](AGENTS.md) - Detailed technical documentation with command syntax and examples
- [make/README.md](../make/README.md) - Makefile targets that invoke these scripts


Custom output path:

```bash
./scripts/generate-pipeline-report.sh ./my-report.md
```

Requires `jq` for JSON parsing.

## Related

- [Makefile](../Makefile) - Uses these scripts via make targets
- [make/setup.mk](../make/setup.mk) - Bootstrap integration
- [make/docs.mk](../make/docs.mk) - Documentation validation targets
- [src/data/](../src/data/) - Database layer that migration script populates
