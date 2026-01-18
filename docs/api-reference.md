# API Reference

Complete reference for EllyMUD's REST API and Model Context Protocol (MCP) server.

## Table of Contents

- [REST API](#rest-api)
- [MCP Server](#mcp-server)
- [Authentication](#authentication)
- [Rate Limiting](#rate-limiting)

---

## REST API

EllyMUD provides a RESTful API for external integrations and admin operations.

### Base URL

```
http://localhost:8080/api
```

### Authentication

Most endpoints require JWT authentication. Include the token in the Authorization header:

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:8080/api/users
```

**Get JWT Token:**
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your_password"}'

# Response:
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "username": "admin",
    "role": "admin"
  }
}
```

### Endpoints

#### Health Check

**GET** `/health`

Check server status (no auth required).

```bash
curl http://localhost:8080/health
```

**Response:**
```json
{
  "status": "ok",
  "uptime": 12345
}
```

---

#### Users

**GET** `/api/users`

Get all registered users (admin only).

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/users
```

**Response:**
```json
[
  {
    "username": "player1",
    "level": 5,
    "gold": 250,
    "currentRoom": "town_square",
    "createdAt": "2026-01-15T10:30:00Z"
  }
]
```

---

**GET** `/api/users/:username`

Get specific user details (admin only).

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/users/player1
```

**Response:**
```json
{
  "username": "player1",
  "level": 5,
  "experience": 1200,
  "gold": 250,
  "currentRoom": "town_square",
  "stats": {
    "strength": 12,
    "dexterity": 10,
    "constitution": 14,
    "intelligence": 8,
    "wisdom": 9,
    "charisma": 11
  },
  "health": {
    "current": 85,
    "max": 100
  },
  "mana": {
    "current": 45,
    "max": 50
  },
  "inventory": [...],
  "equipment": {...}
}
```

---

**POST** `/api/users/:username/modify`

Modify user properties (admin only).

```bash
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"gold": 10000, "level": 50}' \
  http://localhost:8080/api/users/player1/modify
```

**Body Parameters:**
- `gold` (number): Set gold amount
- `level` (number): Set level
- `experience` (number): Set experience
- `health` (number): Set current health
- `mana` (number): Set current mana

**Response:**
```json
{
  "success": true,
  "user": { ... }
}
```

---

#### Rooms

**GET** `/api/rooms`

Get all rooms.

```bash
curl http://localhost:8080/api/rooms
```

**Response:**
```json
[
  {
    "id": "town_square",
    "title": "Town Square",
    "description": "A bustling town square...",
    "exits": {
      "north": "market_street",
      "south": "main_road"
    },
    "flags": {
      "safeZone": true
    }
  }
]
```

---

**GET** `/api/rooms/:roomId`

Get specific room details.

```bash
curl http://localhost:8080/api/rooms/town_square
```

**Response:**
```json
{
  "id": "town_square",
  "title": "Town Square",
  "description": "A bustling town square...",
  "exits": {...},
  "currentState": {
    "players": ["player1", "player2"],
    "npcs": ["guard_1"],
    "items": ["sword_1"],
    "gold": 5
  }
}
```

---

**PUT** `/api/rooms/:roomId`

Update room properties (admin only).

```bash
curl -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "New Title", "description": "New description"}' \
  http://localhost:8080/api/rooms/town_square
```

---

#### Items

**GET** `/api/items`

Get all item templates.

```bash
curl http://localhost:8080/api/items
```

**Response:**
```json
[
  {
    "id": "iron_sword",
    "name": "Iron Sword",
    "description": "A sturdy iron sword",
    "type": "weapon",
    "slot": "mainHand",
    "value": 50,
    "damage": 10,
    "bonuses": {
      "strength": 2
    }
  }
]
```

---

**GET** `/api/items/instances`

Get all item instances in the world (admin only).

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/items/instances
```

---

#### NPCs

**GET** `/api/npcs`

Get all NPC templates.

```bash
curl http://localhost:8080/api/npcs
```

**Response:**
```json
[
  {
    "id": "goblin",
    "name": "Goblin",
    "description": "A small green goblin",
    "level": 3,
    "health": 30,
    "damage": 5,
    "aggression": "aggressive",
    "drops": [
      {"itemId": "gold_coin", "chance": 0.8, "quantity": [1, 5]}
    ]
  }
]
```

---

**POST** `/api/npcs/spawn`

Spawn NPC in a room (admin only).

```bash
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"npcId": "goblin", "roomId": "dark_forest"}' \
  http://localhost:8080/api/npcs/spawn
```

---

#### Combat

**GET** `/api/combat/state`

Get current combat states (admin only).

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/combat/state
```

**Response:**
```json
{
  "activeCombats": [
    {
      "combatId": "combat_123",
      "room": "dark_forest",
      "participants": {
        "player1": {
          "health": 75,
          "maxHealth": 100
        },
        "goblin_1": {
          "health": 15,
          "maxHealth": 30
        }
      },
      "turn": 1,
      "turnOrder": ["player1", "goblin_1"]
    }
  ]
}
```

---

#### Configuration

**GET** `/api/config`

Get server configuration (admin only).

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/config
```

**Response:**
```json
{
  "gameName": "EllyMUD",
  "maxPlayers": 100,
  "startingRoom": "town_square",
  "enablePvP": false,
  ...
}
```

---

**PUT** `/api/config`

Update configuration (admin only).

```bash
curl -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"maxPlayers": 200}' \
  http://localhost:8080/api/config
```

---

#### Admin Actions

**POST** `/api/admin/broadcast`

Broadcast message to all players (admin only).

```bash
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "Server restart in 5 minutes"}' \
  http://localhost:8080/api/admin/broadcast
```

---

**POST** `/api/admin/shutdown`

Schedule server shutdown (admin only).

```bash
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"seconds": 300, "reason": "Maintenance"}' \
  http://localhost:8080/api/admin/shutdown
```

---

## MCP Server

The Model Context Protocol (MCP) server provides AI tools with game data access and testing capabilities.

### Base URL

```
http://localhost:3100
```

### Authentication

MCP server requires API key authentication:

```bash
curl -H "Authorization: Bearer YOUR_MCP_API_KEY" \
  http://localhost:3100/api/tools
```

### Setup

1. **Generate API Key:**
   ```bash
   openssl rand -hex 32
   ```

2. **Add to .env:**
   ```bash
   ELLYMUD_MCP_API_KEY=your_generated_key_here
   ```

3. **Configure MCP Client:**
   ```json
   {
     "mcpServers": {
       "ellymud": {
         "url": "http://localhost:3100",
         "apiKey": "your_generated_key_here"
       }
     }
   }
   ```

### Available MCP Tools

#### get_online_users

Get list of currently online players.

**Parameters:** None

**Example:**
```json
{
  "tool": "get_online_users"
}
```

**Response:**
```json
{
  "users": ["player1", "player2"],
  "count": 2
}
```

---

#### get_user_data

Get detailed user information.

**Parameters:**
- `username` (string): Username to query

**Example:**
```json
{
  "tool": "get_user_data",
  "arguments": {
    "username": "player1"
  }
}
```

---

#### get_room_data

Get room information.

**Parameters:**
- `roomId` (string): Room ID to query

**Example:**
```json
{
  "tool": "get_room_data",
  "arguments": {
    "roomId": "town_square"
  }
}
```

---

#### get_all_rooms

Get all rooms in the game.

**Parameters:** None

---

#### get_combat_state

Get current combat states.

**Parameters:** None

---

#### virtual_session_create

Create a virtual AI gameplay session.

**Parameters:**
- `username` (string): Virtual session username
- `options` (object, optional): Session options

**Example:**
```json
{
  "tool": "virtual_session_create",
  "arguments": {
    "username": "ai_tester_1",
    "options": {
      "autoLogin": true
    }
  }
}
```

**Response:**
```json
{
  "sessionId": "virtual_abc123",
  "username": "ai_tester_1"
}
```

---

#### virtual_session_send_command

Send command to virtual session.

**Parameters:**
- `sessionId` (string): Virtual session ID
- `command` (string): Command to execute

**Example:**
```json
{
  "tool": "virtual_session_send_command",
  "arguments": {
    "sessionId": "virtual_abc123",
    "command": "look"
  }
}
```

**Response:**
```json
{
  "output": "Town Square\nA bustling town square...\nExits: north, south"
}
```

---

#### virtual_session_destroy

Destroy virtual session.

**Parameters:**
- `sessionId` (string): Virtual session ID

---

#### set_test_mode

Enable/disable test mode for deterministic game ticks.

**Parameters:**
- `enabled` (boolean): Enable test mode

**Example:**
```json
{
  "tool": "set_test_mode",
  "arguments": {
    "enabled": true
  }
}
```

---

#### advance_game_ticks

Advance game timer by N ticks (requires test mode).

**Parameters:**
- `ticks` (number): Number of ticks to advance

**Example:**
```json
{
  "tool": "advance_game_ticks",
  "arguments": {
    "ticks": 5
  }
}
```

---

#### tail_user_session

Get recent session output for a user.

**Parameters:**
- `username` (string): Username to tail
- `lines` (number, optional): Number of lines (default: 50)

**Example:**
```json
{
  "tool": "tail_user_session",
  "arguments": {
    "username": "player1",
    "lines": 20
  }
}
```

---

### MCP Health Check

**GET** `/health`

Check MCP server status (no auth required).

```bash
curl http://localhost:3100/health
```

**Response:**
```json
{
  "status": "healthy",
  "version": "1.1.0",
  "uptime": 12345
}
```

---

### MCP Configuration

**Environment Variables:**
- `ELLYMUD_MCP_API_KEY` - API key (required)
- `MCP_PORT` - Server port (default: 3100)
- `MCP_HOST` - Bind host (default: 0.0.0.0)

---

## Authentication

### JWT Tokens

**Format:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Expiration:** 24 hours

**Refresh:** Re-authenticate when expired

### MCP API Keys

**Format:** 64-character hexadecimal string

**Example:**
```
Authorization: Bearer a1b2c3d4e5f6...
```

**Security:**
- Store in `.env` file
- Never commit to version control
- Rotate periodically
- Use different keys for dev/staging/production

---

## Rate Limiting

### REST API

**Login Endpoint:**
- 5 attempts per 15 minutes per IP

**API Endpoints:**
- 100 requests per 15 minutes per IP

**Response (when rate limited):**
```json
{
  "error": "Too many requests, please try again later.",
  "retryAfter": 900
}
```

### MCP Server

**No rate limiting by default**

Implement rate limiting in your MCP client if needed.

---

## Error Responses

### Standard Error Format

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "Additional information"
  }
}
```

### Common HTTP Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| 200 | OK | Successful request |
| 201 | Created | Resource created |
| 400 | Bad Request | Invalid parameters |
| 401 | Unauthorized | Missing/invalid token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

---

## Related Documentation

- [Admin Guide](admin-guide.md) - Admin web dashboard
- [Configuration Guide](configuration.md) - API configuration
- [Development Guide](development.md) - API development

---

**Need help?** Open an [issue](https://github.com/ellyseum/ellymud/issues) or check the [troubleshooting guide](troubleshooting.md).
