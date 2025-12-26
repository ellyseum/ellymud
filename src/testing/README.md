# Testing

Test mode infrastructure for automated and deterministic game testing.

## Contents

| File          | Description                                       |
| ------------- | ------------------------------------------------- |
| `testMode.ts` | Test mode configuration interface and options     |

## Overview

This directory provides infrastructure for running EllyMUD in a controlled test mode. Test mode pauses the automatic game timer, allowing external tools (like MCP clients) to advance game ticks programmatically. This enables deterministic testing of time-based mechanics such as combat, effects, regeneration, and spawning.

## When to Use Test Mode

Test mode is designed for:

- **E2E Testing**: Automated end-to-end tests that need predictable timing
- **AI Agent Testing**: LLMs testing game mechanics via MCP
- **Combat Testing**: Stepping through combat round-by-round
- **Effect Testing**: Verifying effect durations and expirations

## Starting Test Mode

Test mode is enabled via command-line flag:

```
npm start -- --test-mode
```

When test mode is active:

- The game timer does NOT start automatically
- Ticks must be advanced manually via MCP tools
- All time-based mechanics are paused until ticks are advanced

## Related

- [`../timer/`](../timer/) - Game timer manager with test mode support
- [`../mcp/`](../mcp/) - MCP server with tick advancement tools
