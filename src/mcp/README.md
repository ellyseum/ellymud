# EllyMUD MCP Server

This directory contains the Model Context Protocol (MCP) server implementation for EllyMUD, which allows LLMs and other AI systems to access game data through a standardized interface.

## Overview

The MCP server is integrated into the main EllyMUD server and starts automatically when you run `npm start`. It provides access to both static game data and live runtime state through an HTTP API on port 3100.

## Features

### Available Tools

- **get_online_users** - Get list of currently connected users with their current state and location
- **get_user_data** - Get detailed information about a specific user including stats, inventory, and equipment
- **get_room_data** - Get detailed information about a specific room including description, exits, items, NPCs, and current occupants
- **get_all_rooms** - Get a list of all rooms in the game world
- **get_all_items** - Get a list of all item templates in the game
- **get_all_npcs** - Get a list of all NPC templates in the game
- **get_combat_state** - Get information about active combat sessions in the game
- **search_logs** - Search through player logs, system logs, error logs, or raw session logs for debugging
- **get_game_config** - Get current game configuration settings
- **tail_user_session** - Get the last N lines of a user's raw session log to see exactly what they are seeing (auto-selects user if only one is online, default 500 lines)

## Running the MCP Server

The MCP server starts automatically when you run the main game server:

```bash
npm start
```

You'll see the message "MCP Server started on http://localhost:3100" in the console output.

## API Endpoints

- `GET /health` - Health check endpoint
- `GET /tools` - List all available tools/endpoints
- `GET /api/online-users` - Get currently connected users
- `GET /api/users/:username` - Get specific user data
- `GET /api/rooms/:roomId` - Get specific room data
- `GET /api/rooms` - Get all rooms
- `GET /api/items` - Get all item templates
- `GET /api/npcs` - Get all NPC templates
- `GET /api/combat-state` - Get active combat sessions
- `POST /api/logs/search` - Search logs (body: `{logType, searchTerm, username?}`)
- `GET /api/config` - Get game configuration
- `POST /api/tail-session` - Tail user's raw session log (body: `{username?, lines?}`)

## Integration with LLMs

### VS Code / GitHub Copilot

In GitHub Copilot, use "Enter Server URL" and connect to `http://localhost:3100`.

The server must be running for Copilot to access it.

### Direct HTTP Integration

Any tool that can make HTTP requests can use the API:

```bash
# List available endpoints
curl http://localhost:3100/tools

# Get online users
curl http://localhost:3100/api/online-users

# Search logs
curl -X POST http://localhost:3100/api/logs/search \
  -H "Content-Type: application/json" \
  -d '{"logType": "system", "searchTerm": "error"}'
```

## Data Access

The MCP server provides access to:

- **Live Runtime Data:**
  - Currently connected players and their state
  - Active combat sessions
  - Real-time room occupancy
  - Current player locations and activities

- **Static Game Data:**
  - User/player data (stats, inventory, equipment)
  - Room data (descriptions, exits, NPCs, items)
  - Item templates and instances
  - NPC templates
  - Game configuration

- **Logs:**
  - Player-specific logs
  - System logs
  - Error logs
  - Raw session logs

## Security Considerations

- The MCP server provides **read-only** access to game data
- Runs on localhost by default (port 3100)
- CORS enabled for local development
- No authentication currently implemented
- Suitable for local development and debugging
- Does not expose any write operations to game state
- For production use, add authentication and restrict CORS

## Development

To add new tools:

1. Add the tool definition to the `tools` array in the `ListToolsRequestSchema` handler in `mcpServer.ts`
2. Implement the handler case in the `CallToolRequestSchema` handler
3. Add a private method to fetch/process the data
4. Update this README with the new tool documentation

## Architecture

The MCP server:
- Integrates with the main GameServer as a component
- Receives references to UserManager, RoomManager, and ClientManager
- Accesses live runtime state directly from the managers
- Runs on stdio transport for MCP protocol compatibility
- Starts and stops with the main game server lifecycle

