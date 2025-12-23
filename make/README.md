# Make Shards

Modular Makefile definitions organized by functionality. The root `Makefile` includes all shards to provide a unified command interface.

## Structure

| File        | Purpose                                         |
| ----------- | ----------------------------------------------- |
| `config.mk` | Shared variables, paths, and ANSI colors        |
| `setup.mk`  | Bootstrap, install, and environment setup       |
| `dev.mk`    | Development workflow commands and file watching |
| `build.mk`  | TypeScript compilation and linting              |
| `server.mk` | Server start, stop, status, and health checks   |
| `test.mk`   | Testing and validation commands                 |
| `agents.mk` | Agent ecosystem and MCP tests                   |
| `docker.mk` | Docker build and deployment                     |
| `utils.mk`  | Cleaning, log viewing, and backup utilities     |
| `docs.mk`   | Documentation generation tasks                  |

## Usage

All targets are available via the root `Makefile`. Run `make help` for a complete list:

```bash
make help           # Show all available targets with descriptions
```

### Common Workflows

**Development:**

```bash
make dev            # Start dev server with hot reload
make watch          # Watch TypeScript files for changes
make build          # Compile TypeScript to JavaScript
make lint           # Run ESLint on source files
```

**Server Management:**

```bash
make start          # Start the server
make stop           # Stop the server
make restart        # Restart the server
make status         # Check server status
make health         # Health check via API
```

**Testing:**

```bash
make test           # Run all tests
make agent-test     # Run agent ecosystem tests
```

**Utilities:**

```bash
make logs           # View recent system logs
make logs-error     # View recent error logs
make logs-mcp       # View recent MCP server logs
make clean          # Clean build artifacts
make backup         # Create data backup
make outdated       # Check for outdated npm packages
```

## Adding New Targets

1. Choose the appropriate shard file based on functionality
2. Add your target with a `## Description` comment (enables `make help`)
3. Add `.PHONY` declaration if the target doesn't create a file
4. Use `printf` with colors for user-friendly output

Example:

```makefile
.PHONY: my-target

my-target: ## Description shown in make help
	@printf "$(BLUE)Running my-target...$(NC)\n"
	@npm run my-script
	@printf "$(GREEN)Done!$(NC)\n"
```

## npm Script Convention

All npm scripts use hyphen-separated names (`dev-admin`, not `dev:admin`) for consistency with Make targets and shell compatibility.

## Related

- [Makefile](../Makefile) - Root Makefile that includes all shards
- [package.json](../package.json) - npm scripts called by Make targets
- [scripts/](../scripts/) - Shell scripts for complex operations
