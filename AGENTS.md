# EllyMUD - LLM Context & Core Conventions

> **This is the single source of truth** for core conventions and navigation to detailed context.

## ⚠️ CRITICAL: Paired Documentation Rule

**STOP! Before editing ANY `README.md` or `AGENTS.md` file:**

README.md and AGENTS.md in the same directory **MUST be updated together**.

```
✅ CORRECT: Edit both make/README.md AND make/AGENTS.md
❌ WRONG:   Edit only make/AGENTS.md (forgetting README.md)
```

| When you edit... | You MUST also edit... |
|------------------|----------------------|
| `foo/README.md` | `foo/AGENTS.md` |
| `foo/AGENTS.md` | `foo/README.md` |

This rule exists because:
- README.md = for humans (brief, no code)
- AGENTS.md = for LLMs (detailed, with code)
- Both must stay synchronized

**A pre-commit hook will warn you, but YOU must remember this rule.**

---

## ⚠️ CRITICAL: Terminal Command Best Practices

**STOP re-running commands blindly!** Always check output before retrying.

### After Running a Terminal Command

1. **Check the output first** using `execute/terminalLastCommand` (`terminal_last_command`) tool
2. **Read the exit code** - 0 means success, non-zero means error
3. **Only re-run if** there was an actual error that needs retry

```
✅ CORRECT workflow:
   1. execute/runInTerminal (run_in_terminal) → command executes
   2. execute/terminalLastCommand (terminal_last_command) → read the output
   3. Analyze results → decide next action

❌ WRONG workflow:
   1. execute/runInTerminal (run_in_terminal) → command executes
   2. execute/runInTerminal (run_in_terminal) → same command again
   3. execute/runInTerminal (run_in_terminal) → same command again (spamming!)
```

### Available Tools for Terminal Output

| Tool Alias | Actual Tool | When to Use |
|------------|-------------|-------------|
| `execute/terminalLastCommand` | `terminal_last_command` | Get output, exit code, and directory of last command |
| `execute/getTerminalOutput` | `get_terminal_output` | Get output from a specific terminal by ID |

### Common Mistakes to Avoid

- ❌ Re-running commands without checking if they succeeded
- ❌ Assuming a command failed because output wasn't immediately visible
- ❌ Running multiple terminal commands in rapid succession without reading results
- ✅ Slow down, check output, then decide next action

---

## Project Overview

EllyMUD is a Node.js/TypeScript Multi-User Dungeon (MUD) supporting Telnet (port 8023) and WebSocket (port 8080) connections. An MCP server runs on port 3100 for AI integration.

- **Entry Point**: `src/server.ts` → `src/app.ts` (GameServer class)
- **State Machine**: `src/state/stateMachine.ts` manages client states
- **Flow**: ConnectingState → LoginState → AuthenticatedState

## Architecture at a Glance

```
GameServer (src/app.ts)
├── Servers: Telnet, WebSocket, API, MCP
├── Managers: Client, User, Room, GameTimer (singletons)
├── StateMachine: Connecting → Login → Authenticated
├── CommandHandler → CommandRegistry
└── CombatSystem (event-driven)
```

## Quick Start

### Fresh System Bootstrap
```bash
./scripts/bootstrap.sh     # Full setup from scratch
make help                  # Show all available commands
```

### Daily Development
```bash
make dev                   # Start dev server with hot reload
make build                 # Compile TypeScript
make test                  # Run tests
make agent-test            # Run agent tests
```

### Using npm directly
```bash
npm start                          # Standard start
npm start -- -a                    # Admin auto-login
npm start -- --forceSession=user   # Login as specific user
npm run dev                        # Development with hot reload
```

---

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

---

## Documentation Requirements

**ALWAYS** update documentation when making changes:

| Change | Update |
|--------|--------|
| New command | `docs/commands.md` + `src/command/commands/AGENTS.md` |
| New directory | Create `README.md` + `AGENTS.md` |
| Architecture change | Relevant `AGENTS.md` files |
| API change | `src/mcp/README.md` |

### Documentation Standards

- `README.md`: Human-readable overview, no code blocks, clear and concise
- `AGENTS.md`: Comprehensive with code examples, for LLMs

See **"CRITICAL: Paired Documentation Rule"** at the top of this file.

---

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

---

## Testing Checklist

Before committing:
- [ ] `npm run build` completes (ignore exit code if no errors shown)
- [ ] Server starts: `npm start`
- [ ] Basic commands work: look, move, stats
- [ ] No errors in error logs

---

## Context Index

Find detailed information in these AGENTS.md files:

### Core Systems

| System | Location | What You'll Find |
|--------|----------|------------------|
| **Commands** | [src/command/AGENTS.md](src/command/AGENTS.md) | Command parsing, registry, handler |
| **Command Implementations** | [src/command/commands/AGENTS.md](src/command/commands/AGENTS.md) | All 40+ commands, how to add new ones |
| **Combat** | [src/combat/AGENTS.md](src/combat/AGENTS.md) | Combat mechanics, damage, NPC AI |
| **States** | [src/states/AGENTS.md](src/states/AGENTS.md) | Client states, login flow, game states |
| **Rooms** | [src/room/AGENTS.md](src/room/AGENTS.md) | Room navigation, exits, contents |
| **Users** | [src/user/AGENTS.md](src/user/AGENTS.md) | Authentication, stats, inventory |

### Infrastructure

| System | Location | What You'll Find |
|--------|----------|------------------|
| **Connections** | [src/connection/AGENTS.md](src/connection/AGENTS.md) | Telnet, WebSocket, Virtual connections |
| **Servers** | [src/server/AGENTS.md](src/server/AGENTS.md) | Server components, shutdown |
| **Utilities** | [src/utils/AGENTS.md](src/utils/AGENTS.md) | **socketWriter (CRITICAL)**, colors, logger |
| **MCP Server** | [src/mcp/AGENTS.md](src/mcp/AGENTS.md) | AI integration API |

### Data & Config

| System | Location | What You'll Find |
|--------|----------|------------------|
| **Game Data** | [data/AGENTS.md](data/AGENTS.md) | JSON files, persistence, data formats |
| **Documentation** | [docs/AGENTS.md](docs/AGENTS.md) | Human-readable docs index |

### Supporting Systems

| System | Location |
|--------|----------|
| Admin API | [src/admin/AGENTS.md](src/admin/AGENTS.md) |
| Client Manager | [src/client/AGENTS.md](src/client/AGENTS.md) |
| Console Interface | [src/console/AGENTS.md](src/console/AGENTS.md) |
| Effects System | [src/effects/AGENTS.md](src/effects/AGENTS.md) |
| Game Timer | [src/timer/AGENTS.md](src/timer/AGENTS.md) |
| State Machine | [src/state/AGENTS.md](src/state/AGENTS.md) |

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `src/app.ts` | Main GameServer class |
| `src/types.ts` | Core TypeScript types |
| `src/config.ts` | Server configuration |
| `src/utils/socketWriter.ts` | **MUST use for all output** |
| `src/utils/colors.ts` | ANSI color formatting |

---

## MCP Server

AI integration server on port 3100:

- **Config**: `.vscode/mcp.json`
- **API Key**: `MCP_API_KEY` environment variable  
- **Full docs**: `src/mcp/README.md`

---

## Common Tasks

| Task | Start Here |
|------|------------|
| Add a command | [src/command/commands/AGENTS.md](src/command/commands/AGENTS.md) |
| Modify combat | [src/combat/AGENTS.md](src/combat/AGENTS.md) |
| Change login flow | [src/states/AGENTS.md](src/states/AGENTS.md) |
| Add room features | [src/room/AGENTS.md](src/room/AGENTS.md) |
| Modify user stats | [src/user/AGENTS.md](src/user/AGENTS.md) |
| Add MCP endpoint | [src/mcp/AGENTS.md](src/mcp/AGENTS.md) |

---

## Agent Ecosystem

Specialized agents are available in `.github/agents/`:

| Agent | Purpose |
|-------|---------|
| Research | Codebase investigation |
| Plan | Implementation planning |
| Implementation | Execute plans |
| Validation | Verify implementations |
| Documentation Updater | Maintain README/AGENTS files |

See [.github/agents/AGENTS.md](.github/agents/AGENTS.md) for full agent documentation.
