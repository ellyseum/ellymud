# Command System - LLM Context

## Overview

The command system handles all player input in the AUTHENTICATED state. Commands are parsed, validated, and executed through a chain of handlers. This is the most frequently modified part of the codebase—most new features involve adding commands.

## Architecture

```
Player Input → CommandHandler → CommandRegistry → Command.execute()
                    ↓                  ↓
               Input parsing      Command lookup
               History tracking   Alias resolution
               Restriction check  Fuzzy matching
```

## File Reference

### `commandHandler.ts`

**Purpose**: Main entry point for all command processing

**Key Exports**:
```typescript
export class CommandHandler {
  handleCommand(client: ConnectedClient, input: string): void
}
```

**Key Logic**:
- Trims and validates input
- Checks if player is unconscious (restricts certain commands)
- Adds command to history
- Delegates to CommandRegistry for execution

**Dependencies**: `CommandRegistry`, `UserManager`, `RoomManager`, `CombatSystem`

### `commandRegistry.ts`

**Purpose**: Singleton registry of all commands with lookup and fuzzy matching

**Key Exports**:
```typescript
export class CommandRegistry {
  static getInstance(clients, roomMgr, combatSys, userMgr, stateMachine): CommandRegistry
  getCommand(name: string): Command | undefined
  executeCommand(client: ConnectedClient, commandName: string, args: string[]): void
}
```

**Key Features**:
- Levenshtein distance for "did you mean?" suggestions
- Alias support (e.g., `n` → `north`)
- Admin-only command filtering
- Command not found handling

### `command.interface.ts`

**Purpose**: Interface that all commands must implement

```typescript
export interface Command {
  name: string;
  aliases?: string[];
  description: string;
  adminOnly?: boolean;
  execute(client: ConnectedClient, args: string[], services: CommandServices): void;
}

export interface CommandServices {
  clients: Map<string, ConnectedClient>;
  roomManager: RoomManager;
  combatSystem: CombatSystem;
  userManager: UserManager;
  stateMachine?: StateMachine;
}
```

### `commands/` Directory

Contains 40+ individual command files. Each file exports a single command class.

**Naming Convention**: `{commandname}.command.ts`

**Examples**:
- `look.command.ts` - View room/objects
- `move.command.ts` - Navigate between rooms
- `attack.command.ts` - Initiate combat
- `inventory.command.ts` - View inventory

## Conventions

### Creating a New Command

1. Create file: `src/command/commands/{name}.command.ts`
2. Implement the `Command` interface
3. Import and register in `commandRegistry.ts`
4. Update `docs/commands.md`

```typescript
// ✅ Correct - Full command implementation
import { Command, CommandServices } from '../command.interface';
import { ConnectedClient } from '../../types';
import { writeMessageToClient } from '../../utils/socketWriter';
import { colorize } from '../../utils/colors';

export class MyCommand implements Command {
  name = 'mycommand';
  aliases = ['mc', 'mycmd'];
  description = 'Does something useful';
  adminOnly = false;

  execute(client: ConnectedClient, args: string[], services: CommandServices): void {
    // Always check for user
    if (!client.user) return;
    
    // Use writeMessageToClient for output
    writeMessageToClient(client, colorize('green', 'Command executed!\r\n'));
  }
}

// ❌ Incorrect - Missing interface, direct socket write
export class BadCommand {
  execute(client, args) {
    client.connection.write('Bad!\n'); // Never do this
  }
}
```

### Output Conventions

```typescript
// ✅ Always use utility functions
import { writeMessageToClient, writeFormattedMessageToClient } from '../../utils/socketWriter';

writeMessageToClient(client, 'Simple message\r\n');
writeFormattedMessageToClient(client, colorize('red', 'Error!\r\n'));

// ❌ Never write directly to socket
client.connection.write('Bad!');
```

### Accessing Services

Commands receive all services via the `services` parameter:

```typescript
execute(client: ConnectedClient, args: string[], services: CommandServices): void {
  const { roomManager, combatSystem, userManager, clients } = services;
  
  // Use services
  const room = roomManager.getRoom(client.user.currentRoomId);
  const combat = combatSystem.getCombatForPlayer(client.user.username);
}
```

## Common Tasks

### Adding a New Command

1. Create the command file:
```typescript
// src/command/commands/newcmd.command.ts
import { Command, CommandServices } from '../command.interface';
import { ConnectedClient } from '../../types';
import { writeMessageToClient } from '../../utils/socketWriter';

export class NewCmdCommand implements Command {
  name = 'newcmd';
  aliases = ['nc'];
  description = 'Description for help text';
  
  execute(client: ConnectedClient, args: string[], services: CommandServices): void {
    if (!client.user) return;
    writeMessageToClient(client, 'New command output\r\n');
  }
}
```

2. Register in `commandRegistry.ts`:
```typescript
import { NewCmdCommand } from './commands/newcmd.command';
// In constructor:
this.registerCommand(new NewCmdCommand());
```

3. Update documentation in `docs/commands.md`

### Making a Command Admin-Only

```typescript
export class AdminOnlyCommand implements Command {
  name = 'secretcmd';
  adminOnly = true;  // Add this flag
  // ...
}
```

## Gotchas & Warnings

- ⚠️ **Line Endings**: Always use `\r\n` for Telnet compatibility
- ⚠️ **Null Checks**: Always check `if (!client.user) return;` at the start
- ⚠️ **Async Commands**: If command needs async, use `async execute()` but handle errors
- ⚠️ **Registration**: Commands must be imported in registry to be active
- ⚠️ **Aliases**: Ensure aliases don't conflict with other commands

## Related Context

- [`../states/authenticated.state.ts`](../states/authenticated.state.ts) - Routes input to CommandHandler
- [`../utils/socketWriter.ts`](../utils/socketWriter.ts) - Required for all output
- [`../combat/`](../combat/) - Combat commands delegate here
- [`../../docs/commands.md`](../../docs/commands.md) - User-facing command documentation
