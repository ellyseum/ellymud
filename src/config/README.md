# CLI Configuration

Command-line argument parsing for server startup options.

## Contents

| File           | Description                      |
| -------------- | -------------------------------- |
| `cliConfig.ts` | Parse and validate CLI arguments |

## Quick Reference

### Session Control

| Flag                    | Description                                   |
| ----------------------- | --------------------------------------------- |
| `-a`, `--adminSession`  | Auto-login as admin (recommended for testing) |
| `-u`, `--userSession`   | Auto-login as normal user                     |
| `--forceSession=<user>` | Auto-login as specific user                   |
| `-f`, `--force`         | Force create admin with default password      |

### Data Override

| Flag                     | Description               |
| ------------------------ | ------------------------- |
| `-d`, `--dataDir=<path>` | Custom data directory     |
| `--roomsFile=<path>`     | Override rooms file       |
| `--usersFile=<path>`     | Override users file       |
| `--rooms='[...]'`        | Pass rooms as JSON string |
| `--users='[...]'`        | Pass users as JSON string |

### Server Options

| Flag                      | Description                    |
| ------------------------- | ------------------------------ |
| `-p`, `--port=<number>`   | Telnet port (default: 8023)    |
| `-w`, `--wsPort=<number>` | WebSocket port (default: 8080) |
| `--logLevel=<level>`      | debug, info, warn, error       |
| `--debug`                 | Enable debug mode              |
| `-s`, `--silent`          | Suppress console output        |
| `-c`, `--noConsole`       | Disable interactive console    |

## Usage Examples

```bash
# Standard start
npm start

# Auto-login as admin (fastest for testing)
npm start -- -a

# Login as specific user
npm start -- --forceSession=testuser

# Headless background mode
npm start -- --noConsole --silent &

# Custom port with debug
npm start -- --port=9000 --debug

# Use test data directory
npm start -- -a --dataDir=./test/fixtures
```

## How It Works

1. `cliConfig.ts` parses `process.argv` via yargs
2. Configuration object is exported
3. `app.ts` and `console/` modules read config
4. Auto-session handler creates session if needed

See [AGENTS.md](AGENTS.md) for complete flag documentation.
