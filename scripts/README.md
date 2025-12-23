# Scripts

Shell scripts for project setup, maintenance, and automation tasks.

## Contents

| File | Description |
|------|-------------|
| `bootstrap.sh` | Fresh system setup - installs dependencies and configures environment |
| `check-paired-docs.sh` | Validates README.md and AGENTS.md pairs across all directories |
| `generate-pipeline-report.sh` | Generates markdown report from agent pipeline metrics |

## Usage

### Bootstrap (New Setup)

Run once after cloning the repository to set up everything:

```bash
./scripts/bootstrap.sh
```

Options available: `--skip-node`, `--skip-deps`, `--skip-env`, `--minimal`, `--help`

### Documentation Validation

Recursively scan all directories for missing documentation pairs:

```bash
./scripts/check-paired-docs.sh --all
```

Reports undocumented directories (missing both files) prominently at the top, then partial pairs (missing one file).

Used by pre-commit hooks to validate staged files:

```bash
./scripts/check-paired-docs.sh --staged
```

### Pipeline Report Generation

Generate a markdown summary of agent pipeline execution metrics:

```bash
./scripts/generate-pipeline-report.sh
```

Output: `.github/agents/metrics/pipeline-report.md`

Custom output path:

```bash
./scripts/generate-pipeline-report.sh ./my-report.md
```

Requires `jq` for JSON parsing.

## Related

- [Makefile](../Makefile) - Uses these scripts via make targets
- [make/setup.mk](../make/setup.mk) - Bootstrap integration
- [make/docs.mk](../make/docs.mk) - Documentation validation targets
