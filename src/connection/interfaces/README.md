# Connection Interfaces

TypeScript interfaces defining the connection abstraction layer.

## Contents

| File | Description |
|------|-------------|
| `connection.interface.ts` | Core Connection interface all implementations must follow |

## Connection Interface

The `Connection` interface defines:

```typescript
interface Connection {
  id: string;                          // Unique connection ID
  write(data: string): void;           // Send data to client
  close(): void;                       // Terminate connection
  on(event: 'data', handler): void;    // Receive input
  on(event: 'close', handler): void;   // Handle disconnect
  on(event: 'error', handler): void;   // Handle errors
}
```

## Why Interfaces?

The interface abstraction allows:
- Protocol-agnostic game logic
- Easy addition of new protocols
- Consistent behavior across Telnet/WebSocket
- Testable code with mock connections

## Implementations

Classes implementing this interface:
- `TelnetConnection` - TCP/Telnet protocol
- `WebSocketConnection` - WebSocket protocol
- `SocketIOConnection` - Socket.IO protocol
- `VirtualConnection` - Testing/MCP

## Related

- [telnet.connection.ts](../telnet.connection.ts) - Telnet implementation
- [websocket.connection.ts](../websocket.connection.ts) - WebSocket implementation
- [virtual.connection.ts](../virtual.connection.ts) - Virtual implementation
