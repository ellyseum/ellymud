# Server Components - LLM Context

## Overview

Server components handle network listening, connection acceptance, and server lifecycle. The `GameServer` in `app.ts` orchestrates these individual servers.

## File Reference

### `telnetServer.ts`

**Purpose**: TCP server for Telnet connections on port 8023

```typescript
export class TelnetServer {
  constructor(
    private clients: Map<string, ConnectedClient>,
    private stateMachine: StateMachine
  )

  start(port: number): void
  stop(): void
}
```

**Connection Flow**:

1. Accept TCP connection
2. Create `TelnetConnection` wrapper
3. Create `ConnectedClient` object
4. Add to clients map
5. Start in CONNECTING state

### `webSocketServer.ts`

**Purpose**: WebSocket server on port 8080 (HTTP upgrade)

```typescript
export class WebSocketServer {
  constructor(
    private httpServer: http.Server,
    private clients: Map<string, ConnectedClient>,
    private stateMachine: StateMachine
  )

  initialize(): void
}
```

**Connection Flow**:

1. Receive HTTP upgrade request
2. Accept WebSocket connection
3. Create `WebSocketConnection` wrapper
4. Create `ConnectedClient` object
5. Add to clients map
6. Start in CONNECTING state

### `apiServer.ts`

**Purpose**: HTTP API server for admin interface

```typescript
export class APIServer {
  constructor(private userManager: UserManager)

  getExpressApp(): Express
}
```

**Endpoints**:

- `GET /api/users` - List users (admin)
- `GET /api/rooms` - List rooms (admin)
- `POST /api/admin/login` - Admin authentication
- Various admin management endpoints

### `shutdownManager.ts`

**Purpose**: Handle graceful server shutdown

```typescript
export class ShutdownManager {
  constructor(
    private servers: Server[],
    private clients: Map<string, ConnectedClient>,
    private userManager: UserManager
  )

  registerShutdownHandlers(): void
  initiateShutdown(reason: string): Promise<void>
}
```

**Shutdown Sequence**:

1. Stop accepting new connections
2. Notify all connected clients
3. Save all user data
4. Save room state via `roomManager.forceSaveState()` (saves only mutable state to room_state.json)
5. Close all connections
6. Close server sockets
7. Exit process

## Port Configuration

Default ports (configurable in `config.ts`):

- **8023**: Telnet
- **8080**: HTTP/WebSocket
- **3100**: MCP Server

## Conventions

### Starting Servers

Servers are started by `GameServer` in `app.ts`:

```typescript
// In GameServer.start()
this.telnetServer.start(config.telnetPort);
this.webSocketServer.initialize();
this.mcpServer.start(config.mcpPort);
```

### Handling New Connections

```typescript
// All servers follow this pattern
const connection = new ProtocolConnection(socket);
const client: ConnectedClient = {
  id: generateId(),
  connection,
  state: ClientStateType.CONNECTING,
  // ... initialize other properties
};
this.clients.set(client.id, client);
this.stateMachine.transitionTo(client, ClientStateType.CONNECTING);
```

## Gotchas & Warnings

- ⚠️ **Port Conflicts**: Check ports are available before starting
- ⚠️ **Shutdown Order**: Save data before closing connections
- ⚠️ **Client Cleanup**: Remove from map on disconnect
- ⚠️ **Error Handling**: Log and handle socket errors gracefully

## Related Context

- [`../app.ts`](../app.ts) - GameServer orchestrates servers
- [`../connection/`](../connection/) - Connection implementations
- [`../config.ts`](../config.ts) - Port configuration
