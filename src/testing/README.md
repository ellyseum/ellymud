# Testing

Test mode infrastructure for automated and deterministic game testing.

## Contents

| File             | Description                                       |
| ---------------- | ------------------------------------------------- |
| `testMode.ts`    | Test mode configuration interface and options     |
| `stateLoader.ts` | Snapshot loading/saving for repeatable test scenarios |
| `testerAgent.ts` | Programmatic API for Jest E2E testing             |

## Overview

This directory provides infrastructure for running EllyMUD in a controlled test mode:

- **Test Mode**: Pauses the automatic game timer, allowing external tools to advance game ticks programmatically
- **State Snapshots**: Load and save game state for repeatable test scenarios
- **TesterAgent**: Jest-friendly API for E2E tests with full time and state control

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

## State Snapshots

Snapshots allow you to save and restore game state for repeatable testing:

```
data/test-snapshots/
├── fresh/          # Clean install state (required)
├── combat-ready/   # Player + enemy setup
└── my-scenario/    # Custom snapshots
```

### MCP Tools for State Management

- `load_test_snapshot` - Load a named snapshot
- `save_test_snapshot` - Save current state as snapshot
- `reset_game_state` - Reset to fresh state
- `list_test_snapshots` - List available snapshots
- `set_player_stats` - Directly modify player stats

## Related

- [`../timer/`](../timer/) - Game timer manager with test mode support
- [`../mcp/`](../mcp/) - MCP server with tick advancement and state tools
- [`../../data/test-snapshots/`](../../data/test-snapshots/) - Snapshot storage
- [`../../test/e2e/`](../../test/e2e/) - E2E tests using TesterAgent

## TesterAgent Usage

The `TesterAgent` class provides a programmatic API for E2E testing:

```typescript
import { TesterAgent } from '../../src/testing/testerAgent';

const agent = await TesterAgent.create();
const sessionId = await agent.directLogin('testuser');
agent.sendCommand(sessionId, 'look');
agent.advanceTicks(12);  // Advance 12 game ticks
await agent.shutdown();
```

See `test/e2e/` for example tests.
