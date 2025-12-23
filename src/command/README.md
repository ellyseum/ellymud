# Command System

The command parsing and execution system for EllyMUD. All player actions are processed through this system.

## Contents

| Path                   | Description                                       |
| ---------------------- | ------------------------------------------------- |
| `commandHandler.ts`    | Main processor that routes input to commands      |
| `commandRegistry.ts`   | Singleton registry of all available commands      |
| `command.interface.ts` | Interface that all commands must implement        |
| `baseCommand.ts`       | Base class providing common command functionality |
| `commands/`            | Individual command implementations (40+ commands) |

## How Commands Work

1. **Registration**: On startup, all commands register with `CommandRegistry`
2. **Input**: Player types text (e.g., "look north")
3. **Parsing**: `CommandHandler` parses input into command and arguments
4. **Matching**: Registry finds command by name or alias
5. **Execution**: Command's `execute()` method is called
6. **Output**: Command sends response via `socketWriter` utilities

## Command Structure

Each command implements:

- `name` - Primary command name
- `aliases` - Alternative names (e.g., 'l' for 'look')
- `description` - Help text
- `usage` - Syntax example
- `execute(client, args)` - Main logic

## Adding New Commands

1. Create file in `commands/` directory
2. Extend `BaseCommand` or implement `Command` interface
3. Import and register in `commandRegistry.ts`
4. Update `docs/commands.md` with documentation

## Command Categories

- **Navigation**: look, move, north/south/east/west
- **Combat**: attack, flee, defend
- **Communication**: say, yell, whisper, tell
- **Inventory**: inventory, get, drop, equip, unequip
- **Character**: stats, score, level
- **Admin**: teleport, spawn, kick, ban

## Related

- [src/states/](../states/) - State machine routes input to commands
- [docs/commands.md](../../docs/commands.md) - User-facing command documentation
- [commands/](./commands/) - Individual command implementations
