# Command Implementations - LLM Context

## Overview

This directory contains 40+ command implementations. Each command is a single TypeScript class that handles one type of player action. Commands are the primary way players interact with the game.

## File Reference

### Core Commands

| File                   | Purpose                              |
| ---------------------- | ------------------------------------ |
| `look.command.ts`      | View room, exits, items, NPCs        |
| `move.command.ts`      | Navigate via direction (n/s/e/w/u/d) |
| `inventory.command.ts` | List items in inventory              |
| `stats.command.ts`     | Display player statistics            |
| `help.command.ts`      | List available commands              |
| `quit.command.ts`      | Disconnect from server               |

### Combat Commands

| File                    | Purpose                              |
| ----------------------- | ------------------------------------ |
| `attack.command.ts`     | Initiate combat with NPC             |
| `break.command.ts`      | Stop auto-attacking (move to flee)   |
| `heal.command.ts`       | Restore health (testing)             |
| `damage.command.ts`     | Take damage (testing)                |
| `cast.command.ts`       | Cast spells and abilities at targets |
| `abilities.command.ts`  | List available abilities & cooldowns |

### Recovery Commands

| File                   | Purpose                                      |
| ---------------------- | -------------------------------------------- |
| `rest.command.ts`      | Enter resting state for enhanced HP regen    |
| `meditate.command.ts`  | Enter meditating state for enhanced MP regen |

### Item Commands

| File                   | Purpose                       |
| ---------------------- | ----------------------------- |
| `pickup.command.ts`    | Pick up items from room       |
| `drop.command.ts`      | Drop items in room            |
| `get.command.ts`       | Alias for pickup              |
| `equip.command.ts`     | Equip items                   |
| `unequip.command.ts`   | Remove equipped items         |
| `equipment.command.ts` | View equipped items           |
| `destroy.command.ts`   | Permanently delete item       |
| `rename.command.ts`    | Give item custom name         |
| `resetname.command.ts` | Restore original name         |
| `repair.command.ts`    | Fix damaged items             |
| `use.command.ts`       | Use consumable items/potions  |

### Economy Commands

| File                  | Purpose                                      |
| --------------------- | -------------------------------------------- |
| `buy.command.ts`      | Purchase items from merchant NPCs            |
| `sell.command.ts`     | Sell items to merchant NPCs                  |
| `wares.command.ts`    | List items available for sale                |
| `deposit.command.ts`  | Deposit gold into bank account (in bank room)|
| `withdraw.command.ts` | Withdraw gold from bank account              |
| `balance.command.ts`  | Check current bank balance                   |

### Communication Commands

| File                   | Purpose                                |
| ---------------------- | -------------------------------------- |
| `say.command.ts`       | Talk to current room                   |
| `yell.command.ts`      | Shout to adjacent rooms                |
| `wave.command.ts`      | Wave gesture to room                   |
| `laugh.command.ts`     | Laugh at target or room                |
| `whisper.command.ts`   | Private message to player (any location) |

### Admin Commands

| File                     | Purpose                  |
| ------------------------ | ------------------------ |
| `spawn.command.ts`       | Spawn NPCs               |
| `giveitem.command.ts`    | Give items to players    |
| `debug.command.ts`       | Inspect game objects     |
| `sudo.command.ts`        | Toggle admin mode        |
| `adminmanage.command.ts` | Manage admin privileges  |
| `addflag.command.ts`     | Add user flags           |
| `removeflag.command.ts`  | Remove user flags        |
| `listflags.command.ts`   | View user flags          |
| `restrict.command.ts`    | Restrict player movement |
| `root.command.ts`        | Root target in place     |

### Utility Commands

| File                        | Purpose                              |
| --------------------------- | ------------------------------------ |
| `history.command.ts`        | View command history                 |
| `time.command.ts`           | Show server time                     |
| `played.command.ts`         | Show play time                       |
| `bugreport.command.ts`      | Submit bug report (async repository) |
| `changePassword.command.ts` | Change password                      |

### Mini-Games

| File                | Purpose             |
| ------------------- | ------------------- |
| `snake.command.ts`  | Play Snake game     |
| `scores.command.ts` | View high scores    |
| `wait.command.ts`   | Enter waiting state |

### Effect Commands

| File                | Purpose              |
| ------------------- | -------------------- |
| `effect.command.ts` | Apply/remove effects |

## Command Structure

Every command follows this pattern:

```typescript
import { Command, CommandServices } from '../command.interface';
import { ConnectedClient } from '../../types';
import { writeMessageToClient } from '../../utils/socketWriter';
import { colorize } from '../../utils/colors';

export class ExampleCommand implements Command {
  name = 'example'; // Primary command name
  aliases = ['ex', 'exam']; // Optional shortcuts
  description = 'Example command description';
  adminOnly = false; // true = admin only

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

### Async Commands with Repository Pattern

Some commands use async repository access (e.g., `bugreport.command.ts`):

```typescript
export class BugReportCommand implements Command {
  name = 'bugreport';
  
  // Repository + async init pattern
  private repository = getBugReportRepository();
  private initialized = false;
  private initPromise: Promise<void> | null = null;
  
  constructor() {
    this.initPromise = this.initialize();
  }
  
  private async initialize(): Promise<void> {
    if (this.initialized) return;
    await this.repository.findAll(); // Warm up repository
    this.initialized = true;
    this.initPromise = null;
  }
  
  public async ensureInitialized(): Promise<void> {
    if (this.initPromise) await this.initPromise;
  }
  
  async execute(client: ConnectedClient, args: string[], services: CommandServices): Promise<void> {
    await this.ensureInitialized();
    // ... command logic using this.repository
  }
}
```

**Key Points:**
- Initialize repository in constructor
- Call `ensureInitialized()` at start of `execute()`
- Mark `execute()` as async
- Repository methods are all async

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
