# EllyMUD

[![CI](https://github.com/ellyseum/ellymud/actions/workflows/ci.yml/badge.svg)](https://github.com/ellyseum/ellymud/actions/workflows/ci.yml)
[![GitHub Code Scanning](https://github.com/ellyseum/ellymud/actions/workflows/github-code-scanning/codeql/badge.svg)](https://github.com/ellyseum/ellymud/security/code-scanning)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-green)](https://www.typescriptlang.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![GitHub last commit](https://img.shields.io/github/last-commit/ellyseum/ellymud)](https://github.com/ellyseum/ellymud/commits/main)

A modern, extensible Multi-User Dungeon (MUD) built with Node.js and TypeScript. EllyMUD brings classic text-based RPG gameplay into the modern era with support for multiple connection protocols, real-time multiplayer interaction, and a comprehensive AI-assisted development pipeline.

## ✨ Features

### Core Gameplay

- 🎮 **Classic MUD Experience** - Text-based RPG gameplay with rich descriptions
- ⚔️ **Real-Time Combat** - Turn-based combat system with NPCs and PvP support
- 🪄 **Abilities & Spellcasting** - Magic missile, healing spells, and cooldown-based abilities with mana management
- 🗺️ **Room-Based Navigation** - Explore interconnected rooms with safe zones, shops, banks, and combat areas
- 🎒 **Inventory System** - Collect, equip, repair, and manage items
- 💰 **Economy System** - Buy/sell at merchant shops, banking with deposit/withdraw
- 📊 **Character Progression** - Level up, train stats, gain experience, and improve abilities
- 💬 **Multi-User Chat** - Say, yell, and social commands for player interaction
- 🎯 **Status Effects** - Poison, stuns, roots, buffs, debuffs, and instant heals
- 💤 **Rest & Regeneration** - Rest and meditate to recover health and mana

### Technical Features

- 🌐 **Multiple Connection Methods**
  - Telnet (port 8023)
  - WebSocket (port 8080)
  - Built-in web client
- 🔒 **Security-First Design**
  - Password hashing with salt
  - Role-based access control (RBAC)
  - Input validation and sanitization
  - Rate limiting and resource protection
  - Comprehensive audit logging
- 🏗️ **Modern Architecture**
  - TypeScript for type safety
  - State machine pattern for client interactions
  - Singleton managers for core systems
  - Repository pattern for data persistence
  - Event-driven combat and effects system
- 🤖 **AI Integration (MCP Server)**
  - Model Context Protocol server on port 3100
  - Virtual sessions for AI gameplay testing
  - Test mode with controllable game ticks
  - RESTful API for game data access
  - GitHub Copilot integration
- 🧪 **Comprehensive Testing**
  - Jest unit testing with 120+ test files
  - E2E testing with virtual sessions
  - Agent-based testing framework
  - Code coverage reporting
- 📝 **Advanced Logging**
  - Per-user activity logs
  - Raw session recordings
  - Daily log rotation
  - Separate error and system logs
- 🎛️ **Admin Interface**
  - Web-based admin panel
  - Interactive server console
  - Live session monitoring
  - User management tools

### AI Development Pipeline

- 🤖 **Multi-Agent Ecosystem** - 10+ specialized AI agents for development
  - Research, Planning, Implementation, and Validation agents
  - Unit Test Creator and Orchestrator
  - Documentation Updater
  - Post-Mortem analysis
- 📊 **Pipeline Metrics** - Execution tracking and analysis
- 🔄 **Safety Features** - Git stash checkpoints and automated rollback

### Fun Extras

- 🐍 **Snake Game** - Play Snake right in the MUD! (Type `snake`)
- 🎨 **ANSI Color Support** - Rich text formatting
- ⚡ **Movement Delays** - Realistic movement based on character stats
- 🤖 **NPC AI** - Enemies with different aggression levels
- 😄 **Social Commands** - Laugh, wave, and more!

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18.x or higher
- **npm** 8.x or higher

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/ellyseum/ellymud.git
   cd ellymud
   ```

2. **Bootstrap the project** (recommended)

   ```bash
   # Using make
   make bootstrap
   
   # Or using npm
   npm run bootstrap
   ```

   Or install manually:

   ```bash
   npm install
   ```

3. **Start the server**

   ```bash
   npm start
   # Or use make:
   make dev
   ```

4. **Connect to the game**
   - **Web Browser**: Open `http://localhost:8080`
   - **Telnet**: `telnet localhost 8023`
   - **Your favorite MUD client**: Connect to `localhost:8023`

That's it! On first run, you'll be prompted to create an admin password.

## 📖 Documentation

Comprehensive documentation is available in the [docs/](docs/) directory:

- **[Getting Started Guide](docs/getting-started.md)** - New user onboarding
- **[Commands Reference](docs/commands.md)** - Complete list of all commands
- **[Development Guide](docs/development.md)** - For contributors
- **[Architecture](docs/architecture.md)** - System design and patterns
- **[Deployment Guide](docs/deployment.md)** - Production deployment

## 🎮 Usage

### Starting Options

```bash
# Standard start with console interface
npm start

# Auto-login as admin
npm run start-admin

# Auto-login as specific user
npm start -- --forceSession=username

# Development mode with hot reload
npm run dev

# Using make (recommended)
make dev          # Development with hot reload
make start        # Production build and run
make help         # Show all available commands
```

### Basic Commands

Once connected, try these commands:

```
look              # Look around
help              # Show all commands
stats             # View your character stats
north / south     # Move between rooms
attack goblin     # Start combat
inventory         # Check your items
say Hello!        # Chat with other players
rest              # Recover health
meditate          # Recover mana
```

### Ability Commands

```
abilities         # List your abilities
mmis goblin       # Cast magic missile
heal              # Cast healing spell
cast fireball     # Cast a spell by name
```

### Economy Commands

```
wares             # View merchant inventory (in shops)
buy sword         # Purchase an item
sell dagger       # Sell an item
balance           # Check bank balance (in banks)
deposit 100       # Deposit gold
withdraw 50       # Withdraw gold
```

Type `help` in-game for a complete list of 50+ commands!

### MCP Server (AI Integration)

EllyMUD includes an integrated Model Context Protocol (MCP) server that provides AI tools (like GitHub Copilot) with access to game data and testing capabilities:

- **Automatic Startup**: MCP server starts automatically on port 3100
- **API Key Setup**: On first run, you'll be prompted to generate a secure API key
- **Virtual Sessions**: AI agents can create game sessions and play autonomously
- **Test Mode**: Control game ticks for deterministic testing
- **Integration**: Works with GitHub Copilot, Claude, and other MCP-compatible clients

**Available MCP Tools:**

- `get_online_users`, `get_user_data` - Player information
- `get_room_data`, `get_all_rooms` - World navigation
- `get_combat_state` - Combat monitoring
- `virtual_session_*` - AI gameplay sessions
- `set_test_mode`, `advance_game_ticks` - Testing controls
- `tail_user_session` - Session output monitoring

**First Run:**

```
⚠️  EllyMUD MCP Server API key is missing.
Would you like to generate one? (Y/n): [Press Enter]

✅ EllyMUD MCP Server key has been added as an environment variable:
   [your-generated-key]

📋 Copy this key and add it to your MCP client configuration!
```

The API key is saved to your `.env` file and can be used in `.vscode/mcp.json` or other MCP client configurations.

For detailed MCP server usage, see [src/mcp/README.md](src/mcp/README.md).

## 🛠️ Development

### Project Structure

```
ellymud/
├── src/                 # TypeScript source code
│   ├── abilities/       # Spellcasting and skill system
│   ├── command/         # Command system (50+ commands)
│   ├── combat/          # Combat mechanics
│   ├── connection/      # Network layer (Telnet, WebSocket, Virtual)
│   ├── effects/         # Status effects system
│   ├── mcp/             # MCP server for AI integration
│   ├── persistence/     # Repository pattern data layer
│   ├── room/            # Room management and types
│   ├── state/           # State machine
│   ├── testing/         # Test mode and state snapshots
│   ├── timer/           # Game timer and regeneration
│   └── user/            # User management
├── data/                # JSON data storage
├── public/              # Web client
├── docs/                # Documentation
├── make/                # Makefile shards
├── scripts/             # Bootstrap and utility scripts
├── test/                # E2E tests
├── .github/agents/      # AI agent ecosystem
└── logs/                # Server logs
```

### Make Commands

EllyMUD uses an organized Makefile system that delegates to npm scripts:

```bash
make help           # Show all available targets

# Setup
make bootstrap      # Full project bootstrap (npm run bootstrap)
make install        # Install dependencies (npm install)

# Development
make dev            # Development with hot reload (npm run dev)
make build          # Build TypeScript (npm run build)
make lint           # Run ESLint (npm run lint)

# Testing
make test           # Run all tests (npm test)
make test-unit      # Unit tests only (npm run test:unit)
make test-cov       # Tests with coverage (npm run test:coverage)
make test-e2e       # E2E tests (npm run test:e2e)
make agent-test     # Agent ecosystem tests (npm run test-agents)

# Server
make start          # Production build and run (npm start)
make stop           # Stop background server

# Docker
make docker-build   # Build Docker image
```

### Testing

```bash
# Run all tests (typecheck + validate + jest)
npm test

# Unit tests only
npm run test:unit

# With coverage
npm run test:coverage

# E2E tests
npm run test:e2e

# Watch mode
npm run test:watch

# Agent tests
npm run test-agents
```

### Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details on:

- Code of conduct
- Development workflow
- Coding standards
- Pull request process

### Building from Source

```bash
# Build TypeScript
npm run build

# Run the compiled JavaScript
node dist/server.js
```

### Stopping the Server

⚠️ **Important**: Never use `pkill node` or `killall node` as this will crash VS Code and other Node.js applications.

```bash
# Safe way to stop EllyMUD servers
lsof -i :8023 -t | xargs kill    # Telnet server
lsof -i :8080 -t | xargs kill    # WebSocket server
lsof -i :3100 -t | xargs kill    # MCP server
```

## 🔒 Security

Security is a priority in EllyMUD. We implement:

- **Password hashing** with bcrypt
- **Role-based access control** (RBAC)
- **Input validation** and sanitization
- **Rate limiting** to prevent abuse
- **Resource exhaustion protection**
- **Comprehensive audit logging**
- **Session management**
- **MCP Server API Key** - Secure authentication for AI tool access
  - Auto-generated 256-bit key on first run
  - Stored in `.env` file (never committed to version control)
  - Required for all MCP API requests (except health checks)
  - Server refuses to start MCP without valid API key

Found a security vulnerability? Please see our [Security Policy](SECURITY.md) for responsible disclosure.

## 📊 System Requirements

### Minimum

- 1 CPU core
- 512 MB RAM
- 5 GB disk space
- Node.js 18+

### Recommended

- 2+ CPU cores
- 2 GB RAM
- 20 GB disk space
- Linux OS (Ubuntu 20.04+)

## 🌟 Inspiration

EllyMUD draws inspiration from classic MUDs like [MajorMUD](https://en.wikipedia.org/wiki/MajorMUD), bringing nostalgic gameplay mechanics into a modern, extensible codebase.

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Community

- **Issues**: [GitHub Issues](https://github.com/ellyseum/ellymud/issues)
- **Discussions**: [GitHub Discussions](https://github.com/ellyseum/ellymud/discussions)
- **Contributing**: [CONTRIBUTING.md](CONTRIBUTING.md)
- **Code of Conduct**: [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)

## 🙏 Acknowledgments

EllyMUD was developed as an exploration of modern development workflows, particularly the use of AI-assisted development tools. The project demonstrates how traditional game concepts can be reimagined with contemporary technology stacks and AI-driven development pipelines.

Special thanks to the MUD community for keeping the genre alive and inspiring new generations of developers.

## 📚 Additional Resources

- [Complete Command List](docs/commands.md) - All 50+ commands documented
- [Architecture Documentation](docs/architecture.md) - System design and patterns
- [Deployment Guide](docs/deployment.md) - Production deployment
- [MCP Server Documentation](src/mcp/README.md) - AI integration details
- [Agent Ecosystem](.github/agents/README.md) - AI development pipeline

---

**Ready to start your adventure?** Check out the [Getting Started Guide](docs/getting-started.md)!

**Want to contribute?** Read the [Development Guide](docs/development.md)!

**Need help?** Open an [issue](https://github.com/ellyseum/ellymud/issues/new/choose)!
