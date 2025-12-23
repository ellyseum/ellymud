# Effects System - LLM Context

## Overview

The effects system manages temporary status effects on players and NPCs. Effects can modify stats, deal damage over time, restrict actions, or provide buffs.

## File Reference

### `effectManager.ts`

**Purpose**: Track and process active effects

```typescript
export class EffectManager {
  static getInstance(): EffectManager;

  applyEffect(target: CombatEntity, effect: Effect): void;
  removeEffect(target: CombatEntity, effectType: EffectType): void;
  getEffects(target: CombatEntity): Effect[];
  processEffectTick(): void;
}
```

## Effect Structure

```typescript
interface Effect {
  type: EffectType;
  name: string;
  duration: number; // Remaining ticks
  magnitude: number; // Effect strength
  source?: string; // Who applied it
  stackBehavior: StackBehavior;
}

enum EffectType {
  POISON, // Damage over time
  STUN, // Can't act
  ROOT, // Can't move
  BUFF_STR, // Strength increase
  DEBUFF_DEF, // Defense decrease
  // etc.
}

enum StackBehavior {
  REPLACE, // New replaces old
  REFRESH, // Reset duration
  STACK_DURATION, // Add durations
  STACK_INTENSITY, // Run independently
  STRONGEST_WINS, // Keep stronger
  IGNORE, // Don't apply if exists
}
```

## Effect Processing

Effects are processed on game ticks:

```typescript
// In GameTimerManager tick
effectManager.processEffectTick();

// For each active effect:
// 1. Apply effect (damage, stat mod, etc.)
// 2. Decrement duration
// 3. Remove if duration <= 0
// 4. Notify target of effect
```

## Conventions

### Applying Effects

```typescript
const poison: Effect = {
  type: EffectType.POISON,
  name: 'Poison',
  duration: 10,
  magnitude: 5, // 5 damage per tick
  stackBehavior: StackBehavior.REFRESH,
};

effectManager.applyEffect(target, poison);
```

### Checking Effects

```typescript
const effects = effectManager.getEffects(client.user);
const isPoisoned = effects.some((e) => e.type === EffectType.POISON);
const isRooted = effects.some((e) => e.type === EffectType.ROOT);
```

## Related Context

- [`../command/commands/effect.command.ts`](../command/commands/effect.command.ts) - Manual effect application
- [`../command/commands/root.command.ts`](../command/commands/root.command.ts) - Root effect
- [`../combat/`](../combat/) - Combat applies effects
- [`../types/effects.ts`](../types/effects.ts) - Effect type definitions
