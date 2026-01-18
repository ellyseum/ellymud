# EllyMUD

[![CI](https://github.com/ellyseum/ellymud/actions/workflows/ci.yml/badge.svg)](https://github.com/ellyseum/ellymud/actions/workflows/ci.yml)
[![GitHub Code Scanning](https://github.com/ellyseum/ellymud/actions/workflows/github-code-scanning/codeql/badge.svg)](https://github.com/ellyseum/ellymud/security/code-scanning)
[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-green.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.19.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-green)](https://www.typescriptlang.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![GitHub last commit](https://img.shields.io/github/last-commit/ellyseum/ellymud)](https://github.com/ellyseum/ellymud/commits/main)

A modern, extensible Multi-User Dungeon (MUD) built with Node.js and TypeScript. EllyMUD brings classic text-based RPG gameplay into the modern era with support for multiple connection protocols, real-time multiplayer interaction, and a comprehensive AI-assisted development pipeline.

## 📖 Documentation

| Guide | Description |
|-------|-------------|
| [**Quick Start**](docs/getting-started.md) | Get up and running in 5 minutes |
| [**Configuration**](docs/configuration.md) | Environment variables, CLI options |
| [**Docker Deployment**](docs/docker.md) | Production deployment with Docker |
| [**Storage Backends**](docs/storage-backends.md) | JSON, SQLite, PostgreSQL setup |
| [**Commands Reference**](docs/commands.md) | All 57+ in-game commands |
| [**Admin Guide**](docs/admin-guide.md) | Admin interface & World Builder |
| [**API Reference**](docs/api-reference.md) | REST API & MCP integration |
| [**Troubleshooting**](docs/troubleshooting.md) | Common issues & solutions |
| [**Development**](docs/development.md) | Contributing & local development |
| [**Architecture**](docs/architecture.md) | System design & patterns |
| [**Performance**](docs/performance.md) | Scaling & optimization |

📚 **[Complete Documentation Index](docs/README.md)**

## ✨ Features

### Core Gameplay

- 🎮 **Classic MUD Experience** - Text-based RPG gameplay with rich descriptions
- ⚔️ **Real-Time Combat** - Turn-based combat system with NPCs and PvP support
- 🪄 **Abilities & Spellcasting** - Magic missile, healing spells, and cooldown-based abilities with mana management
- 🗺️ **Room-Based Navigation** - Explore interconnected rooms with safe zones, shops, banks, and combat areas
- 🎒 **Equipment System** - 12 equipment slots (Head, Neck, Chest, Back, Arms, Hands, Finger, Waist, Legs, Feet, Main Hand, Off Hand)
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
- 💾 **Multi-Backend Storage**
  - JSON files (default, zero-config)
  - SQLite (single-file database)
  - PostgreSQL (production-scale)
  - Automatic data migration on backend switch
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
  - Web-based admin panel with React dashboard
  - **World Builder**: Visual drag-and-drop room editor (React Flow)
  - Interactive server console
  - Live session monitoring and user management

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

- **Node.js** 20.19+ ([Download](https://nodejs.org/))
- **npm** 8.x or higher (included with Node.js)

### Installation

```bash
# 1. Clone and install
git clone https://github.com/ellyseum/ellymud.git
cd ellymud
npm run bootstrap

# 2. Start the server
npm start

# 3. Connect
# Web: http://localhost:8080
# Telnet: telnet localhost 8023
```

**First run?** You'll be prompted to create an admin password.

**Next steps:**
- 📖 [Complete setup guide](docs/getting-started.md) - Detailed installation & configuration
- 🐳 [Docker deployment](docs/docker.md) - Production deployment
- ⚙️ [Configuration guide](docs/configuration.md) - Environment variables & options
- 🎮 [Commands reference](docs/commands.md) - Learn all 57+ commands

## 🎮 Basic Commands

Once connected, try these commands:

```
look              # Look around
help              # Show all commands
north / south     # Move between rooms
attack goblin     # Start combat
inventory         # Check your items
abilities         # List abilities
mmis goblin       # Cast magic missile
buy sword         # Purchase items (in shops)
say Hello!        # Chat with other players
```

See [Commands Reference](docs/commands.md) for all 57+ commands.

## 🤖 AI Integration (MCP Server)

EllyMUD includes a Model Context Protocol (MCP) server for AI tool integration:

- **Port 3100** - MCP server with secure API key authentication
- **Virtual Sessions** - AI agents can play autonomously
- **Test Mode** - Deterministic testing for AI validation
- **Compatible with** - GitHub Copilot, Claude, and MCP-compatible clients

On first run, you'll be prompted to generate an API key automatically.

See [API Reference](docs/api-reference.md) for complete MCP documentation.

## 🛠️ Development

**For contributors:**

```bash
# Development with hot reload
npm run dev

# Run tests
npm test

# Build TypeScript
npm run build
```

See [Development Guide](docs/development.md) for complete developer documentation including:
- Project structure
- Coding standards
- Testing strategies
- Pull request process

See [Architecture Guide](docs/architecture.md) for system design and patterns.

## 🔒 Security

- Password hashing with bcrypt
- Role-based access control (RBAC)
- Input validation and rate limiting
- MCP server API key authentication
- Comprehensive audit logging

Found a security vulnerability? See our [Security Policy](SECURITY.md) for responsible disclosure.

## 🌟 Inspiration

EllyMUD draws inspiration from classic MUDs like [MajorMUD](https://en.wikipedia.org/wiki/MajorMUD), bringing nostalgic gameplay mechanics into a modern, extensible codebase.

## 📝 License

This project is licensed under the AGPL-3.0-or-later License - see the [LICENSE](LICENSE) file for details. Commercial/proprietary licensing is available on request; contact via GitHub at https://github.com/ellyseum.

## 🤝 Community

- **Issues**: [GitHub Issues](https://github.com/ellyseum/ellymud/issues)
- **Discussions**: [GitHub Discussions](https://github.com/ellyseum/ellymud/discussions)
- **Contributing**: [CONTRIBUTING.md](CONTRIBUTING.md)
- **Code of Conduct**: [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)

## 🙏 Acknowledgments

EllyMUD was developed as an exploration of modern development workflows, particularly the use of AI-assisted development tools. The project demonstrates how traditional game concepts can be reimagined with contemporary technology stacks and AI-driven development pipelines.

Special thanks to the MUD community for keeping the genre alive and inspiring new generations of developers.

---

**Ready to start?** Check out the [Getting Started Guide](docs/getting-started.md)

**Want to contribute?** Read the [Development Guide](docs/development.md)

**Need help?** See [Troubleshooting](docs/troubleshooting.md) or open an [issue](https://github.com/ellyseum/ellymud/issues/new/choose)
