# CLI Configuration - LLM Context

## Overview

Command-line argument parsing for server startup options. This is critical for testing and validation workflows.

## File Reference

### `cliConfig.ts`

**Purpose**: Parse and expose CLI arguments via yargs

```typescript
export interface CLIConfig {
  // Session flags
  adminSession: boolean;          // -a flag
  userSession: boolean;           // -u flag
  forceSession: string | null;    // --forceSession=username
  force: boolean;                 // -f flag
  
  // Security flags
  disableRemoteAdmin: boolean;    // -r flag
  
  // Data directory flags
  dataDir: string;                // -d, --dataDir
  roomsFile: string;              // --roomsFile
  usersFile: string;              // --usersFile
  itemsFile: string;              // --itemsFile
  npcsFile: string;               // --npcsFile
  mudConfigFile: string;          // --mudConfigFile
  
  // Direct data input (JSON strings)
  rooms: string | null;           // --rooms
  users: string | null;           // --users
  items: string | null;           // --items
  npcs: string | null;            // --npcs
  
  // Server options
  port: number;                   // -p, --port (telnet)
  wsPort: number;                 // -w, --wsPort
  httpPort: number | null;        // --httpPort
  logLevel: string;               // -l, --logLevel
  noColor: boolean;               // -n, --noColor
  silent: boolean;                // -s, --silent
  noConsole: boolean;             // -c, --noConsole
  debug: boolean;                 // --debug
}
```

## Complete CLI Flags Reference

### Session Flags (for Testing)
| Flag | Alias | Description |
|------|-------|-------------|
| `--adminSession` | `-a` | Start with admin auto-login (RECOMMENDED for testing) |
| `--userSession` | `-u` | Start with normal user session |
| `--forceSession=NAME` | | Login as specific existing user |
| `--force` | `-f` | Force create admin user with default password |

### Security Flags
| Flag | Alias | Description |
|------|-------|-------------|
| `--disableRemoteAdmin` | `-r` | Disable remote admin access |

### Data Override Flags (for Isolated Testing)
| Flag | Alias | Description |
|------|-------|-------------|
| `--dataDir=PATH` | `-d` | Base directory for data files |
| `--roomsFile=PATH` | | Override rooms file |
| `--usersFile=PATH` | | Override users file |
| `--itemsFile=PATH` | | Override items file |
| `--npcsFile=PATH` | | Override npcs file |
| `--mudConfigFile=PATH` | | Override MUD config file |

### Direct JSON Data Input (for Test Fixtures)
| Flag | Description |
|------|-------------|
| `--rooms='[{...}]'` | Pass rooms as JSON string |
| `--users='[{...}]'` | Pass users as JSON string |
| `--items='[{...}]'` | Pass items as JSON string |
| `--npcs='[{...}]'` | Pass NPCs as JSON string |

### Server Options
| Flag | Alias | Default | Description |
|------|-------|---------|-------------|
| `--port=XXXX` | `-p` | 8023 | Telnet server port |
| `--wsPort=XXXX` | `-w` | 8080 | WebSocket server port |
| `--httpPort=XXXX` | | 8080 | HTTP server port |
| `--logLevel=LEVEL` | `-l` | info | debug, info, warn, error |
| `--noColor` | `-n` | false | Disable colored output |
| `--silent` | `-s` | false | Suppress all console logging |
| `--noConsole` | `-c` | false | Disable interactive console |
| `--debug` | | false | Enable debug mode |

## Common Usage Patterns

### Quick Testing (Interactive)
```bash
# Direct admin login - fastest for validation
npm start -- -a

# Login as specific user
npm start -- --forceSession=testuser
```

### Headless Testing (Background)
```bash
# Start without interactive console (for background processes)
npm start -- --noConsole --silent &
sleep 3
curl http://localhost:3100/health

# Stop when done
pkill -f "node.*dist/server.js"
```

### Isolated Test Environment
```bash
# Use custom data directory
npm start -- -a --dataDir=./test/fixtures/data

# Override specific files
npm start -- -a --roomsFile=./test/fixtures/test-rooms.json

# Pass JSON data directly (minimal test scenario)
npm start -- -a --rooms='[{"id":"test","name":"Test Room","description":"A test room","exits":{}}]'
```

### Avoid Port Conflicts
```bash
# Use non-default ports for testing
npm start -- -a --port=9023 --wsPort=9080
```

### Debug Mode
```bash
# Full debug output
npm start -- -a --debug --logLevel=debug
```

## Important Notes

1. **Auto-login flags (`-a`, `-u`, `--forceSession`) auto-enable `--silent` and `--noConsole`**
2. **When `-a` is used, the server connects you directly to an admin session**
3. **MCP server always starts on port 3100 alongside the game server**

## Related Context

- [`../console/autoSessionHandler.ts`](../console/autoSessionHandler.ts) - Handles auto-login
- [`../app.ts`](../app.ts) - Reads CLI config at startup
- [`../../.github/agents/validation-agent.agent.md`](../../.github/agents/validation-agent.agent.md) - Uses CLI for validation testing
