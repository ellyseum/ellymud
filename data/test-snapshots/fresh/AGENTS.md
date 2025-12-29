# Fresh Test Snapshot - LLM Context

## Overview

This directory contains the "fresh" game state snapshot - a clean baseline for testing.

## Contents

JSON files in this directory represent a pristine game state that can be loaded to reset the game for testing purposes.

## Usage

```typescript
// Via MCP server
mcp_ellymud-mcp-s_load_test_snapshot({ name: "fresh" })

// Via test harness
await stateLoader.loadSnapshot('fresh');
```

## When to Use

- Before running E2E tests that require clean state
- After tests that modify game state destructively
- When debugging issues that may be caused by corrupted state

## Related Context

- [`../../../src/testing/stateLoader.ts`](../../../src/testing/stateLoader.ts) - Loads snapshots
- [`../../../src/mcp/mcpServer.ts`](../../../src/mcp/mcpServer.ts) - MCP snapshot tools
