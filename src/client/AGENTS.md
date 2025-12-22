# Client Management - LLM Context

## Overview

Client management utilities for tracking connected clients and performing operations across multiple clients.

## File Reference

### `clientManager.ts`

**Purpose**: Utilities for working with the clients map

```typescript
export class ClientManager {
  constructor(private clients: Map<string, ConnectedClient>)
  
  getClient(id: string): ConnectedClient | undefined
  getClientByUsername(username: string): ConnectedClient | undefined
  getAllClients(): ConnectedClient[]
  getAuthenticatedClients(): ConnectedClient[]
  
  broadcast(message: string, exclude?: string[]): void
  broadcastToRoom(roomId: string, message: string, exclude?: string[]): void
}
```

## Client Structure

```typescript
interface ConnectedClient {
  id: string;                    // Unique connection ID
  connection: Connection;        // Protocol-specific connection
  user?: User;                   // Set after authentication
  state: ClientStateType;        // Current state
  stateData: any;                // State-specific data
  authenticated: boolean;        // Is logged in
  buffer: string;                // Input buffer
  outputBuffer: string[];        // Pending output
  isTyping: boolean;             // Currently typing
  commandHistory: string[];      // Recent commands
  isBeingMonitored: boolean;     // Admin monitoring
  adminMonitorSocket?: any;      // Monitor socket
}
```

## Conventions

### Finding Clients

```typescript
// By connection ID
const client = clientManager.getClient(id);

// By username (after authentication)
const client = clientManager.getClientByUsername('player1');

// All authenticated
const players = clientManager.getAuthenticatedClients();
```

### Broadcasting

```typescript
// To everyone
clientManager.broadcast('Server restarting in 5 minutes!\r\n');

// To everyone except one
clientManager.broadcast('Player joined!\r\n', [playerUsername]);

// To a room
clientManager.broadcastToRoom(roomId, 'Something happens!\r\n');
```

## Related Context

- [`../types.ts`](../types.ts) - ConnectedClient interface
- [`../server/`](../server/) - Servers add clients
