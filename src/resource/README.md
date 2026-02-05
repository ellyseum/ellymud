# Resource System

Manages character resources (mana, rage, energy, ki, holy, nature) for different class archetypes. Each resource type has unique regeneration and consumption behaviors.

## Resource Types

| Type | Classes | Max Calculation | Regen Behavior |
|------|---------|-----------------|----------------|
| MANA | Magic User, Wizard, Necromancer, etc. | 20 + INT×3 + WIS×2 | 4 + INT/10 per tick, 2x when meditating |
| RAGE | Berserker | Fixed 100 | Gains on hit dealt/taken, decays out of combat |
| ENERGY | Thief, Assassin, Shadow | Fixed 100 | 25/tick always (fast regen) |
| KI | Monk classes | WIS×3 + level×2 | 3 + WIS/10 per tick, 3x when meditating |
| HOLY | Paladin, Cleric | 3-5 charges | 1 charge per 5 ticks (~30 seconds) |
| NATURE | Druid, Ranger, Shaman | 30 + WIS×2 | 3 + WIS/10 per tick |

## Usage

```typescript
import { ResourceManager } from './resourceManager';

const resourceManager = ResourceManager.getInstance();

// Get resource type for a user's class
const type = resourceManager.getResourceType(user);

// Get current/max resource values
const current = resourceManager.getCurrentResource(user);
const max = resourceManager.calculateMaxResource(user);

// Modify resources (abilities, combat)
resourceManager.spendResource(user, 20);
resourceManager.restoreResource(user, 10);

// Process tick (called by GameTimerManager)
resourceManager.processResourceTick(user, inCombat);
```

## Integration Points

- **GameTimerManager** - Calls `processResourceTick()` every game tick
- **AbilityManager** - Checks/spends resources for ability costs
- **CombatSystem** - Rage generation on damage dealt/taken
- **StatsCommand** - Displays current resource in character stats

## Files

- `resourceManager.ts` - Singleton manager for all resource operations

## Constants

See `RESOURCE_REGEN_RATES` export for all regen rate constants.
