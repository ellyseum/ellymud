# Web Client

Browser-based client for EllyMUD, providing a modern web interface for connecting to the MUD.

## Contents

| File | Description |
|------|-------------|
| `index.html` | Main client page with terminal-style interface |
| `client.js` | Client-side JavaScript handling WebSocket connection |
| `style.css` | CSS styles for the web terminal |
| `admin/` | Web-based admin dashboard |

## Features

The web client provides:

- **WebSocket Connection**: Real-time bidirectional communication with the server
- **Terminal Emulation**: Text-based interface matching traditional MUD clients
- **ANSI Color Support**: Full color rendering for game text
- **Responsive Design**: Works on desktop and mobile browsers
- **Input History**: Navigate through previous commands with arrow keys

## How It Works

1. **Connection**: The client connects via WebSocket to port 8080
2. **Authentication**: Users log in through the same flow as Telnet clients
3. **Gameplay**: Commands are sent as text, responses rendered in the terminal
4. **Styling**: ANSI escape codes are converted to CSS classes for coloring

## Accessing the Client

Once the server is running:

1. Open a web browser
2. Navigate to `http://localhost:8080`
3. The client interface loads automatically
4. Log in or create a new account

## Admin Dashboard

The `admin/` subdirectory contains a separate web-based admin interface for server management. See [admin/README.md](admin/README.md) for details.

## Related

- [src/server/webSocketServer.ts](../src/server/webSocketServer.ts) - WebSocket server handling
- [src/server/apiServer.ts](../src/server/apiServer.ts) - HTTP server that serves these static files
- [src/connection/websocket.connection.ts](../src/connection/websocket.connection.ts) - WebSocket connection class
