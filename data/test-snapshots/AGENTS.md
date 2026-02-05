# Test Snapshots - LLM Context

## Overview

The `test-snapshots/` directory stores saved game state snapshots for repeatable test scenarios. Snapshots are managed by the `StateLoader` class in `src/testing/stateLoader.ts`.

## Directory Structure

```
test-snapshots/
├── fresh/              # Clean install state (REQUIRED)
│   ├── users.json      # Empty user array
│   ├── rooms.json      # Minimal room set
│   ├── items.json      # Empty items (optional)
│   └── npcs.json       # Empty NPCs (optional)
├── full-world/         # Generated world (may have stale data)
├── thornwood-vale/     # Production-accurate snapshot (recommended for E2E)
│   ├── users.json      # Empty user array
│   ├── rooms.json      # Full production room data
│   ├── items.json      # Production item definitions
│   └── npcs.json       # Production NPC templates
└── my-scenario/        # Any custom snapshot
```

## Snapshot File Format

### users.json

Array of user objects matching the `User` type:

```json
[
  {
    "username": "testuser",
    "health": 100,
    "maxHealth": 100,
    "mana": 100,
    "maxMana": 100,
    "experience": 0,
    "level": 1,
    "currentRoomId": "start",
    "inventory": { "items": [], "currency": { "gold": 0, "silver": 0, "copper": 0 } }
  }
]
```

### rooms.json

Array of room objects:

```json
[
  {
    "id": "start",
    "name": "Town Square",
    "description": "The central plaza.",
    "exits": [{ "direction": "north", "roomId": "north-path" }],
    "items": [],
    "npcs": [],
    "flags": ["safe"],
    "currency": { "gold": 0, "silver": 0, "copper": 0 }
  }
]
```

## MCP Tools

| Tool | Description |
|------|-------------|
| `load_test_snapshot` | Load a snapshot, replacing current state |
| `save_test_snapshot` | Save current state as a snapshot |
| `reset_game_state` | Load the 'fresh' snapshot |
| `list_test_snapshots` | List all available snapshots |
| `set_player_stats` | Modify player stats without loading snapshot |

## Usage Examples

### Loading a Snapshot

```typescript
// Via MCP
await mcp_ellymud.load_test_snapshot({ name: 'fresh' });

// Programmatically
const stateLoader = new StateLoader(userManager, roomManager);
await stateLoader.loadSnapshot('fresh');
```

### Saving a Snapshot

```typescript
// Via MCP
await mcp_ellymud.save_test_snapshot({ name: 'my-test', overwrite: true });

// Programmatically
await stateLoader.saveSnapshot('my-test', true);
```

### Setting Up a Test Scenario

```typescript
// 1. Reset to clean state
await mcp_ellymud.reset_game_state({});

// 2. Create a temp user
const loginResult = await mcp_ellymud.direct_login({ username: 'testplayer' });

// 3. Set specific stats for testing
await mcp_ellymud.set_player_stats({
  username: 'testplayer',
  health: 10,
  maxHealth: 100
});

// 4. Run commands and advance ticks as needed
await mcp_ellymud.virtual_session_command({
  sessionId: loginResult.sessionId,
  command: 'rest'
});
await mcp_ellymud.advance_game_ticks({ ticks: 12 });
```

## Conventions

### Fresh Snapshot

The `fresh` snapshot is **required** and should contain:
- Empty users array
- Minimal room set with at least a `start` room
- Empty items and NPCs

**Never delete the `fresh` snapshot** - it's used by `resetToClean()`.

### Production Data Safety

Snapshots only affect the in-memory state. Production data files in `data/*.json` are **not modified** when loading snapshots. However, `saveSnapshot()` writes to the snapshot directory, not production files.

### Creating Custom Snapshots

1. Set up the desired game state (users, room contents, etc.)
2. Call `save_test_snapshot` with your snapshot name
3. The snapshot is now available for future tests

## Related Files

- [`../../src/testing/stateLoader.ts`](../../src/testing/stateLoader.ts) - StateLoader class
- [`../../src/testing/AGENTS.md`](../../src/testing/AGENTS.md) - Test mode documentation
- [`../../src/mcp/mcpServer.ts`](../../src/mcp/mcpServer.ts) - MCP server with snapshot tools
