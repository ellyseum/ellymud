# Combat Components

Modular subsystems that compose the combat system. Each component handles one aspect of combat.

## Contents

| File | Purpose |
|------|---------|
| `EntityTracker.ts` | Tracks entities in rooms for targeting |
| `CombatProcessor.ts` | Processes turns and calculates damage |
| `CombatNotifier.ts` | Sends combat messages to players |
| `PlayerDeathHandler.ts` | Handles player death, respawn, penalties |
| `CombatEventBus.ts` | Pub/sub for combat events |
| `CombatCommand.ts` | Command pattern for combat actions |
| `CombatState.ts` | State pattern for combat phases |

## Overview

The combat system is decomposed into single-responsibility components. This allows for easier testing, modification, and extension of combat behavior.

## Related

- [`../combatSystem.ts`](../combatSystem.ts) - Orchestrates these components
- [`../combat.ts`](../combat.ts) - Individual combat instances
