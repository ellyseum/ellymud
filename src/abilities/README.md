# Abilities System

Core system for spells, skills, item abilities, and combat enhancements. Handles casting, cooldowns, mana costs, and effect application.

## Contents

| Path                  | Description                                       |
| --------------------- | ------------------------------------------------- |
| `abilityManager.ts`   | Core singleton managing abilities and cooldowns   |
| `types.ts`            | Type definitions, enums, and interfaces           |
| `index.ts`            | Module exports                                    |

## Overview

The ability system enables players to cast spells, use item abilities, and trigger weapon procs during combat. It integrates with the effect system to apply damage over time, healing, buffs, and debuffs.

The AbilityManager singleton uses async initialization with the repository pattern. Callers should ensure the manager is initialized before use.

## Related

- [`../effects/`](../effects/) - Effect application and management
- [`../combat/`](../combat/) - Combat ability integration
- [`../command/commands/`](../command/commands/) - cast, abilities, and use commands
- [`../../data/abilities.json`](../../data/abilities.json) - Ability definitions
