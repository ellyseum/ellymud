# Game Timer

Game tick system for periodic events and time-based game mechanics.

## Contents

| File                  | Description                                 |
| --------------------- | ------------------------------------------- |
| `gameTimerManager.ts` | Singleton managing game ticks and intervals |

## What the Timer Does

The `GameTimerManager` runs the game's heartbeat - periodic ticks that drive:

- **Combat Processing**: Each tick processes combat rounds
- **Effect Duration**: Status effects tick down and expire
- **NPC AI**: NPCs make decisions and take actions
- **Regeneration**: Health/mana regeneration over time
- **Spawning**: NPC and item respawn timers
- **Auto-save**: Periodic data persistence

## Tick Configuration

Tick intervals are configured in `data/gametimer-config.json`:

- **Combat Tick**: How often combat rounds process (default: 2000ms)
- **Effect Tick**: How often effects are processed
- **Regen Tick**: How often HP/MP regenerates
- **Save Tick**: How often data auto-saves

## Timer Architecture

The timer uses Node.js `setInterval` for each tick type:

```
GameTimerManager
    ├── combatInterval → CombatSystem.processTick()
    ├── effectInterval → EffectManager.processTick()
    ├── regenInterval → UserManager.processRegen()
    └── saveInterval → saveAllData()
```

## Related

- [src/combat/](../combat/) - Combat processed on ticks
- [src/effects/](../effects/) - Effects processed on ticks
- [data/gametimer-config.json](../../data/gametimer-config.json) - Timer configuration
