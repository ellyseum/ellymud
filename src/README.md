# Source Code

Main TypeScript source code for EllyMUD server - a modern Multi-User Dungeon built with Node.js.

## Contents

| Path | Description |
|------|-------------|
| `app.ts` | Main GameServer class and application bootstrapping |
| `server.ts` | Entry point - initializes and starts the server |
| `config.ts` | Server configuration constants and settings |
| `types.ts` | Core TypeScript type definitions |
| `admin/` | Admin API and authentication |
| `client/` | Client connection management |
| `combat/` | Combat system and NPC AI |
| `command/` | Command parsing and execution |
| `config/` | CLI configuration handling |
| `connection/` | Protocol handlers (Telnet, WebSocket, Socket.IO) |
| `console/` | Server console interface and local sessions |
| `effects/` | Status effects system |
| `mcp/` | Model Context Protocol server for AI integration |
| `room/` | Room management and navigation |
| `schemas/` | JSON validation schemas |
| `server/` | HTTP, Telnet, and WebSocket servers |
| `setup/` | Initial setup and admin configuration |
| `state/` | State machine implementation |
| `states/` | Client state handlers (Login, Game, Combat, etc.) |
| `timer/` | Game timer and tick management |
| `types/` | Additional type definitions |
| `user/` | User management and persistence |
| `utils/` | Utility functions and helpers |

## Overview

The codebase follows a singleton pattern for core managers (UserManager, RoomManager, ClientManager) and uses a state machine pattern for client interactions. All game logic flows through the command system.

## Related

- [`../data/`](../data/) - JSON data files for persistence
- [`../public/`](../public/) - Web client files
- [`../docs/`](../docs/) - Documentation
