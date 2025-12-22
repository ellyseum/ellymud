# Command System

The command parsing and execution system for EllyMUD. All player actions are processed through this system.

## Contents

| Path | Description |
|------|-------------|
| `commandHandler.ts` | Main command processor and input router |
| `commandRegistry.ts` | Singleton registry of all available commands |
| `command.interface.ts` | Command interface definition |
| `baseCommand.ts` | Base class for command implementations |
| `commands/` | Individual command implementations (40+ commands) |

## Overview

Commands are text-based actions players type to interact with the game. The system uses a registry pattern where all commands are registered on startup, then matched and executed when players type input.

## Related

- [`../states/`](../states/) - State machine that routes input to commands
- [`../combat/`](../combat/) - Combat commands interact with combat system
- [`../room/`](../room/) - Movement and look commands use room manager
