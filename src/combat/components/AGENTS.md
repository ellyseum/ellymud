# Combat Components - LLM Context

## Overview

Combat is decomposed into modular components following the Single Responsibility Principle. Each component handles one aspect of combat, making the system easier to understand and modify.

## Component Architecture

```
CombatSystem
├── EntityTracker      - WHO is in combat WHERE
├── CombatProcessor    - WHAT happens each turn
├── CombatNotifier     - HOW players are informed
├── PlayerDeathHandler - WHAT happens on death
├── CombatEventBus     - HOW components communicate
├── CombatCommand      - ACTIONS players can take
└── CombatState        - PHASES of combat
```

## File Reference

### `EntityTracker.ts`

**Purpose**: Track combat entities (NPCs, players) by room

```typescript
export class EntityTracker {
  getEntitiesInRoom(roomId: string): CombatEntity[];
  addEntity(roomId: string, entity: CombatEntity): void;
  removeEntity(roomId: string, entityId: string): void;
  findEntityByName(roomId: string, name: string): CombatEntity | undefined;
}
```

**Usage**: Finding valid targets in a room

### `CombatProcessor.ts`

**Purpose**: Process combat turns and calculate damage

```typescript
export class CombatProcessor {
  processTurn(combat: Combat): CombatResult;
  calculateDamage(attacker: CombatEntity, defender: CombatEntity): number;
  applyDamage(target: CombatEntity, damage: number): void;
}
```

**Usage**: Called each game tick to advance all combats

### `CombatNotifier.ts`

**Purpose**: Send combat messages to relevant players

```typescript
export class CombatNotifier {
  notifyPlayer(client: ConnectedClient, message: string): void;
  notifyRoom(roomId: string, message: string, exclude?: string[]): void;
  notifyCombatStart(client: ConnectedClient, npc: NPC): void;
  notifyCombatEnd(client: ConnectedClient, result: CombatResult): void;
}
```

**Usage**: All combat output goes through this

### `PlayerDeathHandler.ts`

**Purpose**: Handle player death, respawn, and penalties

```typescript
export class PlayerDeathHandler {
  handlePlayerHealth(client: ConnectedClient, roomId: string): void;
  respawnPlayer(client: ConnectedClient): void;
  applyDeathPenalty(client: ConnectedClient): void;
}
```

**Usage**: Called when player health reaches 0

### `CombatEventBus.ts`

**Purpose**: Pub/sub system for combat events

```typescript
export class CombatEventBus {
  on(event: string, handler: Function): void;
  emit(event: string, data: any): void;
  off(event: string, handler: Function): void;
}
```

**Events**:

- `player.damage` - Player took damage
- `npc.damage` - NPC took damage
- `combat.start` - Combat initiated
- `combat.end` - Combat finished
- `player.death` - Player died

### `CombatCommand.ts`

**Purpose**: Command pattern for combat actions

```typescript
export interface CombatCommand {
  execute(): void;
  undo(): void;
}

export class AttackCommand implements CombatCommand {}
export class FleeCommand implements CombatCommand {}
```

### `CombatState.ts`

**Purpose**: State pattern for combat phases

```typescript
export interface CombatState {
  enter(combat: Combat): void;
  processTurn(combat: Combat): CombatState;
  exit(combat: Combat): void;
}

export class ActiveCombatState implements CombatState {}
export class FleeingCombatState implements CombatState {}
```

## Conventions

### Adding a New Component

```typescript
// 1. Define interface
export interface IMyComponent {
  doThing(): void;
}

// 2. Implement component
export class MyComponent implements IMyComponent {
  constructor(private dependencies: Dependencies) {}

  doThing(): void {
    // Implementation
  }
}

// 3. Inject into CombatSystem
constructor() {
  this.myComponent = new MyComponent(deps);
}
```

### Event Handling

```typescript
// Emitting events
this.eventBus.emit('combat.damage', {
  target: client,
  amount: damage,
  source: npc,
});

// Listening for events
this.eventBus.on('combat.damage', (data) => {
  this.handleDamage(data);
});
```

## Gotchas & Warnings

- ⚠️ **Circular Dependencies**: Components should not import each other directly
- ⚠️ **Event Cleanup**: Remember to unsubscribe handlers when combat ends
- ⚠️ **State Transitions**: Always go through state machine for phase changes
- ⚠️ **Notification Timing**: Notify after state changes, not before

## Related Context

- [`../combatSystem.ts`](../combatSystem.ts) - Parent that orchestrates components
- [`../../utils/socketWriter.ts`](../../utils/socketWriter.ts) - CombatNotifier uses this
- [`../../types.ts`](../../types.ts) - ConnectedClient and User types
