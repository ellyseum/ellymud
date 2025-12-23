# Connection Handling

Protocol-specific connection implementations providing a unified interface for Telnet, WebSocket, and other connection types.

## Contents

| File | Description |
|------|-------------|
| `index.ts` | Barrel exports for all connection types |
| `telnet.connection.ts` | Telnet protocol handler with ANSI support |
| `websocket.connection.ts` | WebSocket protocol handler |
| `socketio.connection.ts` | Socket.IO variant for fallback support |
| `virtual.connection.ts` | Virtual connection for testing and MCP integration |
| `interfaces/` | Connection interface definitions |

## Connection Abstraction

EllyMUD supports multiple protocols through a common `Connection` interface:

```
Connection (interface)
    ├── TelnetConnection
    ├── WebSocketConnection
    ├── SocketIOConnection
    └── VirtualConnection
```

This abstraction allows the game logic to be protocol-agnostic. All connections provide:
- `write(data)` - Send data to client
- `close()` - Terminate connection
- `on('data', handler)` - Receive input
- `on('close', handler)` - Handle disconnection

## Protocol Details

**Telnet (port 8023)**:
- Traditional MUD client support
- Full ANSI color support
- Handles Telnet negotiations (WILL, WONT, DO, DONT)

**WebSocket (port 8080)**:
- Modern browser support
- Used by the web client
- Binary and text frame support

**Virtual**:
- In-memory connection for testing
- Used by MCP server for AI integration
- No actual network I/O

## Related

- [src/server/telnetServer.ts](../server/telnetServer.ts) - Creates Telnet connections
- [src/server/webSocketServer.ts](../server/webSocketServer.ts) - Creates WebSocket connections
- [src/mcp/](../mcp/) - Uses VirtualConnection for AI sessions
