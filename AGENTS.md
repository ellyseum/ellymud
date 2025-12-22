# EllyMUD - LLM Context Index

> **Core conventions are in `.github/copilot-instructions.md`** (auto-loaded by Copilot).
> This file serves as an index to find detailed context in subdirectory AGENTS.md files.

## Project Overview

EllyMUD is a Node.js/TypeScript MUD server with Telnet (8023), WebSocket (8080), and MCP (3100) interfaces.

## Architecture at a Glance

```
GameServer (src/app.ts)
├── Servers: Telnet, WebSocket, API, MCP
├── Managers: Client, User, Room, GameTimer (singletons)
├── StateMachine: Connecting → Login → Authenticated
├── CommandHandler → CommandRegistry
└── CombatSystem (event-driven)
```

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

## Quick Reference

### Key Entry Points
- `src/server.ts` → `src/app.ts` (GameServer)
- `src/types.ts` - Core TypeScript types
- `src/config.ts` - Configuration

### Critical Convention
**ALWAYS** use `writeMessageToClient()` from `src/utils/socketWriter.ts` - never write directly to sockets.

### Common Tasks

| Task | Start Here |
|------|------------|
| Add a command | [src/command/commands/AGENTS.md](src/command/commands/AGENTS.md) |
| Modify combat | [src/combat/AGENTS.md](src/combat/AGENTS.md) |
| Change login flow | [src/states/AGENTS.md](src/states/AGENTS.md) |
| Add room features | [src/room/AGENTS.md](src/room/AGENTS.md) |
| Modify user stats | [src/user/AGENTS.md](src/user/AGENTS.md) |
| Add MCP endpoint | [src/mcp/AGENTS.md](src/mcp/AGENTS.md) |

## Agent Ecosystem

Specialized agents are available in `.github/agents/`:

| Agent | Purpose |
|-------|---------|
| Research | Codebase investigation |
| Plan | Implementation planning |
| Implementation | Execute plans |
| Validation | Verify implementations |
| Documentation Updater | Maintain README/AGENTS files |

---

**Remember**: Core conventions are auto-loaded from `.github/copilot-instructions.md`. Use this index to navigate to detailed context.
