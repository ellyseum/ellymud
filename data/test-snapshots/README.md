# Test Snapshots

This directory contains saved game state snapshots for repeatable testing.

## Contents

| Directory    | Description                                    |
| ------------ | ---------------------------------------------- |
| `fresh/`     | Clean install state (empty users, minimal rooms) |

## Overview

Test snapshots allow you to save and restore game state for predictable, repeatable test scenarios. Each snapshot is a directory containing JSON files that represent the game state at a point in time.

## Creating Snapshots

Snapshots can be created via MCP tools or the StateLoader class:

```bash
# Via MCP tool
mcp_ellymud.save_test_snapshot({ name: 'my-scenario' })
```

## Loading Snapshots

```bash
# Load a specific snapshot
mcp_ellymud.load_test_snapshot({ name: 'fresh' })

# Reset to clean state
mcp_ellymud.reset_game_state({})
```

## Important Notes

- The `fresh` snapshot is **required** and cannot be deleted
- Snapshots do **not** affect production data in `data/*.json`
- Each snapshot contains: `users.json`, `rooms.json`, and optionally `items.json`, `npcs.json`

## Related

- [`../../../src/testing/stateLoader.ts`](../../../src/testing/stateLoader.ts) - StateLoader class
- [`../../../src/mcp/mcpServer.ts`](../../../src/mcp/mcpServer.ts) - MCP state management tools
