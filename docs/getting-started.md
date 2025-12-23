# Getting Started with EllyMUD

Welcome to EllyMUD! This guide will help you get up and running quickly.

## Table of Contents

- [What is EllyMUD?](#what-is-ellymud)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Starting the Server](#starting-the-server)
- [Connecting to the Game](#connecting-to-the-game)
- [First Steps in the Game](#first-steps-in-the-game)
- [Basic Commands](#basic-commands)
- [Next Steps](#next-steps)

## What is EllyMUD?

EllyMUD is a Multi-User Dungeon (MUD) - a text-based multiplayer online role-playing game. It features:

- **Text-based gameplay** with rich descriptions and interactive storytelling
- **Multiple connection methods**: Telnet, WebSocket, or built-in web client
- **Real-time multiplayer** interaction with other players
- **Classic RPG mechanics**: Combat, inventory, character progression, and more
- **Extensible architecture** for easy customization and feature additions

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** version 18.x or higher
  - Check: `node --version`
  - Download from: https://nodejs.org/
- **npm** version 8.x or higher
  - Check: `npm --version`
  - Comes with Node.js
- **Git** (for cloning the repository)
  - Check: `git --version`
  - Download from: https://git-scm.com/

### Optional Tools

- **Telnet client** for traditional MUD experience
  - Windows: Built into Command Prompt
  - macOS: `telnet` command (may need to install)
  - Linux: `telnet` package (usually pre-installed)

## Installation

### Step 1: Clone the Repository

```bash
git clone https://github.com/ellyseum/ellymud.git
cd ellymud
```

### Step 2: Install Dependencies

```bash
npm install
```

This will install all required Node.js packages. It may take a few minutes.

### Step 3: Configure Environment (Optional)

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` if you want to customize settings. The defaults work fine for most users.

Available settings:

```
MAX_PASSWORD_ATTEMPTS=3  # Maximum login attempts before lockout
```

### Step 4: Build the Project

```bash
npm run build
```

This compiles the TypeScript code into JavaScript. You should see output indicating successful compilation.

## Starting the Server

EllyMUD offers several ways to start the server:

### Standard Start

```bash
npm start
```

This starts the server with an interactive console. You'll be prompted to set an admin password on first run.

**First-Time Setup:**

On your very first run, you'll see two setup prompts:

1. **Admin Password Setup**

   ```
   Admin password not set. Please create one:
   ```

   Enter a secure password for the admin account.

2. **MCP Server API Key Setup**

   ```
   ⚠️  EllyMUD MCP Server API key is missing.
   Would you like to generate one? (Y/n):
   ```

   Press Enter or type 'y' to auto-generate a secure API key for AI tool integration.

   If you decline, the MCP server will not start and you'll see:

   ```
   ⚠️  MCP Server NOT started, missing API key
   ```

**What happens:**

- Telnet server starts on port **8023**
- HTTP/WebSocket server starts on port **8080**
- MCP server starts on port **3100** (if API key exists)
- Interactive console provides server management commands

**Console Commands:**

- Press `m` - Send a message to all connected users
- Press `s` - Shutdown server
- Press `u` - List all connected users
- Press `q` - Quit (shutdown immediately)
- Press `h` - Show help for all console commands

### Auto-Login as Admin

```bash
npm run start:admin
```

Automatically logs you in as the admin user with full privileges. Great for testing and administration.

### Auto-Login as Regular User

```bash
npm run start:user
```

Logs in as a regular user without the console interface.

### Development Mode with Hot Reload

```bash
npm run dev
# or
npm run watch
```

Automatically recompiles and restarts when you make code changes. Perfect for development.

### Login as Specific User

```bash
npm start -- --forceSession=username
```

Replace `username` with any existing username to login directly as that user.

## Connecting to the Game

Once the server is running, you have multiple ways to connect:

### Method 1: Web Browser (Easiest)

1. Open your web browser
2. Navigate to: `http://localhost:8080`
3. You'll see the EllyMUD web client interface
4. Enter your username and password (or create a new account)

**Advantages:**

- Easy to use
- Works on any modern browser
- Good for beginners

### Method 2: Telnet (Traditional MUD Experience)

**Windows:**

```cmd
telnet localhost 8023
```

**macOS/Linux:**

```bash
telnet localhost 8023
```

**Note:** On macOS, you may need to enable telnet:

```bash
brew install telnet
```

**Advantages:**

- Authentic MUD experience
- Fast and lightweight
- Works with any telnet client

### Method 3: Third-Party MUD Clients

You can use dedicated MUD clients like:

- **MUSHclient** (Windows)
- **Mudlet** (Cross-platform)
- **TinTin++** (Command-line)
- **Atlantis** (macOS)

Configure them to connect to:

- **Host:** localhost (or your server's IP)
- **Port:** 8023
- **Protocol:** Telnet

## First Steps in the Game

### Creating an Account

1. When you first connect, you'll be prompted to enter a username
2. If the username doesn't exist, you'll be asked to create a new account
3. Enter a secure password (it will be hashed and stored securely)
4. Confirm your password
5. You're in!

### Understanding the Interface

After logging in, you'll see:

```
Welcome to EllyMUD!

You are standing in the Town Square.
A bustling marketplace surrounds you with vendors calling out their wares.
Obvious exits: north, south, east, west

>
```

- **Room Description**: Describes your current location
- **Exits**: Shows where you can go
- **Prompt (>)**: Where you type commands

### Your First Commands

Try these commands to get started:

```
look              - Look around the current room
help              - See all available commands
inventory         - Check your inventory
stats             - View your character stats
who               - See who else is online
say Hello!        - Say something to players in the same room
```

## Basic Commands

Here's a quick reference of essential commands:

### Movement

- `north` / `n` - Go north
- `south` / `s` - Go south
- `east` / `e` - Go east
- `west` / `w` - Go west
- `up` / `u` - Go up
- `down` / `d` - Go down

### Information

- `look` / `l` - Look at the room
- `examine <item>` - Examine an item closely
- `inventory` / `i` - Check your inventory
- `stats` - View your character statistics
- `score` - See your character score
- `help` - List all commands
- `help <command>` - Get help on a specific command

### Communication

- `say <message>` - Speak to players in the same room
- `tell <player> <message>` - Send a private message
- `emote <action>` - Perform an emote action
- `shout <message>` - Shout to all players (if enabled)

### Items

- `get <item>` - Pick up an item
- `drop <item>` - Drop an item
- `equip <item>` - Equip an item
- `unequip <item>` - Unequip an item
- `use <item>` - Use an item

### Combat

- `attack <target>` - Attack an NPC or player
- `flee` - Try to escape from combat
- `cast <spell>` - Cast a spell

### Other

- `quit` - Log out of the game
- `who` - See online players
- `time` - Check game time

## Next Steps

Now that you're set up, here's what to explore next:

1. **Explore the World**
   - Move around and discover different rooms
   - Read room descriptions carefully
   - Look for items to pick up

2. **Learn Combat**
   - Find an NPC to fight
   - Practice basic combat commands
   - Understand health and mana

3. **Interact with Others**
   - Use `who` to see online players
   - Try the `say` command to chat
   - Join others on adventures

4. **Customize Your Character**
   - Find equipment to improve your stats
   - Level up by defeating enemies
   - Discover new abilities

5. **Read More Documentation**
   - [Commands Reference](commands.md) - Complete command list
   - [Development Guide](development.md) - For developers
   - [Architecture](architecture.md) - For developers
   - [MCP Server Guide](../src/mcp/README.md) - AI integration details

## MCP Server (AI Integration)

EllyMUD includes a built-in Model Context Protocol (MCP) server that allows AI tools like GitHub Copilot to access game data and assist with development.

### What is MCP?

The Model Context Protocol provides a standardized way for AI assistants to interact with your application's data. In EllyMUD, this means AI tools can:

- Query online users and their status
- Inspect room data, items, and NPCs
- View combat state and game configuration
- Search through logs for debugging
- Access all game data through a consistent API

### Setup

On first run, EllyMUD will prompt you to generate an API key:

```
⚠️  EllyMUD MCP Server API key is missing.
Would you like to generate one? (Y/n):
```

**Press Enter** or type `y` to automatically generate a secure 256-bit API key. The key will be:

- Saved to your `.env` file
- Displayed once for you to copy
- Required for all MCP API requests

**Example output:**

```
✅ EllyMUD MCP Server key has been added as an environment variable:

   f509ee6bdc93196630fa99b818eff8cb882969576e04a675e9baf3a12bec2dc4

📋 Copy this key and add it to your MCP client configuration!
```

### Using with GitHub Copilot

#### Option 1: Automatic Configuration (Recommended)

The `.vscode/mcp.json` file is already configured to automatically read your API key from the `.env` file:

```json
{
  "servers": {
    "ellymud-mcp-server": {
      "url": "http://localhost:3100",
      "type": "http",
      "headers": {
        "X-API-Key": "${env:ELLYMUD_MCP_API_KEY}"
      }
    }
  }
}
```

GitHub Copilot will automatically use this configuration once the server is running.

#### Option 2: Manual Configuration via VS Code

If the automatic configuration doesn't work or you prefer manual setup:

1. **Open the Command Palette** in VS Code:
   - Press `Cmd+Shift+P` (macOS) or `Ctrl+Shift+P` (Windows/Linux)

2. **List MCP Servers**:
   - Type and select: `>MCP: List Servers`
   - This shows all available MCP servers

3. **Select EllyMUD Server**:
   - Find and click on `ellymud-mcp-server` in the list

4. **Start the Server**:
   - Click the "Start Server" button
   - You'll be prompted: **"Enter EllyMUD MCP Server API Key"**

5. **Paste Your API Key**:
   - Paste the API key that was displayed when you generated it
   - The key should look like: `f509ee6bdc93196630fa99b818eff8cb882969576e04a675e9baf3a12bec2dc4`

6. **Verify Connection**:
   - The server status should change to "Running"
   - You can now use GitHub Copilot with access to EllyMUD game data

**Note:** If you lost your API key, you can find it in your `.env` file under `ELLYMUD_MCP_API_KEY`.

### Testing the MCP Server

With the server running, test the API:

```bash
# Health check (no auth required)
curl http://localhost:3100/health

# Get online users (requires API key)
curl -H "X-API-Key: YOUR_KEY_HERE" http://localhost:3100/api/online-users

# List available tools
curl -H "X-API-Key: YOUR_KEY_HERE" http://localhost:3100/tools
```

### If You Decline API Key Generation

If you choose not to generate an API key, the MCP server will not start:

```
⚠️  MCP Server NOT started, missing API key
```

This is a security feature - the MCP server requires authentication. You can generate a key later by:

1. Manually adding to `.env`:
   ```bash
   ELLYMUD_MCP_API_KEY=$(openssl rand -hex 32)
   ```
2. Or restarting the server and accepting the prompt

### More Information

For detailed MCP server documentation, API endpoints, and integration examples, see:

- [src/mcp/README.md](../src/mcp/README.md)

## Troubleshooting

### Server Won't Start

**Problem:** Port already in use

```
Error: listen EADDRINUSE: address already in use :::8023
```

**Solution:** Another process is using the port. Find and stop it, or change the port in the configuration.

**Problem:** Permission denied

```
Error: EACCES: permission denied
```

**Solution:** Make sure you have write permissions in the directory. On Linux/macOS:

```bash
chmod 755 .
```

### Can't Connect to Server

**Problem:** Connection refused

**Solution:**

- Make sure the server is running (`npm start`)
- Check if firewall is blocking the ports
- Try connecting to `127.0.0.1` instead of `localhost`

### Build Errors

**Problem:** TypeScript compilation errors

**Solution:**

```bash
# Clean and rebuild
rm -rf dist/
npm run build
```

**Problem:** Module not found

**Solution:**

```bash
# Reinstall dependencies
rm -rf node_modules/
npm install
```

### MCP Server Issues

**Problem:** MCP Server won't start

```
⚠️  MCP Server could not start, port already in use
```

**Solution:** Another process is using port 3100. Either:

- Stop the other process using port 3100
- Change MCP port in `src/mcp/mcpServer.ts` (search for `port: number = 3100`)

**Problem:** MCP Server not starting (no API key)

```
⚠️  MCP Server NOT started, missing API key
```

**Solution:** This is expected if you declined key generation. To fix:

```bash
# Generate and add key manually
echo "ELLYMUD_MCP_API_KEY=$(openssl rand -hex 32)" >> .env
```

Then restart the server.

**Problem:** MCP API returns 401 Unauthorized

**Solution:** Your API key is incorrect. Check:

- The key in your `.env` file matches the one in your MCP client config
- The `X-API-Key` header is being sent with requests
- No extra spaces or newlines in the key value

## Getting Help

If you run into issues:

1. Check the [documentation](../README.md)
2. Search [existing issues](https://github.com/ellyseum/ellymud/issues)
3. Ask in the game using the `help` command
4. Open a [new issue](https://github.com/ellyseum/ellymud/issues/new) on GitHub

## What's Next?

- **For Players**: Check out the [Commands Reference](commands.md) to learn all available commands
- **For Developers**: Read the [Development Guide](development.md) to start contributing
- **For Admins**: See the [Deployment Guide](deployment.md) for production setup

Enjoy your adventure in EllyMUD! 🎮

---

[← Back to Main README](../README.md) | [Commands Reference →](commands.md)
