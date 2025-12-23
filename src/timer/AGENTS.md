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
private processTick(): void {
  // 1. Process combat
  this.combatSystem.processCombatTick();

  // 2. Process effects
  this.effectManager.processEffectTick();

  // 3. Process NPC AI
  this.processNPCAI();

  // 4. Regeneration (health, mana)
  this.processRegeneration();

  // 5. Auto-save
  this.checkAutoSave();
}
```

## Tick Timing

Default tick interval: 2000ms (configurable)

```typescript
// From config
const tickInterval = config.gameTickInterval || 2000;
```

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

## Gotchas & Warnings

- ⚠️ **Blocking Operations**: Don't do slow I/O in tick handlers
- ⚠️ **Error Handling**: Errors in tick should not crash loop
- ⚠️ **Singleton**: Use `getInstance()`, not constructor

## Related Context

- [`../combat/combatSystem.ts`](../combat/combatSystem.ts) - Combat processed here
- [`../effects/effectManager.ts`](../effects/effectManager.ts) - Effects processed here
- [`../config.ts`](../config.ts) - Tick interval config
