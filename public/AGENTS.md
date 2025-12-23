# Web Client - LLM Context

## Overview

Browser-based client for EllyMUD. Connects via WebSocket and renders game output in the browser. Also includes the admin interface.

## File Reference

### `index.html`

**Purpose**: Main client HTML

- WebSocket connection setup
- Output display area
- Command input field
- CSS styling references

### `client.js`

**Purpose**: Client-side JavaScript

```javascript
// Key functions
function connect() {} // WebSocket connection
function send(message) {} // Send command
function receive(data) {} // Handle server message
function formatOutput(text) {} // Format ANSI codes
```

**Features**:

- WebSocket connection management
- ANSI code to HTML conversion
- Command history (arrow keys)
- Auto-reconnect
- Output scrolling

### `style.css`

**Purpose**: Client styling

- Terminal-like appearance
- Monospace font
- Dark theme
- Color classes for ANSI codes

### `admin/` Directory

Admin interface files:

| File             | Purpose               |
| ---------------- | --------------------- |
| `index.html`     | Admin dashboard entry |
| `login.html`     | Admin login form      |
| `dashboard.html` | Main dashboard        |
| `dashboard.js`   | Dashboard JavaScript  |
| `styles.css`     | Admin styles          |

## ANSI to HTML

The client converts ANSI escape codes to styled spans:

```javascript
// Example conversion
'\x1b[31mRed text\x1b[0m';
// becomes
'<span class="ansi-red">Red text</span>';
```

## Conventions

### Adding Client Features

1. Modify `client.js` for logic
2. Modify `style.css` for styling
3. Test with multiple browsers
4. Ensure Telnet compatibility (server-side)

### Admin Interface

Admin pages call API endpoints in `src/admin/adminApi.ts`:

```javascript
// Example API call
fetch('/api/admin/users', {
  headers: { Authorization: 'Bearer ' + token },
});
```

## Gotchas & Warnings

- ⚠️ **No Build Step**: Files served directly—no bundling
- ⚠️ **Browser Compatibility**: Test across browsers
- ⚠️ **ANSI Codes**: Not all codes supported in web
- ⚠️ **WebSocket Reconnect**: Auto-reconnects may lose state

## Related Context

- [`../src/server/webSocketServer.ts`](../src/server/webSocketServer.ts) - WebSocket server
- [`../src/server/apiServer.ts`](../src/server/apiServer.ts) - Serves static files
- [`../src/admin/adminApi.ts`](../src/admin/adminApi.ts) - Admin API endpoints
