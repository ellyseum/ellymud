# Source Code

Main TypeScript source code for EllyMUD server - a modern Multi-User Dungeon built with Node.js.

## Core Files

| Path        | Description                                            |
| ----------- | ------------------------------------------------------ |
| `app.ts`    | Main GameServer class - orchestrates all components    |
| `server.ts` | Entry point - initializes and starts the server        |
| `config.ts` | Server configuration constants (ports, timeouts, etc.) |
| `types.ts`  | Core TypeScript types and interfaces                   |

## Directory Structure

| Directory     | Purpose                                             |
| ------------- | --------------------------------------------------- |
| `admin/`      | Admin API endpoints and authentication              |
| `client/`     | Client connection tracking and management           |
| `combat/`     | Combat system, damage calculation, NPC AI           |
| `command/`    | Command parsing, registry, and execution            |
| `config/`     | CLI argument parsing                                |
| `connection/` | Protocol handlers (Telnet, WebSocket, Socket.IO)    |
| `console/`    | Server console interface for local admin            |
| `data/`       | Reserved for runtime data (placeholder)             |
| `effects/`    | Status effects system (buffs, debuffs)              |
| `mcp/`        | Model Context Protocol server for AI integration    |
| `room/`       | Room management and player navigation               |
| `schemas/`    | JSON Schema validation definitions                  |
| `server/`     | Network servers (HTTP, Telnet, WebSocket)           |
| `setup/`      | First-run setup and configuration                   |
| `state/`      | State machine controller                            |
| `states/`     | Client state handlers (Login, Game, Combat, etc.)   |
| `timer/`      | Game tick system for periodic events                |
| `types/`      | Additional TypeScript type modules                  |
| `user/`       | User management and persistence                     |
| `utils/`      | Utility functions (logging, colors, socket writing) |

## Architecture Patterns

**Singleton Managers**: Core systems use singleton pattern for global access:

- `UserManager.getInstance()` - User data and authentication
- `RoomManager.getInstance()` - Room data and navigation
- `ClientManager.getInstance()` - Active client connections
- `CombatSystem.getInstance()` - Combat orchestration

**State Machine**: Client interactions follow a state machine pattern:

- `CONNECTING` → `LOGIN` → `AUTHENTICATED`
- States handle their own input and transitions

**Command Pattern**: All player actions go through the command system:

- Commands registered in `CommandRegistry`
- `CommandHandler` routes input to appropriate command
- Each command is a class implementing the `Command` interface

## Data Flow

1. **Connection**: Protocol servers accept connections and create `Client` objects
2. **State Management**: `StateMachine` manages client state transitions
3. **Input Processing**: Input routed through current state to `CommandHandler`
4. **Output**: All output goes through `socketWriter.ts` utilities
5. **Persistence**: Changes saved to JSON files in `data/` directory

## Related

- [data/](../data/) - JSON data files for persistence
- [public/](../public/) - Web client static files
- [docs/](../docs/) - Documentation
- [AGENTS.md](../AGENTS.md) - Full project conventions
