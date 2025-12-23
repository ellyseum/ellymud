# Combat Components

Modular subsystems that compose the combat system. Each component handles one specific aspect of combat.

## Contents

| File | Purpose |
|------|---------|  
| `EntityTracker.ts` | Tracks all combatable entities in rooms for targeting |
| `CombatProcessor.ts` | Processes combat turns, calculates damage |
| `CombatNotifier.ts` | Sends combat messages to participants and observers |
| `PlayerDeathHandler.ts` | Handles player death, respawn, XP penalties |
| `CombatEventBus.ts` | Pub/sub system for combat events |
| `CombatCommand.ts` | Command pattern for combat actions |
| `CombatState.ts` | State pattern for combat phases |

## Component Responsibilities

**EntityTracker**:
- Maintains registry of entities per room
- Enables target resolution ("attack goblin")
- Tracks entity state (alive, dead, in combat)

**CombatProcessor**:
- Calculates damage based on stats and equipment
- Applies damage modifiers (criticals, resists)
- Determines hit/miss based on accuracy

**CombatNotifier**:
- Formats combat messages with colors
- Sends to attacker, defender, and room
- Handles different message types (hit, miss, death)

**PlayerDeathHandler**:
- Processes player death
- Applies XP/gold penalties
- Handles respawn to safe room
- Clears combat state

**CombatEventBus**:
- Decouples combat events from handlers
- Allows systems to react to combat (logging, achievements)
- Events: COMBAT_START, DAMAGE_DEALT, ENTITY_DIED

## Design Pattern

The combat system uses composition over inheritance:
- Single responsibility per component
- Components are injected into CombatSystem
- Easy to test and modify individual pieces

## Related

- [combatSystem.ts](../combatSystem.ts) - Orchestrates these components
- [combat.ts](../combat.ts) - Individual combat instances
