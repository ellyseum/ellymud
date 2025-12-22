# Connection Handling - LLM Context

## Overview

The connection layer abstracts protocol differences between Telnet and WebSocket. All connection types implement the same `Connection` interface, allowing upper layers to be protocol-agnostic.

## Architecture

```
Connection Interface
├── TelnetConnection   - Raw TCP socket, ANSI codes
├── WebSocketConnection- Browser-based, JSON messages  
├── SocketIOConnection - Socket.IO variant
└── VirtualConnection  - Testing/MCP integration
```

## File Reference

### `interfaces/connection.interface.ts`

**Purpose**: Common interface for all connection types

```typescript
export interface Connection {
  id: string;
  type: 'telnet' | 'websocket' | 'socketio' | 'virtual';
  
  write(data: string): void;
  close(): void;
  
  on(event: 'data', handler: (data: string) => void): void;
  on(event: 'close', handler: () => void): void;
  on(event: 'error', handler: (error: Error) => void): void;
}
```

### `telnet.connection.ts`

**Purpose**: Wrap raw TCP sockets for Telnet protocol

```typescript
export class TelnetConnection implements Connection {
  type = 'telnet';
  
  constructor(private socket: net.Socket) {}
  
  write(data: string): void {
    // Writes raw data with ANSI codes
    this.socket.write(data);
  }
  
  close(): void {
    this.socket.destroy();
  }
}
```

**Telnet Specifics**:
- Raw TCP on port 8023
- ANSI escape codes for colors/formatting
- Line endings: `\r\n` (carriage return + newline)
- Input buffering handled character-by-character

### `websocket.connection.ts`

**Purpose**: Wrap WebSocket connections

```typescript
export class WebSocketConnection implements Connection {
  type = 'websocket';
  
  constructor(private ws: WebSocket) {}
  
  write(data: string): void {
    // Send as WebSocket message
    this.ws.send(data);
  }
  
  close(): void {
    this.ws.close();
  }
}
```

**WebSocket Specifics**:
- HTTP upgrade on port 8080
- Browser-compatible
- Messages sent as strings
- Client JS handles formatting

### `socketio.connection.ts`

**Purpose**: Socket.IO variant for browser compatibility

Similar to WebSocket but uses Socket.IO's event system.

### `virtual.connection.ts`

**Purpose**: Fake connection for testing and MCP integration

```typescript
export class VirtualConnection implements Connection {
  type = 'virtual';
  private outputBuffer: string[] = [];
  
  write(data: string): void {
    this.outputBuffer.push(data);
  }
  
  getOutput(): string[] {
    return this.outputBuffer;
  }
  
  simulateInput(data: string): void {
    this.emit('data', data);
  }
}
```

**Use Cases**:
- Unit testing without real sockets
- MCP server virtual sessions
- Automated testing

## Conventions

### Protocol Detection

The server determines protocol by the port/method of connection:
- Port 8023 → Telnet
- Port 8080 HTTP upgrade → WebSocket

### Writing Data

```typescript
// ✅ Use utility functions (protocol-agnostic)
import { writeToClient } from '../utils/socketWriter';
writeToClient(client, 'Hello!\r\n');

// ❌ Avoid direct connection access
client.connection.write('Hello!\r\n');  // Works but bypasses utilities
```

### Line Endings

```typescript
// ✅ Always use \r\n for Telnet compatibility
writeToClient(client, 'Message\r\n');

// ❌ Unix-only newlines break Telnet clients
writeToClient(client, 'Message\n');
```

## Common Tasks

### Creating a Test Connection

```typescript
import { VirtualConnection } from './connection/virtual.connection';

const virtual = new VirtualConnection('test-1');
const client: ConnectedClient = {
  id: 'test-1',
  connection: virtual,
  // ... other properties
};

// Simulate input
virtual.simulateInput('look');

// Check output
const output = virtual.getOutput();
```

## Gotchas & Warnings

- ⚠️ **Line Endings**: Always `\r\n`, never just `\n`
- ⚠️ **ANSI Codes**: Work on Telnet, stripped or rendered in web client
- ⚠️ **Binary Data**: Not supported—text only
- ⚠️ **Connection ID**: Must be unique across all connection types

## Related Context

- [`../server/telnetServer.ts`](../server/telnetServer.ts) - Telnet connection factory
- [`../server/webSocketServer.ts`](../server/webSocketServer.ts) - WebSocket factory
- [`../utils/socketWriter.ts`](../utils/socketWriter.ts) - Protocol-agnostic output
- [`../mcp/virtualSessionManager.ts`](../mcp/virtualSessionManager.ts) - Uses VirtualConnection
