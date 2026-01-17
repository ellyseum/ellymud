# Combat System

Event-driven combat system handling player vs NPC battles, damage calculations, turn processing, and death handling.

## Contents

| Path                        | Description                                       |
| --------------------------- | ------------------------------------------------- |
| `combatSystem.ts`           | Core singleton orchestrating all combat           |
| `combat.ts`                 | Individual combat instance between two entities   |
| `combatEntity.interface.ts` | Interface for anything that can fight             |
| `npc.ts`                    | NPC class with stats, AI, and combat capabilities |
| `merchantStateManager.ts`   | Singleton managing merchant inventory persistence |
| `components/`               | Modular combat subsystems                         |

## How Combat Works

1. **Initiation**: Player uses `attack <target>` command
2. **Combat Created**: `CombatSystem` creates a `Combat` instance
3. **Turn Processing**: Each game tick, combat rounds are processed
4. **Damage Calculation**: Based on attacker/defender stats and equipment
5. **Resolution**: Combat ends when one party dies or flees

## Combat Flow

```
Player: attack goblin
    ↓
CombatSystem.initiateCombat(player, goblin)
    ↓
Combat instance created and tracked
    ↓
GameTimer tick → CombatSystem.processCombatTick()
    ↓
Damage calculated, HP reduced, messages sent
    ↓
If HP <= 0 → PlayerDeathHandler or NPC death
```

## NPC AI

NPCs have different aggression levels:

- **Passive**: Never attacks first
- **Neutral**: Attacks if provoked
- **Aggressive**: Attacks players on sight

## Safe Zones

Rooms flagged as `safe` prevent combat initiation. Players cannot attack or be attacked in these rooms.

## Merchants

Some NPCs are flagged as merchants and can trade items. They have:
- `merchant` flag: True if they can trade
- `inventory`: List of items they sell

## Ability Integration

The combat system integrates with the ability system for:

- **Combat Abilities**: Replace weapon attacks with spell attacks
- **Weapon Procs**: Auto-triggered abilities during weapon hits

See [src/abilities/](../abilities/) for ability system documentation.

## Related

- [src/abilities/](../abilities/) - Ability system with combat integration
- [src/command/commands/attack.command.ts](../command/commands/attack.command.ts) - Initiates combat
- [src/timer/](../timer/) - Game timer triggers combat ticks
- [src/room/](../room/) - Combat is room-scoped
- [data/npcs.json](../../data/npcs.json) - NPC definitions
