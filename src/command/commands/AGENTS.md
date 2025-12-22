# Command Implementations - LLM Context

## Overview

This directory contains 40+ command implementations. Each command is a single TypeScript class that handles one type of player action. Commands are the primary way players interact with the game.

## File Reference

### Core Commands

| File | Purpose |
|------|---------|
| `look.command.ts` | View room, exits, items, NPCs |
| `move.command.ts` | Navigate via direction (n/s/e/w/u/d) |
| `inventory.command.ts` | List items in inventory |
| `stats.command.ts` | Display player statistics |
| `help.command.ts` | List available commands |
| `quit.command.ts` | Disconnect from server |

### Combat Commands

| File | Purpose |
|------|---------|
| `attack.command.ts` | Initiate combat with NPC |
| `break.command.ts` | Attempt to flee combat |
| `heal.command.ts` | Restore health (testing) |
| `damage.command.ts` | Take damage (testing) |

### Item Commands

| File | Purpose |
|------|---------|
| `pickup.command.ts` | Pick up items from room |
| `drop.command.ts` | Drop items in room |
| `get.command.ts` | Alias for pickup |
| `equip.command.ts` | Equip items |
| `unequip.command.ts` | Remove equipped items |
| `equipment.command.ts` | View equipped items |
| `destroy.command.ts` | Permanently delete item |
| `rename.command.ts` | Give item custom name |
| `resetname.command.ts` | Restore original name |
| `repair.command.ts` | Fix damaged items |

### Communication Commands

| File | Purpose |
|------|---------|
| `say.command.ts` | Talk to current room |
| `yell.command.ts` | Shout to adjacent rooms |

### Admin Commands

| File | Purpose |
|------|---------|
| `spawn.command.ts` | Spawn NPCs |
| `giveitem.command.ts` | Give items to players |
| `debug.command.ts` | Inspect game objects |
| `sudo.command.ts` | Toggle admin mode |
| `adminmanage.command.ts` | Manage admin privileges |
| `addflag.command.ts` | Add user flags |
| `removeflag.command.ts` | Remove user flags |
| `listflags.command.ts` | View user flags |
| `restrict.command.ts` | Restrict player movement |
| `root.command.ts` | Root target in place |

### Utility Commands

| File | Purpose |
|------|---------|
| `history.command.ts` | View command history |
| `time.command.ts` | Show server time |
| `played.command.ts` | Show play time |
| `bugreport.command.ts` | Submit bug report |
| `changePassword.command.ts` | Change password |

### Mini-Games

| File | Purpose |
|------|---------|
| `snake.command.ts` | Play Snake game |
| `scores.command.ts` | View high scores |
| `wait.command.ts` | Enter waiting state |

### Effect Commands

| File | Purpose |
|------|---------|
| `effect.command.ts` | Apply/remove effects |

## Command Structure

Every command follows this pattern:

```typescript
import { Command, CommandServices } from '../command.interface';
import { ConnectedClient } from '../../types';
import { writeMessageToClient } from '../../utils/socketWriter';
import { colorize } from '../../utils/colors';

export class ExampleCommand implements Command {
  name = 'example';           // Primary command name
  aliases = ['ex', 'exam'];   // Optional shortcuts
  description = 'Example command description';
  adminOnly = false;          // true = admin only

  execute(client: ConnectedClient, args: string[], services: CommandServices): void {
    // Guard: check user exists
    if (!client.user) return;

    // Extract services as needed
    const { roomManager, combatSystem, userManager } = services;

    // Parse arguments
    const target = args[0];

    // Execute logic
    // ...

    // Send output (ALWAYS use socketWriter)
    writeMessageToClient(client, colorize('green', 'Success!\r\n'));
  }
}
```

## Conventions

### Naming
- File: `{commandname}.command.ts` (lowercase, hyphenated if needed)
- Class: `{CommandName}Command` (PascalCase)
- Command name: lowercase, no spaces

### Output
```typescript
// ✅ Always use socketWriter utilities
writeMessageToClient(client, 'Message\r\n');
writeFormattedMessageToClient(client, colorize('red', 'Error\r\n'));

// ❌ Never write directly
client.connection.write('Bad!');
```

### Error Messages
```typescript
// Show error in red
writeMessageToClient(client, colorize('red', 'Error: Target not found.\r\n'));
```

### Success Messages
```typescript
// Show success in green or white
writeMessageToClient(client, colorize('green', 'Item picked up.\r\n'));
```

## Common Tasks

### Adding a New Command

1. Create `mycommand.command.ts` in this directory
2. Import and register in `../commandRegistry.ts`
3. Add to `docs/commands.md`

### Making Admin-Only

```typescript
adminOnly = true;
```

### Adding Aliases

```typescript
aliases = ['mc', 'mycmd', 'm'];
```

## Gotchas & Warnings

- ⚠️ **Always check `client.user`** - Can be undefined during state transitions
- ⚠️ **Use `\r\n`** - Telnet requires carriage return + newline
- ⚠️ **Reset colors** - Always end colored text with reset or newline
- ⚠️ **Register commands** - Must import in registry or command won't work

## Related Context

- [`../commandRegistry.ts`](../commandRegistry.ts) - Registration required here
- [`../command.interface.ts`](../command.interface.ts) - Interface definition
- [`../../utils/socketWriter.ts`](../../utils/socketWriter.ts) - Output utilities
- [`../../utils/colors.ts`](../../utils/colors.ts) - Color formatting
