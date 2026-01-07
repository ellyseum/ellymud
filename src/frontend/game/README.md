# Game Client

Browser-based terminal emulator for EllyMUD using xterm.js.

## Contents

| File         | Description                           |
| ------------ | ------------------------------------- |
| `index.html` | Entry point HTML for root URL (/)     |
| `main.ts`    | Terminal logic and Socket.IO handling |
| `style.css`  | Terminal and connection status styles |

## Overview

The game client is a lightweight terminal emulator that connects to the MUD server via Socket.IO. It renders server output in a terminal window and sends player input back to the server in real-time.

## Features

- Full terminal emulation via xterm.js
- Auto-fit to window size
- Clickable web links
- Arrow key support for command history
- Connection status indicator

## Related

- [`../admin/`](../admin/) - Admin panel (separate React application)
- [`../shared/`](../shared/) - Shared TypeScript types
- [`../../server/`](../../server/) - Server-side WebSocket handling
