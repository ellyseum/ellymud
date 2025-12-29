# Source Code - LLM Context

## Overview

This is the main TypeScript source directory for EllyMUD. All server-side game logic lives here.

## Critical Conventions

### 1. Socket Writing (MUST READ)

**NEVER** write directly to client connections. Always use `utils/socketWriter.ts`:

```typescript
// ✅ CORRECT
import { writeMessageToClient } from '../utils/socketWriter';
writeMessageToClient(client, 'Hello!\r\n');

// ❌ WRONG - bypasses prompt management
client.connection.write('Hello!');
```

### 2. Line Endings

Always use `\r\n` for Telnet compatibility:

```typescript
writeMessageToClient(client, 'Message\r\n'); // ✅
writeMessageToClient(client, 'Message\n'); // ❌
```

### 3. Singleton Access

Access managers via `getInstance()`:

```typescript
const userManager = UserManager.getInstance();
const roomManager = RoomManager.getInstance(clients);
const combatSystem = CombatSystem.getInstance();
```

### 4. Logging

Use logger utilities, never `console.log`:

```typescript
import { systemLogger, getPlayerLogger } from '../utils/logger';
systemLogger.info('Server event');
getPlayerLogger(username).info('Player action');
```

## Directory Map

| Directory     | Purpose           | Key Files                                         |
| ------------- | ----------------- | ------------------------------------------------- |
| `admin/`      | Admin API         | `adminApi.ts`, `adminAuth.ts`                     |
| `client/`     | Client tracking   | `clientManager.ts`                                |
| `combat/`     | Combat system     | `combatSystem.ts`, `npc.ts`                       |
| `command/`    | Command system    | `commandHandler.ts`, `commandRegistry.ts`         |
| `config/`     | CLI parsing       | `cliConfig.ts`                                    |
| `connection/` | Protocol handlers | `telnet.connection.ts`, `websocket.connection.ts` |
| `console/`    | Server console    | `consoleInterface.ts`                             |
| `data/`       | Data store clients| `redis.ts`                                        |
| `effects/`    | Status effects    | `effectManager.ts`                                |
| `mcp/`        | AI integration    | `mcpServer.ts`                                    |
| `room/`       | Room management   | `roomManager.ts`                                  |
| `schemas/`    | JSON validation   | `index.ts`                                        |
| `server/`     | Network servers   | `telnetServer.ts`, `webSocketServer.ts`           |
| `session/`    | Session storage   | `sessionFactory.ts`, `memorySessionStore.ts`      |
| `setup/`      | First-run setup   | `adminSetup.ts`                                   |
| `state/`      | State machine     | `stateMachine.ts`                                 |
| `states/`     | Client states     | `authenticated.state.ts`, `login.state.ts`        |
| `timer/`      | Game timer        | `gameTimerManager.ts`                             |
| `types/`      | Type modules      | `effects.ts`                                      |
| `user/`       | User management   | `userManager.ts`                                  |
| `utils/`      | Utilities         | `socketWriter.ts`, `colors.ts`, `logger.ts`       |

## Core Files

### app.ts - GameServer Class

Main application class that:

- Initializes all singleton managers
- Starts all network servers
- Sets up signal handlers
- Coordinates shutdown

### server.ts - Entry Point

Simple entry that:

- Loads environment variables
- Creates GameServer instance
- Starts the server

### config.ts - Configuration

Server constants:

- Port numbers (Telnet: 8023, WebSocket: 8080, MCP: 3100)
- Timeouts and intervals
- Default values

### types.ts - Core Types

Key types:

- `Client` - Connected client object
- `User` - User data structure
- `ClientStateType` - State enum
- `Room`, `Item`, `NPC` interfaces

## Architecture

```
Connection (Telnet/WebSocket)
    ↓
Client Object Created
    ↓
StateMachine.transitionTo(CONNECTING)
    ↓
State Handlers Process Input
    ↓
AUTHENTICATED → CommandHandler
    ↓
CommandRegistry.execute()
    ↓
socketWriter → Client Output
```

## Adding New Features

### New Command

1. Create `src/command/commands/yourcommand.command.ts`
2. Extend `BaseCommand`
3. Register in `commandRegistry.ts`
4. Update `docs/commands.md`

### New State

1. Create `src/states/yourstate.state.ts`
2. Implement `ClientState` interface
3. Register in `stateMachine.ts`
4. Add to `ClientStateType` enum

### New Utility

1. Create in `src/utils/`
2. Export from module
3. Document usage in this file

## Testing Changes

```bash
npm run build          # Compile TypeScript
npm start              # Start server
npm start -- -a        # Start with admin auto-login
```

## Common Gotchas

1. **Forgot `\r\n`**: Output looks broken in Telnet clients
2. **Direct socket write**: Prompt doesn't redraw properly
3. **Missing await**: Async operations fail silently
4. **Wrong singleton**: Creating new instance instead of getInstance()

## Related Documentation

- [AGENTS.md](../AGENTS.md) - Project conventions
- [utils/AGENTS.md](utils/AGENTS.md) - Utility details
- [command/AGENTS.md](command/AGENTS.md) - Command system
- [states/AGENTS.md](states/AGENTS.md) - State machine
