# Server Components

Network servers and lifecycle management for EllyMUD.

## Contents

| File | Description |
|------|-------------|
| `telnetServer.ts` | Telnet server on port 8023 |
| `webSocketServer.ts` | WebSocket server on port 8080 |
| `apiServer.ts` | HTTP API server |
| `shutdownManager.ts` | Graceful shutdown handling |

## Overview

Server components handle incoming connections, protocol initialization, and server lifecycle. Each protocol has its own server class that creates appropriate connection objects.

## Related

- [`../connection/`](../connection/) - Connection objects created by servers
- [`../app.ts`](../app.ts) - GameServer that orchestrates these servers
