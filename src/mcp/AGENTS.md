# MCP Server

Model Context Protocol server for AI integration.

## Contents

| File | Description |
|------|-------------|
| `mcpServer.ts` | HTTP API server on port 3100 |
| `virtualSessionManager.ts` | Manage virtual game sessions |
| `README.md` | Detailed MCP documentation |

## Overview

The MCP server exposes game data via HTTP API for AI tools like GitHub Copilot. It allows AI to query game state, users, rooms, and more without direct game access.

## Related

- [`../connection/virtual.connection.ts`](../connection/virtual.connection.ts) - Virtual connections for sessions
- [`../../.vscode/mcp.json`](../../.vscode/mcp.json) - VS Code MCP configuration
