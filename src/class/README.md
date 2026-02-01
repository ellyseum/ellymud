# Class System

Character class management for EllyMUD with tiered advancement. Players progress from Adventurer through specialized classes to elite roles.

## Contents

| Path              | Description                                     |
| ----------------- | ----------------------------------------------- |
| `classManager.ts` | Singleton manager for class data and operations |

## Overview

The class system provides:

- Tiered progression: Adventurer (tier 0) to base classes (tier 1) to elite classes (tier 2)
- Level and prerequisite requirements for advancement
- Trainer NPCs required for class changes
- Quest flags for tier 2 advancement
- Stat bonuses that stack across class history

## Class Tiers

| Tier | Classes                                        | Level Req |
| ---- | ---------------------------------------------- | --------- |
| 0    | Adventurer                                     | 1         |
| 1    | Fighter, Magic User, Thief, Healer             | 5         |
| 2    | Paladin, Wizard, Assassin, Cleric, and 8 more  | 15        |

## Advancement Requirements

- **Level**: Must meet minimum level for target class
- **Previous Class**: Must currently be the required class
- **Trainer**: Must be in room with appropriate trainer NPC
- **Quest Flag** (tier 2 only): Must complete trial quest first

## Data

Class definitions are stored in `data/classes.json`.

## Related

- [`../command/commands/`](../command/commands/) - Train command handles advancement
- [`../user/`](../user/) - UserManager tracks class history
- [`../persistence/`](../persistence/) - Class repository for data loading
- [`../../data/`](../../data/) - Class data files
