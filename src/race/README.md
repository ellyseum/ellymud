# Race System

Character race management for EllyMUD. Handles playable races with stat modifiers and racial bonuses.

## Contents

| Path              | Description                                    |
| ----------------- | ---------------------------------------------- |
| `raceManager.ts`  | Singleton manager for race data and operations |

## Overview

The race system provides:

- Five playable races: Human, Elf, Dwarf, Halfling, Orc
- Stat modifiers applied at character creation
- Racial bonuses affecting gameplay (XP gain, max health/mana, crit chance, attack)
- Integration with character creation flow and stats display

Race selection occurs during character creation after account signup and is permanent.

## Available Races

| Race     | Stat Focus            | Bonus              |
| -------- | --------------------- | ------------------ |
| Human    | Balanced              | +5% XP gain        |
| Elf      | DEX, INT, WIS         | +10% max mana      |
| Dwarf    | STR, CON              | +10% max health    |
| Halfling | DEX, AGI, CHA         | +5% critical hit   |
| Orc      | STR, CON              | +5% attack damage  |

## Data

Race definitions are stored in `data/races.json`.

## Related

- [`../states/`](../states/) - Race selection state during character creation
- [`../user/`](../user/) - UserManager applies race to new characters
- [`../persistence/`](../persistence/) - Race repository for data loading
- [`../../data/`](../../data/) - Race data files
