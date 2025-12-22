# EllyMUD Copilot Instructions

> **Note**: For detailed context on specific systems, see the `AGENTS.md` files in each directory.
> This file contains only core conventions and rules that apply globally.

## Project Overview

EllyMUD is a Node.js/TypeScript Multi-User Dungeon (MUD) supporting Telnet (port 8023) and WebSocket (port 8080) connections. An MCP server runs on port 3100 for AI integration.

- **Entry Point**: `src/server.ts` → `src/app.ts` (GameServer class)
- **State Machine**: `src/state/stateMachine.ts` manages client states
- **Flow**: ConnectingState → LoginState → AuthenticatedState

## Quick Start

```bash
npm start                          # Standard start
npm start -- -a                    # Admin auto-login
npm start -- --forceSession=user   # Login as specific user
npm run dev                        # Development with hot reload
```

## Core Conventions

### 1. Socket Writing (CRITICAL)

**ALWAYS** use helper functions in `src/utils/socketWriter.ts`:

```typescript
// ✅ Correct
import { writeMessageToClient } from '../utils/socketWriter';
writeMessageToClient(client, 'Hello!\r\n');

// ❌ NEVER do this - bypasses prompt management
client.connection.write('Hello!');
```

Functions:
- `writeToClient()` - Raw message, no prompt redraw
- `writeMessageToClient()` - Message with prompt redraw
- `writeFormattedMessageToClient()` - Formatted with color options

### 2. Line Endings

Always use `\r\n` for Telnet compatibility:

```typescript
// ✅ Correct
writeMessageToClient(client, 'Message\r\n');

// ❌ Incorrect
writeMessageToClient(client, 'Message\n');
```

### 3. Singleton Managers

Access managers via `getInstance()`:

```typescript
// ✅ Correct
const userManager = UserManager.getInstance();
const roomManager = RoomManager.getInstance(clients);

// ❌ Incorrect - constructors are private
const userManager = new UserManager();
```

### 4. Colors

Use `src/utils/colors.ts`. Always reset to prevent color bleeding:

```typescript
import { colorize } from '../utils/colors';
const msg = colorize('red', 'Error!') + ' Something went wrong\r\n';
```

### 5. State Data

Use state methods when available, avoid direct modification:

```typescript
// ✅ Use state methods
state.setPhase(client, 'password');

// ❌ Avoid direct modification
client.stateData.phase = 'password';
```

### 6. Async/Await

Use async/await for all I/O with try/catch:

```typescript
try {
  await userManager.saveUsers();
} catch (error) {
  systemLogger.error('Save failed', { error });
}
```

### 7. Logging

Use logger utilities, never `console.log`:

```typescript
import { systemLogger, getPlayerLogger } from '../utils/logger';
systemLogger.info('Server started');
getPlayerLogger(username).info('Player action');
```

## Debugging & Logging

### Log Files
- `logs/system/system-{date}.log` - Server events
- `logs/players/{username}-{date}.log` - Player actions
- `logs/raw-sessions/{sessionId}-{date}.log` - Exact I/O
- `logs/error/error-{date}.log` - Errors
- `logs/mcp/mcp-{date}.log` - MCP server logs

### Debug Workflow
1. Identify date/time of issue
2. Find session ID in system log
3. Analyze raw session log for exact sequence
4. Use `#terminal_last_command` to see what user sees

## Documentation Requirements

**ALWAYS** update documentation when making changes:

| Change | Update |
|--------|--------|
| New command | `docs/commands.md` + `src/command/commands/AGENTS.md` |
| New directory | Create `README.md` + `AGENTS.md` |
| Architecture change | Relevant `AGENTS.md` files |
| API change | `src/mcp/README.md` |

### Documentation Standards
- `README.md`: Max 50 lines, no code, for humans
- `AGENTS.md`: Comprehensive with code examples, for LLMs

## Directory Context Reference

Each directory contains `AGENTS.md` with detailed context:

| Directory | Context |
|-----------|---------|
| `src/command/` | Command system, adding commands |
| `src/combat/` | Combat mechanics, NPC interactions |
| `src/states/` | State machine, client flow |
| `src/room/` | Room system, navigation |
| `src/user/` | User management, authentication |
| `src/utils/` | **socketWriter** (critical), colors, logger |
| `src/mcp/` | MCP server API |
| `data/` | JSON data files, persistence |

## MCP Server

AI integration server on port 3100:

- **Config**: `.vscode/mcp.json`
- **API Key**: `MCP_API_KEY` environment variable  
- **Full docs**: `src/mcp/README.md`

## Testing Checklist

Before committing:
- [ ] `npm run build` completes (ignore exit code if no errors shown)
- [ ] Server starts: `npm start`
- [ ] Basic commands work: look, move, stats
- [ ] No errors in error logs

## Key Files Reference

| File | Purpose |
|------|---------|
| `src/app.ts` | Main GameServer class |
| `src/types.ts` | Core TypeScript types |
| `src/config.ts` | Server configuration |
| `src/utils/socketWriter.ts` | **MUST use for all output** |
| `src/utils/colors.ts` | ANSI color formatting |
| `AGENTS.md` | Root context for LLMs |

---

For game mechanics (combat, NPCs, rooms, commands, items), see the `AGENTS.md` files in the relevant `src/` directories and `data/AGENTS.md`.


