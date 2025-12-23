# Effects System

Temporary status effects including buffs, debuffs, and damage-over-time effects.

## Contents

| File | Description |
|------|-------------|
| `effectManager.ts` | Manage active effects on players and NPCs |

## What Effects Do

Effects are temporary modifiers applied to entities:

- **Stat Modifiers**: Increase/decrease strength, speed, etc.
- **Damage Over Time**: Poison, burning, bleeding
- **Healing Over Time**: Regeneration buffs
- **Movement**: Slow, haste, root
- **Combat**: Stun, blind, vulnerability

## Effect Properties

Each effect has:
- `name` - Display name
- `type` - Category (buff, debuff, dot, hot)
- `duration` - Remaining ticks
- `magnitude` - Effect strength
- `stackable` - Whether multiple can apply
- `onTick()` - Called each game tick
- `onExpire()` - Called when effect ends

## Effect Processing

Effects are processed by the game timer:

1. Each tick, `EffectManager.processTick()` is called
2. Active effects have their `onTick()` method invoked
3. Duration is decremented
4. Expired effects are removed and `onExpire()` called

## Related

- [src/timer/](../timer/) - Triggers effect processing
- [src/combat/](../combat/) - Combat can apply effects
- [src/command/commands/](../command/commands/) - Effect commands
