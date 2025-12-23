# CLI Configuration

Command-line argument parsing for server startup options.

## Contents

| File | Description |
|------|-------------|
| `cliConfig.ts` | Parse and validate CLI arguments |

## Supported Arguments

| Flag | Description |
|------|-------------|
| `-a`, `--admin` | Auto-login as admin user |
| `--forceSession=<user>` | Auto-login as specific user |
| `--port=<number>` | Override default port |
| `--debug` | Enable debug logging |
| `--help` | Show help message |

## Usage Examples

```bash
# Standard start
npm start

# Auto-login as admin
npm start -- -a

# Login as specific user
npm start -- --forceSession=testuser

# Custom port with debug
npm start -- --port=9000 --debug
```

## How It Works

1. `cliConfig.ts` parses `process.argv`
2. Configuration object is exported
3. `app.ts` and `console/` modules read config
4. Auto-session handler creates session if needed

## Related

- [src/console/autoSessionHandler.ts](../console/autoSessionHandler.ts) - Uses CLI args for auto-login
- [src/app.ts](../app.ts) - Reads CLI configuration
- [package.json](../../package.json) - npm scripts with CLI args
