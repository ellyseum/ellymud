# Testing - LLM Context

## Overview

The `testing/` directory provides infrastructure for running EllyMUD in a deterministic test mode. This is essential for E2E testing where the game timer must be controlled externally rather than running on real-time intervals.

This module includes:
- **Test Mode**: Controls game timer for deterministic testing
- **State Loading & Snapshots**: Load/save game state for repeatable test scenarios

## File Reference

### `testMode.ts`

**Purpose**: Defines the `TestModeOptions` interface for configuring test mode behavior

```typescript
export interface TestModeOptions {
  /**
   * Whether to start the game timer immediately on boot.
   * Defaults to false in test mode.
   */
  enableTimer?: boolean;
}
```

**Usage**:

```typescript
import { TestModeOptions } from './testing/testMode';

// In app.ts - boot in test mode
const options: TestModeOptions = { enableTimer: false };
gameServer.bootTestMode(options);
```

### `stateLoader.ts`

**Purpose**: Manages loading and saving test snapshots for repeatable test scenarios.

```typescript
import { StateLoader } from '../testing/stateLoader';

const stateLoader = new StateLoader(userManager, roomManager);

// Load a named snapshot (replaces current state)
await stateLoader.loadSnapshot('fresh');

// Save current state as a snapshot
await stateLoader.saveSnapshot('my-test-scenario');

// Reset to clean state (loads 'fresh' snapshot)
await stateLoader.resetToClean();

// List available snapshots
const snapshots = stateLoader.listSnapshots();

// Get snapshot info without loading
const info = stateLoader.getSnapshotInfo('fresh');
```

**Key Methods**:

| Method | Description |
|--------|-------------|
| `loadSnapshot(name)` | Load a named snapshot, replacing current game state |
| `saveSnapshot(name, overwrite?)` | Save current state as a named snapshot |
| `resetToClean()` | Reset to 'fresh' snapshot (clean state) |
| `listSnapshots()` | List all available snapshot names |
| `getSnapshotInfo(name)` | Get snapshot metadata without loading |
| `deleteSnapshot(name)` | Delete a snapshot (cannot delete 'fresh') |
| `snapshotExists(name)` | Check if a snapshot exists |

## Snapshot Directory Structure

Snapshots are stored in `data/test-snapshots/<name>/`:

```
data/
└── test-snapshots/
    ├── fresh/              # Clean install state (required)
    │   ├── users.json      # Empty user array
    │   ├── rooms.json      # Minimal room set
    │   ├── items.json      # Empty items
    │   └── npcs.json       # Empty NPCs
    ├── combat-ready/       # Player + enemy in same room
    │   ├── users.json
    │   └── rooms.json
    └── low-health/         # Player at 10% HP for regen testing
        ├── users.json
        └── rooms.json
```

**Important**: The `fresh` snapshot is required and cannot be deleted. It's used by `resetToClean()`.

### `testerAgent.ts`

**Purpose**: Provides a programmatic API for E2E testing, wrapping all test infrastructure into a single, Jest-friendly interface.

```typescript
import { TesterAgent } from '../testing/testerAgent';

// Create a TesterAgent (boots server in test mode)
const agent = await TesterAgent.create();

// Session control
const sessionId = await agent.directLogin('testuser');
agent.sendCommand(sessionId, 'look');
const output = agent.getOutput(sessionId);
agent.closeSession(sessionId);

// Time control
agent.advanceTicks(12);      // Advance 12 game ticks
agent.advanceToRegen();      // Advance to next regen cycle
const tick = agent.getTickCount();

// State control
await agent.loadSnapshot('fresh');
await agent.saveSnapshot('my-test');
await agent.resetToClean();

// Player manipulation
const stats = agent.getPlayerStats(sessionId);
agent.setPlayerStats(sessionId, { health: 50 });

// Cleanup
await agent.shutdown();
```

**Key Methods**:

| Method | Description |
|--------|-------------|
| `create(options?)` | Static factory - creates agent with server in test mode |
| `shutdown()` | Stop the test server |
| `directLogin(username)` | Create session logged in as user (creates if needed) |
| `createSession()` | Create unauthenticated session |
| `sendCommand(sessionId, cmd)` | Send command to session |
| `getOutput(sessionId)` | Get accumulated output |
| `closeSession(sessionId)` | Close a session |
| `advanceTicks(count)` | Advance game time by N ticks |
| `getTickCount()` | Get current tick count |
| `advanceToRegen()` | Advance to next regen cycle (12 ticks) |
| `loadSnapshot(name)` | Load a test snapshot |
| `saveSnapshot(name)` | Save current state as snapshot |
| `resetToClean()` | Reset to 'fresh' snapshot |
| `getPlayerStats(sessionId)` | Get player HP/MP/gold/XP/level |
| `setPlayerStats(sessionId, stats)` | Set player stats for testing |
| `teleportTo(sessionId, roomId)` | Teleport player instantly to a room |
| `getAllNpcTemplates()` | Get all NPC templates from cache |
| `getNpcTemplateById(id)` | Get NPC template by ID |
| `getHostileNpcTemplates()` | Get all hostile NPC templates |
| `getMerchantNpcTemplates()` | Get all merchant NPC templates |
| `getRoomNpcs(roomId)` | Get live NPC instances in a room |
| `isInCombat(sessionId)` | Check if player is in combat |
| `getCurrentRoomId(sessionId)` | Get player's current room ID |
| `setNpcHealth(roomId, instanceId, health)` | Set NPC health for testing |
| `getRoomItems(roomId)` | Get item instances in a room |
| `getRoomCurrency(roomId)` | Get floor currency in a room |

**PlayerStats Interface**:

```typescript
interface PlayerStats {
  health: number;
  maxHealth: number;
  mana: number;
  maxMana: number;
  gold: number;
  experience: number;
  level: number;
}
```

## Test Mode Architecture

```
Test Mode Flow:
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  CLI Flag       │───▶│  config.ts       │───▶│  app.ts         │
│  --test-mode    │    │  TEST_MODE=true  │    │  bootTestMode() │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                        │
                                                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  MCP Client     │───▶│  mcpServer.ts    │───▶│  GameTimer      │
│  advance_ticks  │    │  /api/test/*     │    │  advanceTicks() │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Integration Points

### Enabling Test Mode

Test mode is enabled via CLI:

```bash
npm start -- --test-mode
```

This sets `config.TEST_MODE = true` and calls `gameServer.bootTestMode()` instead of `start()`.

### Timer Behavior in Test Mode

When test mode is enabled:

```typescript
// In gameTimerManager.ts
public start(): void {
  if (this.testMode) {
    timerLogger.info('Game timer start prevented (Test Mode active)');
    return;  // Timer does NOT start
  }
  // ... normal timer start
}
```

### Advancing Ticks Programmatically

```typescript
// Via MCP tool or direct call
gameTimerManager.advanceTicks(5);  // Advance 5 ticks immediately
```

Each tick processes:
1. Effects (stat modifiers)
2. Combat rounds
3. Rest/meditation tracking
4. Regeneration (every 12 ticks)
5. Data saves (at configured intervals)

## MCP Tools for Test Mode

### Timer Control Tools

| Tool | Endpoint | Description |
|------|----------|-------------|
| `set_test_mode` | POST `/api/test/mode` | Enable/disable test mode |
| `advance_game_ticks` | POST `/api/test/advance-ticks` | Advance N ticks |
| `get_game_tick` | GET `/api/test/tick-count` | Get current tick count |

### State Management Tools

| Tool | Endpoint | Description |
|------|----------|-------------|
| `load_test_snapshot` | POST `/api/test/snapshot/load` | Load a named snapshot |
| `save_test_snapshot` | POST `/api/test/snapshot/save` | Save current state as snapshot |
| `reset_game_state` | POST `/api/test/reset` | Reset to fresh state |
| `list_test_snapshots` | GET `/api/test/snapshots` | List available snapshots |
| `set_player_stats` | POST `/api/test/set-player-stats` | Directly modify player stats |

### MCP Tool Usage Examples

```typescript
// Load a snapshot
mcp_ellymud.load_test_snapshot({ name: 'fresh' })

// Save current state as new snapshot
mcp_ellymud.save_test_snapshot({ name: 'my-scenario', overwrite: true })

// Reset to clean state
mcp_ellymud.reset_game_state({})

// Set player stats for testing
mcp_ellymud.set_player_stats({
  username: 'testuser',
  health: 10,      // Set to low health
  maxHealth: 100,
  gold: 1000       // Give gold for testing
})

// Combine with virtual session for full E2E test
const session = mcp_ellymud.direct_login({ username: 'testuser' })
mcp_ellymud.set_player_stats({ username: 'testuser', health: 10 })
mcp_ellymud.virtual_session_command({ sessionId: session.sessionId, command: 'rest' })
mcp_ellymud.advance_game_ticks({ ticks: 12 })  // Trigger regen
```

## Conventions

### Test Mode Initialization

```typescript
// ✅ Correct - use bootTestMode for test mode
if (config.TEST_MODE) {
  gameServer.bootTestMode({ enableTimer: false });
} else {
  gameServer.start();
}

// ❌ Incorrect - calling start() in test mode starts the timer
gameServer.start();
gameTimerManager.setTestMode(true);  // Timer already running!
```

### Tick Advancement

```typescript
// ✅ Correct - advance specific number of ticks
gameTimerManager.advanceTicks(1);  // Single tick for precision
gameTimerManager.advanceTicks(12); // Full regen cycle

// ❌ Incorrect - using forceTick directly in tests
gameTimerManager.forceTick();  // Works but advanceTicks is preferred
```

## Common Tasks

### Testing Combat Over Multiple Rounds

```typescript
// 1. Set up combat scenario
virtualSession.command('attack goblin');

// 2. Advance ticks to process combat rounds
for (let round = 0; round < 5; round++) {
  gameTimerManager.advanceTicks(1);
  // Check combat state after each round
}

// 3. Verify final state
```

### Testing Effect Expiration

```typescript
// 1. Apply an effect (e.g., 5-tick duration)
virtualSession.command('cast poison target');

// 2. Advance past effect duration
gameTimerManager.advanceTicks(6);

// 3. Verify effect expired
```

## Gotchas & Warnings

- ⚠️ **Order Matters**: Call `bootTestMode()` instead of `start()` - don't start then set test mode
- ⚠️ **Timer State**: Test mode sets `testMode=true` AND stops timer if running
- ⚠️ **Tick Processing**: `advanceTicks(N)` calls `forceTick()` N times synchronously
- ⚠️ **Data Saves**: Auto-saves still trigger at save intervals if ticks advance far enough
- ⚠️ **MCP Dependency**: Test mode tools require MCP server to be running

## Related Context

- [`../timer/gameTimerManager.ts`](../timer/gameTimerManager.ts) - Test mode implementation
- [`../mcp/mcpServer.ts`](../mcp/mcpServer.ts) - MCP endpoints for test mode
- [`../config/cliConfig.ts`](../config/cliConfig.ts) - CLI flag parsing
- [`../config.ts`](../config.ts) - TEST_MODE export
- [`../app.ts`](../app.ts) - bootTestMode() method
