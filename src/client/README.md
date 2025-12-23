# Client Management

Active client connection tracking and session management.

## Contents

| File               | Description                              |
| ------------------ | ---------------------------------------- |
| `clientManager.ts` | Singleton managing all connected clients |

## Purpose

The `ClientManager` singleton provides centralized tracking of all connected clients across all protocols (Telnet, WebSocket, Socket.IO). It enables:

- **Client Lookup**: Find clients by username or connection ID
- **Broadcasting**: Send messages to all or filtered clients
- **Session Management**: Track client state and metadata
- **Statistics**: Count online users, track connection history

## Key Operations

- `addClient(client)` - Register a new connection
- `removeClient(clientId)` - Clean up disconnected client
- `getClientByUsername(username)` - Find client by logged-in user
- `broadcast(message, filter?)` - Send to multiple clients
- `getOnlineCount()` - Count active connections

## Client Object

Each client contains:

- `id` - Unique connection identifier
- `connection` - Protocol-specific connection object
- `state` - Current client state (LOGIN, AUTHENTICATED, etc.)
- `user` - User data once authenticated
- `stateData` - State-specific temporary data

## Related

- [src/app.ts](../app.ts) - Creates ClientManager and client map
- [src/server/](../server/) - Servers create and register clients
- [src/types.ts](../types.ts) - Client type definition
