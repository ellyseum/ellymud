# Combat System

Event-driven combat system handling player vs NPC battles, damage calculations, and death handling.

## Contents

| Path | Description |
|------|-------------|
| `combatSystem.ts` | Core singleton orchestrating all combat |
| `combat.ts` | Individual combat instance between entities |
| `combatEntity.interface.ts` | Interface for anything that can fight |
| `npc.ts` | NPC class with combat capabilities |
| `components/` | Modular combat subsystems |

## Overview

Combat in EllyMUD is turn-based with automatic processing. When a player attacks an NPC, a combat instance is created and processed on game ticks. The system uses an event-driven architecture with separate components for tracking, processing, notifications, and death handling.

## Related

- [`../command/commands/attack.command.ts`](../command/commands/attack.command.ts) - Initiates combat
- [`../timer/`](../timer/) - Game timer triggers combat ticks
- [`../room/`](../room/) - Combat is room-scoped
