# Utility Functions

Shared utility functions used throughout EllyMUD.

## Contents

| File | Purpose |
|------|---------|
| `socketWriter.ts` | Client output with prompt handling |
| `colors.ts` | ANSI color formatting |
| `logger.ts` | Logging system (Winston) |
| `formatters.ts` | Text formatting utilities |
| `promptFormatter.ts` | Command prompt rendering |
| `messageFormatter.ts` | Message formatting |
| `fileUtils.ts` | File I/O helpers |
| `jsonUtils.ts` | JSON parsing/validation |
| `debugUtils.ts` | Debug helpers |
| `itemManager.ts` | Item instance management |
| `itemNameColorizer.ts` | Item name coloring by rarity |
| `rawSessionLogger.ts` | Raw session logging |
| `mcpKeySetup.ts` | MCP API key setup |
| `validateFiles.ts` | Data file validation |
| `consoleUtils.ts` | Console output utilities |
| `commandHandler.ts` | Command parsing helpers |
| `commandParser.ts` | Input parsing |

## Overview

Utilities are stateless helper functions. The most important are `socketWriter.ts` (all client output) and `colors.ts` (formatting).

## Related

- [`../command/`](../command/) - Uses formatters and socketWriter
- [`../states/`](../states/) - Uses socketWriter for output
