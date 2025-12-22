# Command Implementations

Individual command classes that handle specific player actions.

## Contents

| File | Command | Description |
|------|---------|-------------|
| `look.command.ts` | look, l | View surroundings or objects |
| `move.command.ts` | move, n/s/e/w | Navigate between rooms |
| `attack.command.ts` | attack, a | Initiate combat |
| `inventory.command.ts` | inventory, i | View carried items |
| `equip.command.ts` | equip, eq | Wear/wield items |
| `say.command.ts` | say | Speak to room |
| `yell.command.ts` | yell | Shout to adjacent rooms |
| `stats.command.ts` | stats, st | View character stats |
| `help.command.ts` | help | List available commands |
| ... | ... | 30+ more commands |

## Overview

Each file exports a single command class implementing the `Command` interface. Commands are auto-registered via imports in the parent `commandRegistry.ts`.

## Related

- [`../commandRegistry.ts`](../commandRegistry.ts) - Where commands are registered
- [`../command.interface.ts`](../command.interface.ts) - Interface to implement
- [`../../../docs/commands.md`](../../../docs/commands.md) - User documentation
