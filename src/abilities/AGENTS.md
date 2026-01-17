# Abilities System - LLM Context

## Overview

The abilities system manages spellcasting, item abilities, weapon procs, and combat enhancements. It's a singleton pattern that integrates with `EffectManager`, `UserManager`, and `RoomManager` to apply effects to players and NPCs.

**Key Concepts:**
- **Standard Abilities**: Spells cast via `cast <ability>` command
- **Combat Abilities**: Replace weapon attacks for N rounds (e.g., Flame Blade)
- **Proc Abilities**: Trigger randomly on weapon hits
- **Item Abilities**: Triggered via `use <item>` command

## Architecture

```
AbilityManager (Singleton)
├── abilities: Map<id, AbilityTemplate>     - Loaded from data/abilities.json
├── playerCooldowns: Map<username, PlayerCooldowns>
├── activeCombatAbilities: Map<username, {abilityId, remainingRounds}>
├── currentRound: number                     - Synced with combat ticks
└── Dependencies:
    ├── UserManager - Mana deduction, user stats
    ├── RoomManager - Target resolution
    └── EffectManager - Effect application
```

## File Reference

### `types.ts`

**Purpose**: Type definitions for the ability system

**Key Exports**:

```typescript
export enum AbilityType {
  STANDARD = 'standard',  // Cast via 'cast' command
  COMBAT = 'combat',      // Replaces attacks for N rounds
  PROC = 'proc',          // Triggers on weapon hit
  ITEM = 'item',          // Triggered via 'use' command
}

export enum CooldownType {
  ROUNDS = 'rounds',      // Combat rounds (synced with ticks)
  SECONDS = 'seconds',    // Real-time seconds
  USES = 'uses',          // Limited number of uses
}

export enum TargetType {
  SELF = 'self',
  ENEMY = 'enemy',
  ALLY = 'ally',
  ROOM = 'room',
}

export interface AbilityTemplate {
  id: string;
  name: string;
  description: string;
  type: AbilityType;
  mpCost: number;
  cooldownType: CooldownType;
  cooldownValue: number;
  targetType: TargetType;
  effects: AbilityEffect[];
  requirements?: AbilityRequirements;
  procChance?: number;       // For proc abilities (0-1)
  consumesItem?: boolean;    // For item abilities
}

export interface AbilityEffect {
  effectType: string;        // Matches EffectType enum
  payload: {
    damagePerTick?: number;
    healPerTick?: number;
    damageAmount?: number;
    healAmount?: number;
    statModifiers?: { [stat: string]: number };
    blockMovement?: boolean;
    blockCombat?: boolean;
  };
  durationTicks: number;
  tickInterval: number;
  stackingBehavior?: StackingBehavior;
  name?: string;
  description?: string;
}
```

### `abilityManager.ts`

**Purpose**: Singleton manager for all ability operations

**Async Initialization Pattern**:

AbilityManager uses the repository pattern with async initialization:

```typescript
// Repository + async init pattern
private repository = getAbilityRepository();
private initialized = false;
private initPromise: Promise<void> | null = null;

constructor() {
  this.initPromise = this.initialize();
}

private async initialize(): Promise<void> {
  if (this.initialized) return;
  const abilities = await this.repository.findAll();
  abilities.forEach(ability => this.abilities.set(ability.id, ability));
  this.initialized = true;
  this.initPromise = null;
}

public async ensureInitialized(): Promise<void> {
  if (this.initPromise) await this.initPromise;
}
```

**Key Exports**:

```typescript
export interface CanUseResult {
  ok: boolean;
  reason?: string;
}

export class AbilityManager extends EventEmitter {
  static getInstance(
    userManager: UserManager,
    roomManager: RoomManager,
    effectManager: EffectManager
  ): AbilityManager;

  static resetInstance(): void;

  // Ability queries
  getAbility(id: string): AbilityTemplate | undefined;
  getAllAbilities(): AbilityTemplate[];
  getAbilitiesByType(type: AbilityType): AbilityTemplate[];

  // Cooldown management
  canUseAbility(username: string, abilityId: string): CanUseResult;
  isOnCooldown(username: string, abilityId: string): boolean;
  getCooldownRemaining(username: string, abilityId: string): number;
  clearCooldowns(username: string): void;

  // Mana management
  useMana(username: string, amount: number): boolean;
  hasMana(username: string, amount: number): boolean;

  // Ability execution
  executeAbility(client: ConnectedClient, abilityId: string, targetId?: string): boolean;
  executeItemAbility(client: ConnectedClient, itemId: string, targetId?: string): boolean;

  // Combat abilities
  activateCombatAbility(username: string, abilityId: string, rounds: number): boolean;
  hasActiveCombatAbility(username: string): boolean;
  getActiveCombatAbility(username: string): AbilityTemplate | undefined;
  decrementCombatAbility(username: string): void;
  executeCombatAbilityAttack(client: ConnectedClient, targetId: string, isNpc: boolean): {
    hit: boolean;
    damage: number;
    message: string;
  };

  // Weapon procs
  checkWeaponProc(client: ConnectedClient, weaponId: string, targetId: string, isNpcTarget: boolean): {
    triggered: boolean;
    abilityName?: string;
  };

  // Tick management
  setCurrentRound(round: number): void;
  getCurrentRound(): number;
  onGameTick(): void;
}
```

**Usage Examples**:

```typescript
// Get instance (singleton)
const abilityManager = AbilityManager.getInstance(userManager, roomManager, effectManager);

// ✅ Correct - await ensureInitialized before use
await abilityManager.ensureInitialized();

// Cast a spell
abilityManager.executeAbility(client, 'fireball', 'goblin');

// Check if ability can be used
const check = abilityManager.canUseAbility('player1', 'heal');
if (!check.ok) {
  console.log(check.reason); // "Not enough mana." or "On cooldown."
}

// Activate combat ability (replaces attacks)
abilityManager.activateCombatAbility('player1', 'flame_blade', 5);

// In combat round processing
if (abilityManager.hasActiveCombatAbility(username)) {
  const result = abilityManager.executeCombatAbilityAttack(client, npcId, true);
  abilityManager.decrementCombatAbility(username);
}
```

### `index.ts`

**Purpose**: Re-exports types and AbilityManager

```typescript
export * from './types';
export * from './abilityManager';
```

## Data Format

Abilities are defined in `data/abilities.json`:

```json
{
  "id": "fireball",
  "name": "Fireball",
  "description": "Hurls a ball of fire at your enemy",
  "type": "standard",
  "mpCost": 15,
  "cooldownType": "rounds",
  "cooldownValue": 3,
  "targetType": "enemy",
  "effects": [
    {
      "effectType": "damage_over_time",
      "payload": { "damagePerTick": 5 },
      "durationTicks": 4,
      "tickInterval": 1,
      "name": "Burning",
      "description": "Taking fire damage"
    }
  ]
}
```

## Conventions

### Creating New Abilities

1. Add ability definition to `data/abilities.json`
2. Ensure `effectType` matches a handler in `EffectManager`
3. Set appropriate `cooldownType` and `cooldownValue`

```json
// ✅ Correct - effectType matches EffectManager handler
{
  "effectType": "damage_over_time",
  "payload": { "damagePerTick": 5 }
}

// ❌ Incorrect - unknown effect type
{
  "effectType": "magic_missile",
  "payload": { "damage": 10 }
}
```

### Ability Type Selection

| Use Case | Type | Notes |
|----------|------|-------|
| Player casts spell | `standard` | Triggered via `cast` command |
| Weapon enchantment | `combat` | Replaces attacks for N rounds |
| Weapon effect | `proc` | Random trigger on hit |
| Potion/scroll | `item` | Triggered via `use` command |

### Target Resolution

```typescript
// Self-target abilities auto-target the caster
ability.targetType === 'self'  // → Targets player

// Enemy requires explicit target
ability.targetType === 'enemy' // → Requires 'cast fireball goblin'

// Ally defaults to self if no target
ability.targetType === 'ally'  // → 'cast heal' targets self
```

## Common Tasks

### Adding a New Spell

1. Add to `data/abilities.json`:
```json
{
  "id": "ice_bolt",
  "name": "Ice Bolt",
  "description": "Launches a bolt of ice",
  "type": "standard",
  "mpCost": 10,
  "cooldownType": "rounds",
  "cooldownValue": 2,
  "targetType": "enemy",
  "effects": [
    {
      "effectType": "damage_over_time",
      "payload": { "damagePerTick": 4 },
      "durationTicks": 3,
      "tickInterval": 1,
      "name": "Frozen",
      "description": "Taking cold damage"
    }
  ]
}
```

2. Test in game:
```
> cast ice_bolt goblin
You cast Ice Bolt!
```

### Adding Item with Ability

1. Add ability to `data/abilities.json` with `type: "item"`
2. Add item to `data/items.json` with `ability` field:
```json
{
  "id": "health_potion",
  "name": "Health Potion",
  "ability": "potion_heal",
  "type": "consumable"
}
```

3. Test: `use health potion`

### Adding Weapon Proc

1. Add ability with `type: "proc"` and `procChance`:
```json
{
  "id": "flame_proc",
  "type": "proc",
  "procChance": 0.15,
  "effects": [...]
}
```

2. Add to weapon in `data/items.json`:
```json
{
  "id": "flaming_sword",
  "procAbility": "flame_proc"
}
```

## Gotchas & Warnings

- ⚠️ **Singleton Pattern**: Always use `getInstance()`, never `new AbilityManager()`
- ⚠️ **Async Init Required**: Call `await ensureInitialized()` before accessing abilities
- ⚠️ **Effect Types**: `effectType` must match handlers in `EffectManager`
- ⚠️ **Mana Check**: Always verify mana before calling `executeAbility()`
- ⚠️ **Round Sync**: Call `setCurrentRound()` from combat tick to sync cooldowns
- ⚠️ **No Persistence**: Cooldowns reset on server restart
- ⚠️ **Target Required**: Enemy-target abilities fail without explicit target
- ⚠️ **Combat Ability Duration**: Combat abilities decrement per round, not per tick

## Useful Commands

```bash
# Test ability in game
> cast fireball goblin
> abilities
> use health potion

# Debug cooldowns (if admin)
> debug cooldowns player1
```

## Related Context

- [`../effects/effectManager.ts`](../effects/effectManager.ts) - Applies ability effects
- [`../combat/combat.ts`](../combat/combat.ts) - Combat ability integration
- [`../command/commands/cast.command.ts`](../command/commands/cast.command.ts) - Cast command
- [`../command/commands/abilities.command.ts`](../command/commands/abilities.command.ts) - View abilities
- [`../command/commands/use.command.ts`](../command/commands/use.command.ts) - Use items
- [`../../data/abilities.json`](../../data/abilities.json) - Ability definitions
- [`../schemas/abilities.schema.json`](../schemas/abilities.schema.json) - JSON schema
