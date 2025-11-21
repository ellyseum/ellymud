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

**What happens:**
- Telnet server starts on port **8023**
- HTTP/WebSocket server starts on port **8080**
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
