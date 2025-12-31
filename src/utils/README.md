# Utility Functions

Shared utility functions used throughout EllyMUD. Contains critical infrastructure code.

## Contents

| File                   | Purpose                                        |
| ---------------------- | ---------------------------------------------- |
| `socketWriter.ts`      | **CRITICAL** - All client output must use this |
| `colors.ts`            | ANSI color formatting and colorize function    |
| `logger.ts`            | Winston-based logging system                   |
| `formatters.ts`        | Text formatting utilities                      |
| `promptFormatter.ts`   | Command prompt rendering                       |
| `stateInterruption.ts` | Resting/meditating state interruption utility  |
| `messageFormatter.ts`  | Game message formatting                        |
| `fileUtils.ts`         | File I/O helpers                               |
| `jsonUtils.ts`         | JSON parsing and validation                    |
| `debugUtils.ts`        | Debug helpers                                  |
| `itemManager.ts`       | Item template and instance management (multi-backend) |
| `itemNameColorizer.ts` | Item name coloring by rarity                   |
| `rawSessionLogger.ts`  | Raw session I/O logging                        |
| `mcpKeySetup.ts`       | MCP API key generation                         |
| `validateFiles.ts`     | Data file validation                           |
| `consoleUtils.ts`      | Console output utilities                       |
| `commandHandler.ts`    | Command parsing helpers                        |
| `commandParser.ts`     | Input tokenization                             |

## Critical: Socket Writing

**ALWAYS** use `socketWriter.ts` for client output:

- `writeToClient(client, message)` - Raw message
- `writeMessageToClient(client, message)` - With prompt redraw
- `writeFormattedMessageToClient(client, message, options)` - Formatted

Never write directly to `client.connection.write()` - this bypasses prompt management and breaks the UI.

## Color System

Use `colors.ts` for ANSI formatting:

- `colorize(color, text)` - Wrap text in color codes
- Colors: red, green, yellow, blue, magenta, cyan, white, gray
- Always reset to prevent color bleeding

## Logging

Use `logger.ts` instead of `console.log`:

- `systemLogger` - Server events
- `getPlayerLogger(username)` - Per-player logs
- Logs rotate daily and are stored in `logs/`

## Related

- [src/command/](../command/) - Uses formatters and socketWriter
- [src/states/](../states/) - Uses socketWriter for all output
- [logs/](../../logs/) - Log file output directory
