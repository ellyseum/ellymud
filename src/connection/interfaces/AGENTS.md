# Connection Interfaces - LLM Context

## Overview

Defines the `Connection` interface that all protocol handlers must implement.

## File Reference

### `connection.interface.ts`

```typescript
export interface Connection {
  // Unique identifier
  id: string;
  
  // Protocol type
  type: 'telnet' | 'websocket' | 'socketio' | 'virtual';
  
  // Send data to client
  write(data: string): void;
  
  // Close connection
  close(): void;
  
  // Event handlers
  on(event: 'data', handler: (data: string) => void): void;
  on(event: 'close', handler: () => void): void;
  on(event: 'error', handler: (error: Error) => void): void;
}
```

## Usage

All connection classes implement this interface:

```typescript
class MyConnection implements Connection {
  id: string;
  type: 'myprotocol';
  
  write(data: string): void { /* ... */ }
  close(): void { /* ... */ }
  on(event: string, handler: Function): void { /* ... */ }
}
```

## Related Context

- [`../telnet.connection.ts`](../telnet.connection.ts) - Telnet implementation
- [`../websocket.connection.ts`](../websocket.connection.ts) - WebSocket implementation
