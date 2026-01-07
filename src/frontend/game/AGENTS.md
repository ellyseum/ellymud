# Game Client - LLM Context

## Overview

The game client is a vanilla TypeScript terminal emulator using xterm.js, built with Vite as part of the unified frontend MPA. It provides a browser-based interface to the MUD server via Socket.IO WebSocket connections.

## Architecture

```
Browser
  └── main.ts
        ├── Terminal (xterm.js)
        │     ├── FitAddon - Auto-resize to window
        │     └── WebLinksAddon - Clickable URLs
        └── Socket.IO Client
              ├── Events: connect, disconnect, output, mask
              └── Emits: keypress, special
```

## File Reference

### `index.html`

**Purpose**: Entry point HTML loaded at `/` (root URL)

- Includes Socket.IO script (auto-served by server at `/socket.io/socket.io.js`)
- Contains terminal container div and connection status element
- Links to Vite-processed main.ts and style.css

### `main.ts`

**Purpose**: Terminal initialization and Socket.IO communication

**Key Exports**: None (entry point script)

**Dependencies**:
- `@xterm/xterm` - Terminal emulator
- `@xterm/addon-fit` - Auto-resize addon
- `@xterm/addon-web-links` - URL detection addon

**Socket.IO Events Handled**:

```typescript
// Server → Client
socket.on('connect', () => { ... });     // Connection established
socket.on('disconnect', () => { ... });  // Connection lost
socket.on('output', (msg) => { ... });   // Server output to display
socket.on('mask', () => { ... });        // Password masking (no-op for xterm)

// Client → Server
socket.emit('keypress', char);           // Regular character input
socket.emit('special', { key: 'up' });   // Arrow keys
```

**Input Handling**:

```typescript
term.onData((data: string) => {
  if (data === '\r') {
    // Enter key
    socket.emit('keypress', '\r');
  } else if (data === '\u007F') {
    // Backspace
    socket.emit('keypress', '\b');
  } else if (data === '\u001b[A') {
    // Up arrow - command history
    socket.emit('special', { key: 'up' });
  }
  // ... other keys
});
```

### `style.css`

**Purpose**: Terminal container and connection status styles

- Dark theme background (#000)
- Full viewport terminal container
- Connection status badge (green/red indicator)

## Conventions

### Socket.IO Loading

Socket.IO is loaded via script tag, NOT npm import:

```html
<!-- In index.html -->
<script src="/socket.io/socket.io.js"></script>
```

This is required because the server auto-serves the client library at this URL.

### TypeScript Declaration

Since Socket.IO loads globally, declare its type:

```typescript
declare const io: () => {
  on: (event: string, callback: (data?: unknown) => void) => void;
  emit: (event: string, data: unknown) => void;
};
```

### No React

The game client is intentionally vanilla TypeScript - no React, no framework. This keeps it lightweight and fast-loading.

## Build Output

After `npm run build:frontend`:
- `dist/public/index.html` - Game client HTML
- `dist/public/assets/main-[hash].js` - Bundled JS
- `dist/public/assets/main-[hash].css` - Bundled CSS

Note: The `moveGameToRoot()` Vite plugin moves files from `/game/` to root during build.

## Common Tasks

### Modify Terminal Appearance

Edit the Terminal configuration in `main.ts`:

```typescript
const term = new Terminal({
  fontFamily: 'monospace',
  fontSize: 14,
  theme: { background: '#000', foreground: '#f0f0f0' }
});
```

### Add Keyboard Shortcut

Add case in the `term.onData()` handler in `main.ts`:

```typescript
} else if (data === '\u001b[5~') {
  // Page Up
  socket.emit('special', { key: 'pageup' });
}
```

### Debug Connection Issues

Check browser console for Socket.IO errors. The connection status element shows real-time state.

## Related Context

- [`../admin/`](../admin/) - Admin panel (React app at /admin/)
- [`../shared/`](../shared/) - Shared type definitions
- [`../../server/apiServer.ts`](../../server/apiServer.ts) - Static file serving
- [`../../connection/WebsocketConnection.ts`](../../connection/WebsocketConnection.ts) - Server-side Socket.IO
- [`/vite.config.ts`](../../../vite.config.ts) - Vite MPA configuration
