# Game Timer - LLM Context

## Overview

The `GameTimerManager` singleton runs the game loop. It triggers periodic processing of combat, effects, NPC AI, and other time-based events.

## File Reference

### `gameTimerManager.ts`

**Purpose**: Singleton managing game ticks

```typescript
export class GameTimerManager {
  static getInstance(userManager: UserManager, roomManager: RoomManager): GameTimerManager;

  start(): void;
  stop(): void;
  getCombatSystem(): CombatSystem;

  // Tick interval in milliseconds
  readonly tickInterval: number;
}
```

**Tick Processing**:

```typescript
private tick(): void {
  // 1. Process effects (stat modifiers apply first)
  this.effectManager.processGameTick(this.tickCount);

  // 2. Process combat
  this.combatSystem.processCombatRound();
  this.combatSystem.processRoomCombat();

  // 3. Process resting/meditating tick counters + mini meditation bonuses
  this.processRestMeditateTicks();

  // 4. Regeneration every 24 ticks (2x bonus for resting/meditating)
  if (this.tickCount % 24 === 0) {
    this.processRegeneration();
  }

  // 5. Auto-save
  if (this.tickCount % this.config.saveInterval === 0) {
    this.forceSave();
  }
}
```

## Tick Timing

Default tick interval: 6000ms (configurable in `data/gametimer-config.json`)

```typescript
// From config file
const DEFAULT_CONFIG = {
  tickInterval: 6000,  // 6 seconds per tick
  saveInterval: 10     // Save every 10 ticks
};
```

## Resting & Meditation System

The timer manages regeneration states for all active players.

### Tick Counters

```typescript
// User properties tracked:
client.user.isResting: boolean      // Currently in rest state
client.user.isMeditating: boolean   // Currently in meditation state
client.user.restingTicks: number    // Ticks spent resting (0-N)
client.user.meditatingTicks: number // Ticks spent meditating (0-N)
```

### Mini Meditation Bonus

Every 6 meditating ticks, players receive a small MP bonus:

```typescript
// Formula: max(1, floor(wisdom/10) + floor(intelligence/10))
// At Wis=20, Int=20: +4 MP per mini bonus
```

### Full Regeneration (Every 24 Ticks)

```typescript
// Base HP Regen: max(1, floor(constitution/5))
// Resting Bonus: 2x HP regen (if restingTicks >= 4)

// Base MP Regen: max(1, floor((wisdom + intelligence)/10))
// Meditating Bonus: 2x MP regen (if meditatingTicks >= 4)
```

### State Clearing

States are automatically cleared when:
- Player enters combat
- Player becomes unconscious
- Player moves (via `clearRestingMeditating()` utility)
- Player attacks (via `clearRestingMeditating()` utility)
- Player takes damage (via `clearRestingMeditating()` utility)

## Conventions

### Starting the Timer

```typescript
// In GameServer.start()
this.gameTimerManager = GameTimerManager.getInstance(userManager, roomManager);
this.gameTimerManager.start();
```

### Getting Combat System

```typescript
// Combat system is managed by timer
const combatSystem = gameTimerManager.getCombatSystem();
```

### Getting Active Users for Processing

```typescript
// Use UserManager.getAllActiveUserSessions() for iteration
const activeUsers = this.userManager.getAllActiveUserSessions();
for (const [username, client] of activeUsers) {
  // Process each user
}
```

## Test Mode

The timer supports a test mode for deterministic E2E testing where ticks are advanced programmatically.

### Test Mode Methods

```typescript
// Enable/disable test mode (pauses timer when enabled)
setTestMode(enabled: boolean): void;

// Advance multiple ticks synchronously
advanceTicks(count: number): void;

// Get current tick count
getTickCount(): number;

// Reset tick count to zero
resetTickCount(): void;
```

### Test Mode Behavior

```typescript
// When test mode is enabled:
public start(): void {
  if (this.testMode) {
    timerLogger.info('Game timer start prevented (Test Mode active)');
    return;  // Timer does NOT auto-start
  }
  // ... normal start
}

// Manual tick advancement:
public advanceTicks(count: number): void {
  for (let i = 0; i < count; i++) {
    this.forceTick();  // Process one full tick
  }
}
```

### Usage in E2E Tests

```typescript
// 1. Boot server in test mode (timer paused)
gameServer.bootTestMode({ enableTimer: false });

// 2. Advance ticks as needed
gameTimerManager.advanceTicks(1);   // Single tick
gameTimerManager.advanceTicks(12);  // Full regen cycle

// 3. Check game state after each advancement
```

## Gotchas & Warnings

- ⚠️ **Blocking Operations**: Don't do slow I/O in tick handlers
- ⚠️ **Error Handling**: Errors in tick should not crash loop
- ⚠️ **Singleton**: Use `getInstance()`, not constructor
- ⚠️ **State Validation**: Always check `inCombat` and `isUnconscious` before applying regen
- ⚠️ **Tick Order**: Effects process before combat, resting tracks before regen
- ⚠️ **Test Mode Start**: Use `bootTestMode()` not `start()` then `setTestMode()` - order matters
- ⚠️ **Synchronous Ticks**: `advanceTicks(N)` processes all N ticks synchronously in one call

## Related Context

- [`../combat/combatSystem.ts`](../combat/combatSystem.ts) - Combat processed here
- [`../effects/effectManager.ts`](../effects/effectManager.ts) - Effects processed here
- [`../utils/stateInterruption.ts`](../utils/stateInterruption.ts) - State clearing utility
- [`../user/userManager.ts`](../user/userManager.ts) - User session iteration
- [`../testing/testMode.ts`](../testing/testMode.ts) - Test mode options interface
- [`../mcp/mcpServer.ts`](../mcp/mcpServer.ts) - MCP tools for test mode control
- [`../../data/gametimer-config.json`](../../data/gametimer-config.json) - Timer configuration
