# Class System - LLM Context

## Overview

The class system manages character classes with a tiered advancement structure. Players start as Adventurers (tier 0) and can advance to specialized classes (tier 1) and eventually to elite classes (tier 2). Each advancement provides stat bonuses and unlocks new gameplay options.

## Architecture

```
ClassManager (Singleton)
├── classes: Map<string, CharacterClass>  - In-memory class cache
├── repository: IAsyncClassRepository     - Data persistence layer
└── Methods for advancement checking and stat calculation

Class Tree Structure:
┌─────────────────────────────────────────────────────────────────────────┐
│                           Tier 0                                         │
│                         Adventurer                                       │
│                    ┌───────┼───────┬───────┐                            │
│                    ↓       ↓       ↓       ↓                            │
│   Tier 1:      Fighter  Magic    Thief   Healer                         │
│                         User                                             │
│              ┌────┼────┐ ┌──┼──┐ ┌──┼──┐ ┌──┼──┐                        │
│              ↓    ↓    ↓ ↓  ↓  ↓ ↓  ↓  ↓ ↓  ↓  ↓                        │
│   Tier 2:  Pala Bers Kni Wiz Nec Ele Ass Ran Sha Cle Dru Sha            │
│            din rker ght ard rom ent ass nge dow ric uid man             │
└─────────────────────────────────────────────────────────────────────────┘

Data Flow:
┌─────────────────────────────────────────────────────────────┐
│ data/classes.json → AsyncFileClassRepository → ClassManager │
│                                                             │
│ Class Advancement:                                          │
│ train command → ClassManager.canAdvanceToClass()            │
│              → UserManager.updateUserClass()                │
└─────────────────────────────────────────────────────────────┘
```

## File Reference

### `classManager.ts`

**Purpose**: Singleton managing all class data and advancement operations

**Key Exports**:

```typescript
export interface ClassAdvancementResult {
  success: boolean;
  message: string;
  newClass?: CharacterClass;
}

export class ClassManager {
  // Singleton access
  static getInstance(): ClassManager;
  static resetInstance(): void;  // For testing

  // Initialization (async)
  ensureInitialized(): Promise<void>;

  // Class access
  getClass(classId: string): CharacterClass | undefined;
  getAllClasses(): CharacterClass[];
  classExists(classId: string): boolean;
  getClassName(classId: string): string;
  getClassTier(classId: string): number;

  // Tier-based queries
  getTier1Classes(): CharacterClass[];
  getTier2Classes(): CharacterClass[];
  getAvailableAdvancements(currentClassId: string): CharacterClass[];

  // Advancement checking
  canAdvanceToClass(
    user: User,
    targetClassId: string,
    hasTrainerNpc: boolean,
    trainerType?: string
  ): { canAdvance: boolean; reason: string };

  // Stat calculations
  getClassStatBonuses(classId: string): CharacterClass['statBonuses'] | null;
  getTotalClassBonuses(classHistory: string[]): CharacterClass['statBonuses'];
}
```

**Singleton Pattern**:

```typescript
// ✅ Correct
const classManager = ClassManager.getInstance();
await classManager.ensureInitialized();

// ❌ Incorrect - constructor is private
const classManager = new ClassManager();
```

## Class Data Structure

```typescript
interface CharacterClass {
  id: string;          // Unique identifier (e.g., "fighter", "paladin")
  name: string;        // Display name (e.g., "Fighter", "Paladin")
  description: string; // Lore/flavor text
  tier: number;        // 0 = adventurer, 1 = base classes, 2 = elite classes

  requirements: {
    level: number;              // Minimum level required
    previousClass: string | null; // Required previous class (null for tier 0)
    questFlag: string | null;   // Quest completion flag (tier 2 only)
    trainerType: string | null; // Trainer NPC type needed
  };

  statBonuses: {
    maxHealth: number;  // Bonus to max HP
    maxMana: number;    // Bonus to max MP
    attack: number;     // Bonus to attack
    defense: number;    // Bonus to defense
  };

  availableAdvancement: string[]; // Class IDs that can be advanced to
}
```

## Class Tier Structure

### Tier 0 - Starting Class

| Class      | Req Level | Advances To                              |
| ---------- | --------- | ---------------------------------------- |
| Adventurer | 1         | Fighter, Magic User, Thief, Healer       |

### Tier 1 - Base Classes

| Class      | Req Level | Trainer            | Advances To                      |
| ---------- | --------- | ------------------ | -------------------------------- |
| Fighter    | 5         | fighter_trainer    | Paladin, Berserker, Knight       |
| Magic User | 5         | mage_trainer       | Wizard, Necromancer, Elementalist|
| Thief      | 5         | thief_trainer      | Assassin, Ranger, Shadow         |
| Healer     | 5         | healer_trainer     | Cleric, Druid, Shaman            |

### Tier 2 - Elite Classes

| Class       | Req Level | Previous Class | Quest Flag         | Trainer             |
| ----------- | --------- | -------------- | ------------------ | ------------------- |
| Paladin     | 15        | Fighter        | paladin_trial      | paladin_trainer     |
| Berserker   | 15        | Fighter        | berserker_trial    | berserker_trainer   |
| Knight      | 15        | Fighter        | knight_trial       | knight_trainer      |
| Wizard      | 15        | Magic User     | wizard_trial       | wizard_trainer      |
| Necromancer | 15        | Magic User     | necromancer_trial  | necromancer_trainer |
| Elementalist| 15        | Magic User     | elementalist_trial | elementalist_trainer|
| Assassin    | 15        | Thief          | assassin_trial     | assassin_trainer    |
| Ranger      | 15        | Thief          | ranger_trial       | ranger_trainer      |
| Shadow      | 15        | Thief          | shadow_trial       | shadow_trainer      |
| Cleric      | 15        | Healer         | cleric_trial       | cleric_trainer      |
| Druid       | 15        | Healer         | druid_trial        | druid_trainer       |
| Shaman      | 15        | Healer         | shaman_trial       | shaman_trainer      |

## Requirements System

Class advancement requires meeting multiple criteria:

```typescript
// Check all requirements via canAdvanceToClass()
const result = classManager.canAdvanceToClass(
  user,           // User object
  'paladin',      // Target class ID
  true,           // Has trainer NPC in room?
  'paladin_trainer' // Trainer type (from NPC template)
);

if (!result.canAdvance) {
  // result.reason explains what's missing
  writeToClient(client, `Cannot advance: ${result.reason}\r\n`);
}
```

### Requirement Checks (in order)

1. **Class exists** - Target class must be valid
2. **Level requirement** - User must be >= required level
3. **Previous class** - User's current class must match requirement
4. **Advancement path** - Current class must list target in `availableAdvancement`
5. **Quest flag** (tier 2) - User must have completed the trial quest
6. **Trainer NPC** - Room must contain appropriate trainer NPC

## Conventions

### Async Initialization Pattern

```typescript
// ✅ Correct - wait for initialization before use
const classManager = ClassManager.getInstance();
await classManager.ensureInitialized();
const classes = classManager.getAllClasses();

// ❌ Incorrect - may access before data loaded
const classManager = ClassManager.getInstance();
const classes = classManager.getAllClasses(); // Might be empty!
```

### Checking Class Advancement

```typescript
// In train command
const room = roomManager.getRoom(user.currentRoomId);
const trainersInRoom = getTrainersInRoom(room);

const canAdvance = classManager.canAdvanceToClass(
  user,
  targetClassId,
  trainersInRoom.length > 0,
  trainersInRoom[0]?.trainerType
);
```

### Applying Class Change

```typescript
// Class changes go through UserManager, NOT directly
userManager.updateUserClass(user.username, targetClassId);

// This method:
// 1. Sets user.classId
// 2. Adds to user.classHistory
// 3. Saves the user
```

### Calculating Total Class Bonuses

```typescript
// Get cumulative bonuses from all classes in history
const classHistory = user.classHistory ?? ['adventurer'];
const totalBonuses = classManager.getTotalClassBonuses(classHistory);
// Returns: { maxHealth: N, maxMana: N, attack: N, defense: N }
```

## Common Tasks

### Adding a New Class

1. Edit `data/classes.json`:

```json
{
  "id": "battle_mage",
  "name": "Battle Mage",
  "description": "A warrior who combines martial prowess with arcane power.",
  "tier": 2,
  "requirements": {
    "level": 15,
    "previousClass": "magic_user",
    "questFlag": "battle_mage_trial",
    "trainerType": "battle_mage_trainer"
  },
  "statBonuses": {
    "maxHealth": 15,
    "maxMana": 35,
    "attack": 8,
    "defense": 5
  },
  "availableAdvancement": []
}
```

2. Add the new class ID to parent class's `availableAdvancement` array
3. Create trainer NPC if needed
4. Create trial quest if tier 2

### Adding Trainer NPC Support

In `train.command.ts`, add to `TRAINER_TYPES`:

```typescript
const TRAINER_TYPES: Record<string, string> = {
  // ... existing trainers ...
  battle_mage_trainer: 'battle_mage_trainer',
};
```

### Displaying Class Info

```typescript
const classId = user.classId ?? 'adventurer';
const className = classManager.getClassName(classId);
const classTier = classManager.getClassTier(classId);
const bonuses = classManager.getClassStatBonuses(classId);
```

## Gotchas & Warnings

- **Singleton**: Always use `getInstance()`, never `new ClassManager()`
- **Async Init**: Must call `ensureInitialized()` before accessing class data
- **Default Class**: If `user.classId` is undefined, default to `'adventurer'`
- **Class History**: Always check `user.classHistory` exists before using
- **Trainer Location**: Class advancement only works in training rooms with trainers
- **Quest Flags**: Tier 2 classes require quest completion (not yet fully implemented)
- **Stat Bonuses Stack**: When advancing, new class bonuses ADD to existing stats
- **Universal Trainer**: Legacy `trainer_1` NPC can train all tier 1 classes

## Trainer NPC Mapping

The `train` command maps NPC template IDs to trainer types:

```typescript
const TRAINER_TYPES = {
  'fighter_trainer': 'fighter_trainer',
  'mage_trainer': 'mage_trainer',
  // ... etc
  'trainer_1': 'universal_trainer',  // Legacy universal trainer
};
```

## Data File Location

- **File**: `data/classes.json`
- **Format**: `{ "classes": [...] }`
- **Repository**: `AsyncFileClassRepository`

## Integration Points

### Train Command

```
train           - Level up (gain XP-based level)
train stats     - Enter stat editor
train class     - View available class advancements
train class <n> - Attempt class advancement
```

### Stats Command

Displays current class, tier, and class history.

### User Object Fields

```typescript
interface User {
  classId?: string;        // Current class ("adventurer", "fighter", etc.)
  classHistory?: string[]; // All classes ever held
  questFlags?: string[];   // Completed quests (for tier 2 requirements)
}
```

## Related Context

- [`../types.ts`](../types.ts) - CharacterClass interface definition
- [`../command/commands/train.command.ts`](../command/commands/train.command.ts) - Class advancement UI
- [`../command/commands/stats.command.ts`](../command/commands/stats.command.ts) - Displays class info
- [`../user/userManager.ts`](../user/userManager.ts) - `updateUserClass()` method
- [`../../data/classes.json`](../../data/classes.json) - Class data file
- [`../persistence/AsyncFileClassRepository.ts`](../persistence/AsyncFileClassRepository.ts) - File persistence
- [`../persistence/RepositoryFactory.ts`](../persistence/RepositoryFactory.ts) - `getClassRepository()`
- [`../room/roomManager.ts`](../room/roomManager.ts) - Training room flag check
- [`../combat/npc.ts`](../combat/npc.ts) - Trainer NPC templates
