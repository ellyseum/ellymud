# Combat System - LLM Context

## Overview

The combat system manages all player vs NPC combat in EllyMUD. It uses an event-driven architecture with the Singleton pattern for the main `CombatSystem` class. Combat is turn-based, processing on game ticks from `GameTimerManager`.

## Architecture

```
CombatSystem (Singleton)
├── combats: Map<username, Combat>
├── EntityTracker - Tracks entities in rooms
├── CombatProcessor - Processes combat ticks
├── CombatNotifier - Sends messages to players
├── PlayerDeathHandler - Handles player death
├── CombatEventBus - Event pub/sub
└── CombatCommandFactory - Creates combat actions
```

## File Reference

### `combatSystem.ts`

**Purpose**: Core singleton that orchestrates all combat interactions

**Key Exports**:

```typescript
export class CombatSystem {
  static getInstance(userManager: UserManager, roomManager: RoomManager): CombatSystem;

  // Start combat between player and NPC
  startCombat(client: ConnectedClient, npcName: string): void;

  // Get active combat for player
  getCombatForPlayer(username: string): Combat | undefined;

  // Process all active combats (called on tick)
  processCombatTick(): void;

  // Remove combat instance
  removeCombatForPlayer(username: string): void;
}
```

**Singleton Pattern**:

```typescript
// ✅ Correct
const combat = CombatSystem.getInstance(userManager, roomManager);

// ❌ Incorrect - constructor is private
const combat = new CombatSystem(userManager, roomManager);
```

### `combat.ts`

**Purpose**: Individual combat instance between a player and one or more NPCs

**Key Exports**:

```typescript
export class Combat {
  constructor(player: ConnectedClient, opponents: CombatEntity[], roomManager: RoomManager);

  processTurn(): CombatResult;
  addOpponent(npc: CombatEntity): void;
  removeOpponent(id: string): void;
  isOver(): boolean;
}
```

### `combatEntity.interface.ts`

**Purpose**: Interface for anything that participates in combat

```typescript
export interface CombatEntity {
  id: string;
  name: string;
  health: number;
  maxHealth: number;
  attack: number;
  defense: number;
  isAlive(): boolean;
  takeDamage(amount: number): void;
  dealDamage(): number;
}
```

### `npc.ts`

**Purpose**: NPC class implementing CombatEntity

**Key Exports**:

```typescript
export class NPC implements CombatEntity {
  id: string;
  name: string;
  health: number;
  maxHealth: number;
  attack: number;
  defense: number;
  roomId: string;
  
  // Merchant properties
  merchant: boolean;
  inventory: string[]; // List of item IDs

  // Combat methods
  isAlive(): boolean;
  takeDamage(amount: number): void;
  dealDamage(): number;

  // Respawn handling
  shouldRespawn(): boolean;
  getRespawnTime(): number;
}
```

### `components/` Directory

Modular combat subsystems:

| File                    | Purpose                            |
| ----------------------- | ---------------------------------- |
| `EntityTracker.ts`      | Tracks combat entities per room    |
| `CombatProcessor.ts`    | Processes combat turns and damage  |
| `CombatNotifier.ts`     | Sends combat messages to players   |
| `PlayerDeathHandler.ts` | Handles player death and respawn   |
| `CombatEventBus.ts`     | Event pub/sub for combat events    |
| `CombatCommand.ts`      | Command pattern for combat actions |
| `CombatState.ts`        | State pattern for combat phases    |

## Combat Flow

### Starting Combat

```typescript
// In attack.command.ts
const combatSystem = services.combatSystem;
combatSystem.startCombat(client, npcName);

// This:
// 1. Finds NPC in room
// 2. Creates Combat instance
// 3. Sets client.user.inCombat = true
// 4. Sends combat start message
// 5. Registers with EntityTracker
```

### Combat Processing (on tick)

```typescript
// In GameTimerManager
combatSystem.processCombatTick();

// For each active combat:
// 1. Player attacks NPC (damage calculation)
// 2. NPC attacks player (damage calculation)
// 3. Check for deaths
// 4. Send combat messages
// 5. If NPC dead, end combat + drop loot
// 6. If player dead, handle death
```

### Ending Combat

```typescript
// Combat ends when:
// - NPC health <= 0 (victory)
// - Player health <= 0 (death)
// - Player flees (break command)
// - Player moves to different room
```

## Conventions

### Safe Zones

Combat cannot be initiated in rooms with the `safe` flag. The `CombatSystem` or `CombatProcessor` checks this flag before starting combat.

### Damage Calculation

```typescript
// Base damage formula
const baseDamage = attacker.attack;
const randomFactor = Math.random() * 0.4 + 0.8; // 80-120%
const damage = Math.floor(baseDamage * randomFactor);
const finalDamage = Math.max(1, damage - defender.defense);
```

### Combat Messages

```typescript
// Use CombatNotifier for all combat output
combatNotifier.notifyPlayer(client, 'You swing at the goblin!');
combatNotifier.notifyRoom(roomId, 'Player attacks the goblin!', excludePlayer);

// ❌ Never write directly to socket in combat code
```

### Creating NPCs

```typescript
// NPCs are defined in data/npcs.json
// Spawned via spawn command or room configuration
const npc = new NPC({
  id: 'goblin-1',
  templateId: 'goblin',
  name: 'Goblin',
  health: 30,
  maxHealth: 30,
  attack: 5,
  defense: 2,
  roomId: 'forest-1',
});
```

## Common Tasks

### Adding a New Combat Effect

1. Create effect in `src/effects/`
2. Apply in `CombatProcessor.processTurn()`
3. Check effect in damage calculation

### Modifying Damage Formula

Edit `CombatProcessor.calculateDamage()`:

```typescript
calculateDamage(attacker: CombatEntity, defender: CombatEntity): number {
  // Modify formula here
}
```

### Adding NPC Abilities

1. Add ability to NPC template in `data/npcs.json`
2. Check for ability in `CombatProcessor`
3. Execute ability effect

## Gotchas & Warnings

- ⚠️ **Singleton**: Always use `getInstance()`, never `new CombatSystem()`
- ⚠️ **User State**: Always check `client.user.inCombat` before combat operations
- ⚠️ **Room Scope**: Combat is scoped to rooms—moving ends combat
- ⚠️ **No Persistence**: Combat state is NOT saved—server restart ends all combats
- ⚠️ **Tick Dependency**: Combat requires `GameTimerManager` to be running
- ⚠️ **Death Handling**: Player death teleports to start room, resets stats
- ⚠️ **Ability Manager**: Must call `setAbilityManager()` for spell/proc support

## Ability Integration

The combat system integrates with `AbilityManager` for spells and weapon procs:

### Combat Abilities

Combat abilities (type: `combat`) replace normal weapon attacks for N rounds:

```typescript
// In combatSystem.ts
combatSystem.setAbilityManager(abilityManager);

// In combat.ts processAttack()
if (this.abilityManager?.hasActiveCombatAbility(username)) {
  this.processCombatAbilityAttack(player, target, roomId);
  this.abilityManager.decrementCombatAbility(username);
  return;
}
// Falls through to normal weapon attack if no active combat ability
```

### Weapon Procs

Weapons with `procAbility` field can trigger special effects on hit:

```typescript
// After successful weapon hit
this.triggerWeaponProc(player, target, roomId);

// Inside triggerWeaponProc()
const result = this.abilityManager.checkWeaponProc(player, weaponId, target.name, true);
if (result.triggered) {
  // Effect already applied by AbilityManager
  writeFormattedMessageToClient(player, colorize(`Your weapon's ${result.abilityName} triggers!\r\n`, 'magenta'));
}
```

### Round Synchronization

Combat rounds sync with ability cooldowns:

```typescript
// In GameTimerManager tick
abilityManager.setCurrentRound(combatSystem.getCurrentRound());
abilityManager.onGameTick();
```

## Related Context

- [`../timer/gameTimerManager.ts`](../timer/gameTimerManager.ts) - Triggers combat ticks
- [`../command/commands/attack.command.ts`](../command/commands/attack.command.ts) - Initiates combat
- [`../command/commands/break.command.ts`](../command/commands/break.command.ts) - Flee combat
- [`../room/roomManager.ts`](../room/roomManager.ts) - Room-scoped combat
- [`../user/userManager.ts`](../user/userManager.ts) - Player stats
- [`../../data/npcs.json`](../../data/npcs.json) - NPC definitions
