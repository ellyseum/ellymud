# Server Components

Network servers and lifecycle management for EllyMUD. Handles all incoming connections and server orchestration.

## Contents

| File                 | Description                                  |
| -------------------- | -------------------------------------------- |
| `telnetServer.ts`    | Telnet server on port 8023                   |
| `webSocketServer.ts` | WebSocket server on port 8080                |
| `apiServer.ts`       | HTTP/Express server for API and static files |
| `shutdownManager.ts` | Graceful shutdown handling                   |

## Server Architecture

```
GameServer (app.ts)
    ├── TelnetServer (port 8023)
    │       └── Creates TelnetConnection objects
    ├── WebSocketServer (port 8080)
    │       ├── Creates WebSocketConnection objects
    │       └── Serves web client files
    ├── APIServer (port 8080)
    │       ├── REST API endpoints
    │       └── Admin dashboard
    └── MCPServer (port 3100)
            └── AI integration API
```

## Server Responsibilities

**TelnetServer**:

- Accepts raw TCP connections
- Handles Telnet protocol negotiations
- Creates TelnetConnection for each client

**WebSocketServer**:

- WebSocket upgrade handling
- Binary and text message support
- Integrates with HTTP server

**APIServer**:

- Express-based HTTP server
- Serves static files from `public/`
- Admin API endpoints
- Health check endpoints

**ShutdownManager**:

- Handles SIGINT/SIGTERM signals
- Graceful client disconnection
- Data persistence before exit
- Cleanup of resources

## Related

- [src/connection/](../connection/) - Connection objects created by servers
- [src/app.ts](../app.ts) - GameServer orchestrates all servers
- [src/mcp/](../mcp/) - MCP server (separate from these)
