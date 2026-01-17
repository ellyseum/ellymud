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
- **Rest/Meditate Tracking**: Tracks resting and meditating tick counters with mini meditation bonuses
- **Regeneration**: Health/mana regeneration with bonuses for resting/meditating players
- **Spawning**: NPC and item respawn timers
- **Auto-save**: Periodic data persistence

## Tick Configuration

Tick intervals are loaded from configuration storage (JSON file or database depending on `STORAGE_BACKEND`):

- **JSON backend**: `data/gametimer-config.json`
- **Database backend**: `gametimer_configs` table (singleton record)

Configuration options:
- **tickInterval**: Time between ticks in milliseconds (default: 6000ms)
- **saveInterval**: Number of ticks between auto-saves (default: 10)

## Timer Architecture

The timer uses Node.js `setInterval` for each tick type:

```
GameTimerManager
    ├── effectInterval → EffectManager.processGameTick()
    ├── combatInterval → CombatSystem.processCombatRound()
    ├── restMeditate  → processRestMeditateTicks() [with mini MP bonuses]
    ├── regenInterval → processRegeneration() [every 24 ticks]
    └── saveInterval  → saveAllData()
```

## Test Mode

The timer supports a test mode for deterministic E2E testing:

- **Test Mode Enabled**: Timer does not start automatically; ticks must be advanced manually
- **Manual Tick Advancement**: Call `advanceTicks(N)` to process N ticks immediately
- **MCP Integration**: Use MCP tools to control timing from external test harnesses

Test mode is activated via CLI: `npm start -- --test-mode`

## Related

- [src/combat/](../combat/) - Combat processed on ticks
- [src/effects/](../effects/) - Effects processed on ticks
- [src/testing/](../testing/) - Test mode infrastructure
- [src/mcp/](../mcp/) - MCP tools for test mode control
- [data/gametimer-config.json](../../data/gametimer-config.json) - Timer configuration
