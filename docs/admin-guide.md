# Admin Guide

Complete guide to EllyMUD's administrative features, including the web dashboard, World Builder, console interface, and server management.

## Table of Contents

- [Admin Access](#admin-access)
- [Web Dashboard](#web-dashboard)
- [World Builder](#world-builder)
- [Server Console](#server-console)
- [User Management](#user-management)
- [Session Management](#session-management)
- [System Monitoring](#system-monitoring)
- [Security Settings](#security-settings)

---

## Admin Access

### First-Time Setup

On first run, EllyMUD prompts you to create an admin password:

```bash
npm start

# You'll see:
⚠️  No admin user found. Creating admin account...
Enter admin password: ********
Confirm password: ********
✓ Admin account created successfully!
```

### Admin Login Methods

**1. Auto-login (Development)**
```bash
# Skip login prompt, auto-login as admin
npm run start-admin
# Or: npm start -- --adminSession
# Or: npm start -- -af
```

**2. Web Dashboard**
1. Navigate to `http://localhost:8080/admin`
2. Enter credentials:
   - Username: `admin`
   - Password: [your admin password]

**3. In-Game Console**
From any game session, type:
```
/admin login <password>
```

### Resetting Admin Password

**Method 1: Setup Script**
```bash
npm run setup:admin
# Follow prompts to reset password
```

**Method 2: Manual Edit**
```bash
# Stop server
npm stop

# Edit admin.json
nano data/admin.json

# Delete the file to reset
rm data/admin.json

# Restart - will prompt for new password
npm start
```

---

## Web Dashboard

Access the admin dashboard at: `http://localhost:8080/admin`

### Dashboard Overview

The admin dashboard provides a React-based interface for server management:

**Main Sections:**
- **Overview** - System statistics, uptime, player count
- **Players** - Online users, session management
- **World Builder** - Visual room editor (see below)
- **Rooms** - Room management, editing
- **Items** - Item templates, instances
- **NPCs** - NPC management, spawning
- **Logs** - Live log viewer
- **Settings** - Server configuration
- **Bug Reports** - Player-submitted bug reports

### System Overview Panel

**Displays:**
- Server uptime
- Current player count
- Active sessions
- Total registered users
- System resource usage (CPU, memory)
- Database connection status
- Redis connection status (if enabled)

**Actions:**
- Restart server (with countdown)
- Broadcast message to all players
- Schedule shutdown

### Players Panel

**Features:**
- View all online players
- Player details (level, room, stats)
- Kick player
- Transfer session
- View player logs
- Modify player stats (gold, XP, level)

**Example Actions:**
```
1. Click player name → View details
2. "Transfer Session" → Move player to another device
3. "Tail Logs" → Real-time view of player's session
4. "Kick" → Disconnect player
```

### Rooms Panel

**Features:**
- Browse all rooms
- Edit room properties
- Create new rooms
- Delete rooms
- View room state (current items, NPCs)

**Room Editor:**
- Title, description
- Exits (north, south, east, west, up, down, etc.)
- Safe zone flag
- Shop/Bank flags
- Item spawns
- NPC spawns

### Items Panel

**Features:**
- View all item templates
- Create new items
- Edit item properties
- View item instances (specific items in world)
- Delete items

**Item Properties:**
- Name, description
- Type (weapon, armor, consumable, quest, misc)
- Equipment slot
- Value (gold)
- Weight
- Global limit (max instances in world)
- Stat bonuses (strength, dexterity, etc.)
- Damage/armor values

### NPCs Panel

**Features:**
- View all NPC templates
- Create new NPCs
- Edit NPC properties
- Spawn NPCs in rooms
- View active NPC instances

**NPC Properties:**
- Name, description
- Level, health, damage
- Aggression level (passive, defensive, aggressive)
- Respawn time
- Drop table (items dropped on death)
- Merchant inventory (if shop NPC)

### Bug Reports Panel

**Features:**
- View player-submitted bug reports
- Mark as resolved
- Add admin notes
- Export reports

---

## World Builder

The **World Builder** is a visual, drag-and-drop interface for creating and managing rooms.

### Accessing World Builder

1. Open admin dashboard: `http://localhost:8080/admin`
2. Click **"World Builder"** in sidebar
3. Visual editor loads with current rooms

### Interface Overview

**Components:**
- **Canvas** - Visual representation of rooms (React Flow)
- **Node** - Each box represents a room
- **Edge** - Lines represent exits between rooms
- **Toolbar** - Create, delete, zoom, fit view
- **Properties Panel** - Edit selected room/exit

### Creating Rooms

**Method 1: Drag & Drop**
1. Click "Add Room" button
2. Drag new room node to desired position
3. Click node to edit properties

**Method 2: From Existing Room**
1. Select a room node
2. Click "Add Connected Room"
3. Choose direction (north, south, etc.)
4. New room created automatically

### Editing Rooms

**Click any room node to edit:**
- **ID** - Unique room identifier (e.g., `town_square`)
- **Title** - Display name (e.g., "Town Square")
- **Description** - Full room description
- **Area** - Area/zone grouping
- **Flags** - Safe zone, shop, bank, etc.

**Save** - Click "Save" button to persist changes

### Creating Exits

**Method 1: Drag Connection**
1. Hover over room node
2. Drag from connection point
3. Drop on target room
4. Choose direction

**Method 2: Properties Panel**
1. Select room
2. In "Exits" section, click "Add Exit"
3. Choose direction and target room ID
4. Optionally mark as one-way

### Deleting Rooms

1. Select room node
2. Press Delete key or click "Delete" button
3. Confirm deletion
4. All exits to/from room are removed

### Room Arrangement

**Auto-Layout:**
- Click "Auto-Layout" to arrange rooms algorithmically
- Useful after adding many rooms

**Manual Positioning:**
- Drag rooms to desired positions
- Positions are saved automatically

**Zoom & Pan:**
- Mouse wheel to zoom
- Click & drag background to pan
- "Fit View" button to center all rooms

### Area Management

**Grouping by Area:**
1. Create rooms
2. Set "Area" property (e.g., "town", "forest", "dungeon")
3. Rooms are visually grouped by color

**Area Colors:**
- Automatically assigned based on area name
- Helps visualize distinct zones

### Best Practices

**Room IDs:**
- Use lowercase with underscores: `town_square`, `dark_forest_1`
- Be descriptive and unique
- Avoid special characters

**Descriptions:**
- Be vivid and immersive
- Mention visible exits
- Describe atmosphere, sounds, smells

**Exit Consistency:**
- If room A has "north" to room B, room B should have "south" to room A
- World Builder auto-suggests bidirectional exits

**Testing:**
- After building, test in-game navigation
- Use admin commands to teleport: `/teleport town_square`

---

## Server Console

EllyMUD provides an interactive console for server management.

### Accessing Console

**From running server:**
Press Ctrl+C once (graceful shutdown prompt) then type commands, or use admin session:

```bash
npm run start-admin
```

### Console Commands

**Server Management:**
```
/shutdown [seconds]       - Schedule shutdown with countdown
/restart                  - Restart server
/broadcast <message>      - Send message to all players
/reload rooms             - Reload room data from file
/reload items             - Reload item data
/reload npcs              - Reload NPC data
```

**User Management:**
```
/users                    - List all registered users
/kick <username>          - Disconnect user
/ban <username>           - Ban user
/unban <username>         - Unban user
/grant <username> admin   - Grant admin privileges
```

**World Management:**
```
/spawn npc <npc_id> <room_id>  - Spawn NPC in room
/teleport <username> <room_id> - Teleport player
/heal <username>               - Fully heal player
/damage <username> <amount>    - Damage player (testing)
```

**Debugging:**
```
/stats                    - Server statistics
/memory                   - Memory usage
/sessions                 - Active sessions
/logs tail <username>     - Tail user's session log
```

### Example Console Session

```bash
$ npm run start-admin

EllyMUD Admin Console
>
> /users
Total users: 42
Online: 3 (player1, player2, admin)

> /broadcast Server maintenance in 5 minutes
Broadcast sent to 3 players

> /stats
Uptime: 2h 15m 33s
Players: 3 / 100
Rooms: 156
NPCs: 23 active
Memory: 245 MB
```

---

## User Management

### Viewing Users

**Web Dashboard:**
1. Admin Dashboard → Players
2. View list of all users
3. Filter by online/offline
4. Sort by level, playtime, etc.

**API:**
```bash
curl -H "Authorization: Bearer $JWT_TOKEN" \
  http://localhost:8080/api/users
```

### Modifying Users

**Web Dashboard:**
1. Click username
2. Edit properties:
   - Gold
   - Experience
   - Level
   - Health/Mana
   - Stats (strength, dexterity, etc.)
3. Save changes

**Console:**
```
/grant player1 admin      - Make admin
/setgold player1 10000    - Set gold
/setlevel player1 50      - Set level
```

### Banning Users

**Temporary Ban:**
```
/ban player1 24h "Spamming chat"
```

**Permanent Ban:**
```
/ban player1 "Harassment"
```

**Unban:**
```
/unban player1
```

**View Bans:**
```
/bans
```

---

## Session Management

### Active Sessions

**View active sessions:**
```
/sessions

# Output:
Session ID: abc123
  User: player1
  Connection: WebSocket
  Room: town_square
  Duration: 1h 25m
```

### Session Transfer

Transfer a player's session to another device (useful for mobile → desktop):

**Web Dashboard:**
1. Admin Dashboard → Players
2. Click player → "Transfer Session"
3. Share transfer code with player
4. Player connects on new device with code

**Console:**
```
/transfer player1

# Output:
Transfer code: XYZ789
Valid for: 5 minutes
```

### Session Logs

**Real-time tail:**
```bash
# Console
/logs tail player1

# Or via log file
tail -f logs/users/player1.log
```

---

## System Monitoring

### Server Metrics

**Web Dashboard:**
- Admin Dashboard → Overview
- Real-time graphs for CPU, memory, connections

**CLI:**
```bash
# System stats
/stats

# Memory usage
/memory

# Active sessions
/sessions
```

### Log Files

**Location:** `logs/`

```
logs/
├── system.log              # General server logs
├── error.log               # Error logs only
├── access.log              # HTTP access logs
├── mcp-server.log          # MCP server logs
└── users/
    ├── player1.log         # Per-user activity
    └── player2.log
```

**Viewing:**
```bash
# Live tail
tail -f logs/system.log

# Search for errors
grep -i error logs/error.log

# User activity
tail -f logs/users/player1.log
```

### Health Checks

**HTTP Endpoint:**
```bash
curl http://localhost:8080/health
# Returns: {"status":"ok","uptime":12345}
```

**MCP Server:**
```bash
curl http://localhost:3100/health
# Returns: {"status":"healthy"}
```

---

## Security Settings

### Remote Admin Access

**Disable remote admin** (only allow local console):

```bash
# Add to .env
DISABLE_REMOTE_ADMIN=true
```

When enabled:
- Web dashboard login disabled
- API admin endpoints return 403
- Console access only

### Password Policy

**Configuration:** `data/mud-config.json`

```json
{
  "minPasswordLength": 8,
  "requireSpecialChars": true,
  "maxLoginAttempts": 3
}
```

### Rate Limiting

**Default limits:**
- Login attempts: 5 per 15 minutes
- API requests: 100 per 15 minutes
- Command rate: 10 per second per user

**Configuration:** Edit `src/server/apiServer.ts` and `src/command/commandHandler.ts`

### Audit Logging

All admin actions are logged:

```bash
grep "ADMIN:" logs/system.log

# Example output:
[2026-01-17 12:34:56] ADMIN: user 'admin' granted admin to 'player1'
[2026-01-17 12:35:12] ADMIN: user 'admin' kicked 'spammer'
[2026-01-17 12:36:00] ADMIN: user 'admin' modified room 'town_square'
```

### MCP API Key Management

**Rotate API key:**
```bash
# Generate new key
NEW_KEY=$(openssl rand -hex 32)

# Update .env
sed -i "s/ELLYMUD_MCP_API_KEY=.*/ELLYMUD_MCP_API_KEY=$NEW_KEY/" .env

# Restart server
npm restart

# Update MCP clients with new key
```

---

## Related Documentation

- [Configuration Guide](configuration.md) - Admin environment setup
- [API Reference](api-reference.md) - Admin API endpoints
- [Commands Reference](commands.md) - In-game admin commands
- [Deployment Guide](deployment.md) - Production admin setup

---

**Need help?** Open an [issue](https://github.com/ellyseum/ellymud/issues) or check the [troubleshooting guide](troubleshooting.md).
