# Console Interface - LLM Context

## Overview

Server-side console interface for administrators. Provides real-time monitoring, keyboard shortcuts, and command execution without needing a game client connection.

## File Reference

### `consoleInterface.ts`

**Purpose**: Interactive terminal interface

```typescript
export class ConsoleInterface {
  constructor(
    private clients: Map<string, ConnectedClient>,
    private userManager: UserManager
  )

  start(): void
  handleKeypress(key: string): void
  displayStatus(): void
}
```

**Keyboard Shortcuts**:

- `l` - List online users
- `b` - Broadcast message
- `k` - Kick user
- `m` - Monitor user session
- `r` - Reload configuration
- `q` - Quit server

### `consoleManager.ts`

**Purpose**: Handle console commands

```typescript
export class ConsoleManager {
  executeCommand(command: string): void;
}
```

### `autoSessionHandler.ts`

**Purpose**: Handle `-a` and `--forceSession` flags

```typescript
export class AutoSessionHandler {
  // Creates auto-login session for admin
  createAdminSession(): ConnectedClient;

  // Creates session for specific user
  createUserSession(username: string): ConnectedClient;
}
```

**CLI Flags**:

- `-a` - Auto-login as admin
- `--forceSession=username` - Auto-login as specific user

### `userMonitor.ts`

**Purpose**: Monitor user sessions in real-time

```typescript
export class UserMonitor {
  startMonitoring(username: string): void;
  stopMonitoring(): void;
}
```

Shows all input/output for monitored user in console.

## Related Context

- [`../config/cliConfig.ts`](../config/cliConfig.ts) - CLI argument parsing
- [`../server/`](../server/) - Console runs alongside servers
