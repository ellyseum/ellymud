# Testing - LLM Context

## Overview

The `testing/` directory provides infrastructure for running EllyMUD in a deterministic test mode. This is essential for E2E testing where the game timer must be controlled externally rather than running on real-time intervals.

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

Three MCP tools support test mode:

| Tool | Endpoint | Description |
|------|----------|-------------|
| `set_test_mode` | POST `/api/test/mode` | Enable/disable test mode |
| `advance_game_ticks` | POST `/api/test/advance-ticks` | Advance N ticks |
| `get_game_tick` | GET `/api/test/tick-count` | Get current tick count |

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
