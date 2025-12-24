# Command Implementations

Individual command classes that handle specific player actions. Each file exports one command.

## Command Categories

### Navigation

| File               | Command                            | Description                  |
| ------------------ | ---------------------------------- | ---------------------------- |
| `look.command.ts`  | look, l                            | View room or examine objects |
| `move.command.ts`  | north, south, east, west, up, down | Navigate between rooms       |
| `exits.command.ts` | exits                              | Show available exits         |

### Combat

| File                | Command         | Description                 |
| ------------------- | --------------- | --------------------------- |
| `attack.command.ts` | attack, a, kill | Initiate combat with target |
| `flee.command.ts`   | flee, run       | Escape from combat          |

### Communication

| File                 | Command     | Description                  |
| -------------------- | ----------- | ---------------------------- |
| `say.command.ts`     | say, '      | Speak to room                |
| `yell.command.ts`    | yell, shout | Shout to adjacent rooms      |
| `wave.command.ts`    | wave        | Wave at someone or the room  |
| `laugh.command.ts`   | laugh       | Laugh at someone or the room |
| `whisper.command.ts` | whisper     | Private message in room      |
| `tell.command.ts`    | tell        | Private message anywhere     |

### Inventory

| File                   | Command            | Description        |
| ---------------------- | ------------------ | ------------------ |
| `inventory.command.ts` | inventory, i, inv  | View carried items |
| `get.command.ts`       | get, take, pick    | Pick up items      |
| `drop.command.ts`      | drop               | Drop items         |
| `equip.command.ts`     | equip, wear, wield | Equip items        |
| `unequip.command.ts`   | unequip, remove    | Remove equipment   |

### Character

| File               | Command          | Description          |
| ------------------ | ---------------- | -------------------- |
| `stats.command.ts` | stats, st, score | View character stats |
| `level.command.ts` | level            | View level progress  |
| `who.command.ts`   | who              | List online players  |

### Admin

| File                  | Command      | Description          |
| --------------------- | ------------ | -------------------- |
| `teleport.command.ts` | teleport, tp | Move to any room     |
| `spawn.command.ts`    | spawn        | Create NPCs or items |
| `kick.command.ts`     | kick         | Disconnect a player  |
| `ban.command.ts`      | ban          | Ban a player         |

### Misc

| File               | Command    | Description          |
| ------------------ | ---------- | -------------------- |
| `help.command.ts`  | help, ?    | Show command help    |
| `quit.command.ts`  | quit, exit | Disconnect from game |
| `snake.command.ts` | snake      | Play Snake mini-game |
| `bug.command.ts`   | bug        | Report a bug         |

## Adding New Commands

1. Create `yourcommand.command.ts` in this directory
2. Extend `BaseCommand` or implement `Command` interface
3. Import and register in `../commandRegistry.ts`
4. Add documentation to `docs/commands.md`

## Related

- [commandRegistry.ts](../commandRegistry.ts) - Where commands register
- [command.interface.ts](../command.interface.ts) - Interface to implement
- [baseCommand.ts](../baseCommand.ts) - Base class to extend
- [docs/commands.md](../../../docs/commands.md) - User documentation
