# MCP Server - LLM Context

## Overview

The MCP server exposes game data via HTTP API for AI tools like GitHub Copilot. It allows AI to query game state, users, rooms, and more without direct game access. It also provides test mode tools for deterministic E2E testing.

## Contents

| File                       | Description                  |
| -------------------------- | ---------------------------- |
| `mcpServer.ts`             | HTTP API server on port 3100 |
| `virtualSessionManager.ts` | Manage virtual game sessions |
| `README.md`                | Detailed MCP documentation   |

## File Reference

### `mcpServer.ts`

**Purpose**: HTTP API server providing MCP protocol and REST endpoints

**Key Exports**:

```typescript
export class MCPServer {
  constructor(
    userManager: UserManager,
    roomManager: RoomManager,
    clientManager: ClientManager,
    gameTimerManager: GameTimerManager,
    port: number = 3100
  );
  
  start(): Promise<void>;
  stop(): Promise<void>;
}
```

**Test Mode Endpoints**:

```typescript
// POST /api/test/mode - Enable/disable test mode
{ enabled: boolean }
// Response: { success: true, data: { testMode: boolean } }

// POST /api/test/advance-ticks - Advance game ticks
{ ticks: number }
// Response: { success: true, data: { ticksAdvanced: number, currentTick: number } }

// GET /api/test/tick-count - Get current tick count
// Response: { success: true, data: { tick: number } }
```

### `virtualSessionManager.ts`

**Purpose**: Manages virtual game sessions for AI/LLM interaction

```typescript
export class VirtualSessionManager {
  createSession(): VirtualSession;
  sendCommand(sessionId: string, command: string, waitMs?: number): Promise<string>;
  closeSession(sessionId: string): void;
}
```

## Test Mode Tools

Three MCP tools control game timing for E2E testing:

| Tool | Method | Endpoint | Description |
|------|--------|----------|-------------|
| `set_test_mode` | POST | `/api/test/mode` | Enable/disable test mode |
| `advance_game_ticks` | POST | `/api/test/advance-ticks` | Advance N ticks synchronously |
| `get_game_tick` | GET | `/api/test/tick-count` | Get current tick count |

### Usage Pattern

```typescript
// 1. Ensure server started with --test-mode flag

// 2. Create virtual session and set up scenario
const session = await createVirtualSession();
await sendCommand(session.id, 'attack goblin');

// 3. Advance ticks to process combat
await fetch('/api/test/advance-ticks', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ ticks: 5 })
});

// 4. Check game state
const combatState = await fetch('/api/combat-state');
```

## Conventions

### Adding New MCP Tools

1. Add tool definition to `getMCPToolsList()` method
2. Add handler case in `handleToolCall()` method
3. Add REST endpoint in `setupRoutes()` method
4. Update README.md with new tool documentation

### API Key Authentication

```typescript
// Set via environment variable
ELLYMUD_MCP_API_KEY=your-secret-key

// Pass in request header
headers: { 'X-API-Key': 'your-secret-key' }
```

## Gotchas & Warnings

- ⚠️ **Test Mode Dependency**: `advance_game_ticks` only works when test mode is active
- ⚠️ **Synchronous Processing**: `advanceTicks` processes all ticks before returning
- ⚠️ **No Timer in Test Mode**: Timer does not auto-start when `--test-mode` flag is used
- ⚠️ **Session Cleanup**: Virtual sessions are cleaned up after 1 hour of inactivity

## Related

- [`../timer/gameTimerManager.ts`](../timer/gameTimerManager.ts) - Timer with test mode support
- [`../testing/testMode.ts`](../testing/testMode.ts) - Test mode options interface
- [`../connection/virtual.connection.ts`](../connection/virtual.connection.ts) - Virtual connections for sessions
- [`../../.vscode/mcp.json`](../../.vscode/mcp.json) - VS Code MCP configuration
