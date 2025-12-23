# Console Interface

Server console for local administration, monitoring, and direct game access.

## Contents

| File | Description |
|------|-------------|
| `consoleInterface.ts` | Interactive CLI interface with keyboard handling |
| `consoleManager.ts` | Console command processing |
| `autoSessionHandler.ts` | Auto-login session handling for `-a` flag |
| `localSessionManager.ts` | Local session management |
| `userAdminMenu.ts` | User administration menu system |
| `userMonitor.ts` | Real-time user session monitoring |

## Features

The server console provides:

- **Direct Play**: Play the game directly from the server terminal
- **Auto-Login**: Use `-a` flag to auto-login as admin
- **User Monitoring**: Watch user sessions in real-time
- **Admin Commands**: Server management without web dashboard
- **Keyboard Shortcuts**: Quick access to common functions

## Console Modes

- **Normal Mode**: Standard server output
- **Play Mode**: Interactive game session
- **Monitor Mode**: Watch user activity
- **Admin Menu**: User management interface

## Keyboard Shortcuts

- `Ctrl+C` - Graceful shutdown
- `Ctrl+P` - Toggle play mode
- `Ctrl+M` - Toggle monitor mode
- `Ctrl+A` - Open admin menu

## Auto-Login

Start with auto-login:
```bash
npm start -- -a              # Login as admin
npm start -- --forceSession=user  # Login as specific user
```

## Related

- [src/app.ts](../app.ts) - Console initialized here
- [src/config/cliConfig.ts](../config/cliConfig.ts) - CLI argument parsing
- [src/connection/virtual.connection.ts](../connection/virtual.connection.ts) - Console uses virtual connections
