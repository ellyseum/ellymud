# Race System - LLM Context

## Overview

The race system manages playable character races, their stat modifiers, and racial bonuses. It is integrated into character creation (race selection state) and affects gameplay through stat calculations and bonus effects.

## Architecture

```
RaceManager (Singleton)
├── races: Map<string, Race>           - In-memory race cache
├── repository: IAsyncRaceRepository   - Data persistence layer
└── Methods for stat calculation and bonus application

Data Flow:
┌─────────────────────────────────────────────────────────────┐
│ data/races.json → AsyncFileRaceRepository → RaceManager    │
│                                                             │
│ Character Creation:                                         │
│ SignupState → RaceSelectionState → UserManager.applyRace   │
└─────────────────────────────────────────────────────────────┘
```

## File Reference

### `raceManager.ts`

**Purpose**: Singleton managing all race data and operations

**Key Exports**:

```typescript
export class RaceManager {
  // Singleton access
  static getInstance(): RaceManager;
  static resetInstance(): void;  // For testing

  // Initialization (async)
  ensureInitialized(): Promise<void>;

  // Race access
  getRace(raceId: string): Race | undefined;
  getAllRaces(): Race[];
  raceExists(raceId: string): boolean;
  getRaceName(raceId: string): string;

  // Stat modifiers
  getStatModifiers(raceId: string): Race['statModifiers'] | null;
  applyStatModifiers(baseStats: Stats, raceId: string): Stats;

  // Racial bonuses
  getRaceBonuses(raceId: string): Race['bonuses'] | null;
  applyXpBonus(baseXp: number, raceId: string): number;
  applyHealthBonus(baseHealth: number, raceId: string): number;
  applyManaBonus(baseMana: number, raceId: string): number;
}
```

**Singleton Pattern**:

```typescript
// ✅ Correct
const raceManager = RaceManager.getInstance();
await raceManager.ensureInitialized();

// ❌ Incorrect - constructor is private
const raceManager = new RaceManager();
```

## Race Data Structure

```typescript
interface Race {
  id: string;         // Unique identifier (e.g., "human", "elf")
  name: string;       // Display name (e.g., "Human", "Elf")
  description: string; // Lore/flavor text

  // Modifiers applied to base stats at character creation
  statModifiers: {
    strength: number;     // Can be negative
    dexterity: number;
    agility: number;
    constitution: number;
    wisdom: number;
    intelligence: number;
    charisma: number;
  };

  // Percentage bonuses (0.05 = 5%, 0.10 = 10%)
  bonuses: {
    xpGain?: number;      // XP multiplier bonus
    maxMana?: number;     // Max mana multiplier bonus
    maxHealth?: number;   // Max health multiplier bonus
    critChance?: number;  // Critical hit chance bonus
    attack?: number;      // Attack damage bonus
  };

  bonusDescription: string; // Human-readable bonus description
}
```

## Available Races

| Race     | Strengths                  | Weaknesses            | Bonus          |
| -------- | -------------------------- | --------------------- | -------------- |
| Human    | Balanced (no modifiers)    | None                  | +5% XP gain    |
| Elf      | DEX +2, INT +2, WIS +1     | STR -1, CON -2        | +10% max mana  |
| Dwarf    | STR +2, CON +3, WIS +1     | DEX -1, AGI -1, CHA -1| +10% max HP    |
| Halfling | DEX +3, AGI +2, CHA +2     | STR -2, CON -1        | +5% crit       |
| Orc      | STR +3, CON +2             | WIS -2, INT -2, CHA -1| +5% attack     |

## Conventions

### Async Initialization Pattern

```typescript
// ✅ Correct - wait for initialization before use
const raceManager = RaceManager.getInstance();
await raceManager.ensureInitialized();
const races = raceManager.getAllRaces();

// ❌ Incorrect - may access before data loaded
const raceManager = RaceManager.getInstance();
const races = raceManager.getAllRaces(); // Might be empty!
```

### Applying Race During Character Creation

```typescript
// Race is applied via UserManager, NOT directly
userManager.applyRaceToUser(client.user.username, race.id);

// This method:
// 1. Sets user.raceId
// 2. Applies stat modifiers to base stats
// 3. Applies health/mana bonuses
// 4. Saves the user
```

### Getting Race Info for Display

```typescript
// For stats command or character sheet
const raceId = user.raceId ?? 'human';
const raceName = raceManager.getRaceName(raceId);
const bonuses = raceManager.getRaceBonuses(raceId);
```

## Common Tasks

### Adding a New Race

1. Edit `data/races.json`:

```json
{
  "id": "gnome",
  "name": "Gnome",
  "description": "Small but clever folk...",
  "statModifiers": {
    "strength": -2,
    "dexterity": 1,
    "agility": 1,
    "constitution": 0,
    "wisdom": 1,
    "intelligence": 3,
    "charisma": 0
  },
  "bonuses": {
    "maxMana": 0.15
  },
  "bonusDescription": "+15% max mana"
}
```

2. Update `src/types.ts` if adding new bonus types
3. Update `src/race/raceManager.ts` if new bonus application logic needed
4. Update `src/states/race-selection.state.ts` if display logic changes

### Applying XP Bonus in Combat

```typescript
// In combat system or XP award logic
const raceManager = RaceManager.getInstance();
const adjustedXp = raceManager.applyXpBonus(baseXp, user.raceId ?? 'human');
user.experience += adjustedXp;
```

### Calculating Health with Race Bonus

```typescript
const raceManager = RaceManager.getInstance();
const adjustedMaxHealth = raceManager.applyHealthBonus(
  baseMaxHealth,
  user.raceId ?? 'human'
);
```

## Gotchas & Warnings

- **Singleton**: Always use `getInstance()`, never `new RaceManager()`
- **Async Init**: Must call `ensureInitialized()` before accessing race data
- **Race Selection is Permanent**: Once selected during character creation, race cannot be changed
- **Default Race**: If `user.raceId` is undefined, default to `'human'`
- **Stat Modifiers are Applied Once**: At character creation, not recalculated
- **Bonuses are Percentages**: Values like `0.05` mean 5%, not 5 points

## Data File Location

- **File**: `data/races.json`
- **Format**: `{ "races": [...] }`
- **Repository**: `AsyncFileRaceRepository`

## Integration Points

### Character Creation Flow

```
SignupState → creates user (no race)
    ↓
RaceSelectionState → displays races, handles selection
    ↓
UserManager.applyRaceToUser() → applies modifiers, saves
    ↓
ConfirmationState → final confirmation
```

### Stats Command

The `stats` command uses RaceManager to display:
- Race name
- Racial bonuses currently active

### Combat System

Race bonuses like XP gain, attack, and crit chance are applied during combat calculations.

## Related Context

- [`../types.ts`](../types.ts) - Race interface definition
- [`../states/race-selection.state.ts`](../states/race-selection.state.ts) - Race selection UI
- [`../states/signup.state.ts`](../states/signup.state.ts) - Triggers race selection
- [`../user/userManager.ts`](../user/userManager.ts) - `applyRaceToUser()` method
- [`../command/commands/stats.command.ts`](../command/commands/stats.command.ts) - Displays race info
- [`../../data/races.json`](../../data/races.json) - Race data file
- [`../persistence/AsyncFileRaceRepository.ts`](../persistence/AsyncFileRaceRepository.ts) - File persistence
- [`../persistence/RepositoryFactory.ts`](../persistence/RepositoryFactory.ts) - `getRaceRepository()`
