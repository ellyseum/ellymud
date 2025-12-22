# Web Client

Browser-based client for EllyMUD.

## Contents

| File | Description |
|------|-------------|
| `index.html` | Main client page |
| `client.js` | Client JavaScript |
| `style.css` | Client styles |
| `admin/` | Admin interface |

## Overview

Static files served by the HTTP server. The web client connects via WebSocket and provides a browser-based MUD experience.

## Related

- [`../src/server/webSocketServer.ts`](../src/server/webSocketServer.ts) - WebSocket handling
- [`../src/server/apiServer.ts`](../src/server/apiServer.ts) - Serves these files
