# Connection Handling

Protocol-specific connection implementations for Telnet and WebSocket.

## Contents

| File | Description |
|------|-------------|
| `index.ts` | Barrel exports |
| `telnet.connection.ts` | Telnet protocol handler |
| `websocket.connection.ts` | WebSocket protocol handler |
| `socketio.connection.ts` | Socket.IO variant |
| `virtual.connection.ts` | Virtual connection for testing/MCP |
| `interfaces/` | Connection interface definitions |

## Overview

EllyMUD supports multiple connection protocols. Each protocol has its own connection class implementing the common `Connection` interface, allowing the rest of the code to be protocol-agnostic.

## Related

- [`../server/telnetServer.ts`](../server/telnetServer.ts) - Creates Telnet connections
- [`../server/webSocketServer.ts`](../server/webSocketServer.ts) - Creates WebSocket connections
