# Scripts

Shell scripts and utilities for project setup, maintenance, data migration, and automation tasks.

For technical details, command syntax, and examples, see [AGENTS.md](AGENTS.md).

## Contents

| File                          | Description                                                           |
| ----------------------------- | --------------------------------------------------------------------- |
| `bootstrap.sh`                | Fresh system setup - installs dependencies and configures environment |
| `check-paired-docs.sh`        | Validates README.md and AGENTS.md pairs across all directories        |
| `generate-pipeline-report.sh` | Generates markdown report from agent pipeline metrics                 |
| `migrate-json-to-sqlite.ts`   | Migrates user and room data from JSON files to SQLite database        |

## Purpose

### Bootstrap Script

Sets up a fresh development environment. Run once after cloning the repository. Supports options for skipping specific setup steps.

### Database Migration

Converts existing JSON data files (users.json, rooms.json) to the SQLite database format. Creates data/game.db with all records. Safe to run multiple times as it uses upsert logic.

### Documentation Validation

Scans directories for missing or incomplete documentation pairs. Used by pre-commit hooks to ensure README.md and AGENTS.md files are kept in sync.

### Pipeline Report Generation

Aggregates agent pipeline execution metrics into a readable summary report.

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
