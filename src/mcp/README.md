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
- **virtual_session_create** - Create a new virtual game session for the LLM to play the game
- **virtual_session_command** - Send commands to a virtual session (login, create user, play game)
- **virtual_session_info** - Get information about a virtual session
- **virtual_session_close** - Close a virtual game session
- **virtual_sessions_list** - List all active virtual sessions
- **advance_game_ticks** - Advance the game timer by N ticks (Test Mode only)
- **get_game_tick** - Get the current game tick count
- **set_test_mode** - Enable or disable test mode (pauses/resumes timer)
- **sync_artifacts_to_hub** - Sync pipeline artifacts from local to hub codespace
- **sync_artifacts_from_hub** - Sync pipeline artifacts from hub codespace to local

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
- `POST /api/virtual-session/create` - Create a new virtual session
- `POST /api/virtual-session/command` - Send command to virtual session (body: `{sessionId, command, waitMs?}`)
- `GET /api/virtual-session/:sessionId` - Get virtual session info
- `DELETE /api/virtual-session/:sessionId` - Close virtual session
- `GET /api/virtual-sessions` - List all virtual sessions
- `POST /api/test/advance-ticks` - Advance game timer by N ticks (body: `{ticks}`)
- `GET /api/test/tick-count` - Get current game tick count
- `POST /api/test/mode` - Enable/disable test mode (body: `{enabled}`)

## Test Mode Integration

The MCP server provides tools for controlling the game timer during E2E testing:

### Enabling Test Mode

Start the server with the `--test-mode` flag:

```bash
npm start -- --test-mode
```

### Test Mode Workflow

```javascript
// 1. Verify test mode is active (timer should be paused)
get_game_tick();
// Returns: { tick: 0 }

// 2. Set up test scenario via virtual session
virtual_session_command(sessionId, 'attack goblin');

// 3. Advance time to process combat
advance_game_ticks({ ticks: 1 });
// Returns: { ticksAdvanced: 1, currentTick: 1 }

// 4. Check results
get_combat_state();
```

### Test Mode API

| Endpoint | Method | Body | Description |
|----------|--------|------|-------------|
| `/api/test/mode` | POST | `{enabled: boolean}` | Enable/disable test mode |
| `/api/test/advance-ticks` | POST | `{ticks: number}` | Advance N ticks |
| `/api/test/tick-count` | GET | - | Get current tick count |

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

## Playing the Game as an LLM

The MCP server now provides virtual session tools that allow the LLM to actually play the game:

### Quick Start

1. **Create a session:**

```javascript
virtual_session_create();
// Returns: { sessionId: "virtual-1234567890-123", ... }
```

2. **Send commands:**

```javascript
// Login as existing user
virtual_session_command(sessionId, 'admin');
virtual_session_command(sessionId, 'password123');

// Or create new user
virtual_session_command(sessionId, 'new');
virtual_session_command(sessionId, 'myusername');
virtual_session_command(sessionId, 'mypassword');
virtual_session_command(sessionId, 'mypassword'); // confirm

// Play the game
virtual_session_command(sessionId, 'look');
virtual_session_command(sessionId, 'inventory');
virtual_session_command(sessionId, 'north');
virtual_session_command(sessionId, 'attack goblin');
```

3. **Check session status:**

```javascript
virtual_session_info(sessionId);
// Returns: username, authenticated, state, currentRoom, etc.
```

4. **Close when done:**

```javascript
virtual_session_close(sessionId);
```

### How It Works

- Virtual sessions simulate a real player connection
- Commands are processed through the same state machine as real players
- Output is captured and returned (including ANSI colors)
- Sessions persist until explicitly closed or inactive for 1 hour
- You can have multiple virtual sessions simultaneously

### Tips

- **Usernames must be alphanumeric only** (a-z, A-Z, 0-9) - no underscores, hyphens, or special characters
- Use `waitMs` parameter to adjust response timing (default 100ms)
- Increase wait time for commands that take longer to process
- Virtual sessions show up in the online users list
- Session state is tracked just like real users (authenticated, in combat, etc.)

## Security Considerations

- The MCP server provides **read-only** access to game data via query tools
- Virtual sessions provide **read-write** access (can create users, modify game state)
- Runs on localhost by default (port 3100)
- CORS enabled for local development
- Requires API key authentication (set `ELLYMUD_MCP_API_KEY` environment variable)
- Suitable for local development and debugging
- For production use, add additional authentication and restrict CORS

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
