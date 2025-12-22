# Effects System

Temporary status effects and buffs/debuffs.

## Contents

| File | Description |
|------|-------------|
| `effectManager.ts` | Manage active effects on entities |

## Overview

Effects are temporary modifiers applied to players or NPCs. Examples: poison damage over time, stat buffs, movement restrictions. Effects have duration and can stack based on configuration.

## Related

- [`../command/commands/effect.command.ts`](../command/commands/effect.command.ts) - Apply effects
- [`../combat/`](../combat/) - Combat applies effects
