# EllyMUD

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)

A modern, extensible Multi-User Dungeon (MUD) built with Node.js and TypeScript. EllyMUD brings classic text-based RPG gameplay into the modern era with support for multiple connection protocols, real-time multiplayer interaction, and a comprehensive admin system.

## ✨ Features

### Core Gameplay
- 🎮 **Classic MUD Experience** - Text-based RPG gameplay with rich descriptions
- ⚔️ **Real-Time Combat** - Turn-based combat system with NPCs and PvP support
- 🗺️ **Room-Based Navigation** - Explore interconnected rooms with dynamic events
- 🎒 **Inventory System** - Collect, equip, and manage items
- 📊 **Character Progression** - Level up, gain experience, and improve stats
- 💬 **Multi-User Chat** - Communicate with other players in real-time
- 🎯 **Status Effects** - Buffs, debuffs, and persistent effects

### Technical Features
- 🌐 **Multiple Connection Methods**
  - Telnet (port 8023)
  - WebSocket (port 8080)
  - Built-in web client
- 🔒 **Security-First Design**
  - Password hashing with salt
  - Role-based access control (RBAC)
  - Input validation and sanitization
  - Comprehensive audit logging
- 🏗️ **Modern Architecture**
  - TypeScript for type safety
  - State machine pattern for client interactions
  - Singleton managers for core systems
  - Event-driven combat system
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

### Fun Extras
- 🐍 **Snake Game** - Play Snake right in the MUD! (Type `snake`)
- 🎨 **ANSI Color Support** - Rich text formatting
- ⚡ **Movement Delays** - Realistic movement based on character stats
- 🤖 **NPC AI** - Enemies with different aggression levels

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

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the server**
   ```bash
   npm start
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
npm run start:admin

# Auto-login as specific user
npm start -- --forceSession=username

# Development mode with hot reload
npm run dev
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
```

Type `help` in-game for a complete list of commands!

## 🛠️ Development

### Project Structure

```
ellymud/
├── src/              # TypeScript source code
│   ├── command/     # Command system
│   ├── combat/      # Combat mechanics
│   ├── connection/  # Network layer
│   ├── room/        # Room management
│   ├── state/       # State machine
│   └── user/        # User management
├── data/            # JSON data storage
├── public/          # Web client
├── docs/            # Documentation
└── logs/            # Server logs
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

## 🔒 Security

Security is a priority in EllyMUD. We implement:

- Password hashing with bcrypt
- Role-based access control
- Input validation and sanitization
- Comprehensive audit logging
- Session management

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

EllyMUD was developed as an exploration of modern development workflows, particularly the use of AI-assisted development tools. The project demonstrates how traditional game concepts can be reimagined with contemporary technology stacks.

Special thanks to the MUD community for keeping the genre alive and inspiring new generations of developers.

## 📚 Additional Resources

- [Complete Command List](docs/commands.md)
- [Architecture Documentation](docs/architecture.md)
- [Deployment Guide](docs/deployment.md)
- [API Documentation](docs/architecture.md#key-subsystems)

---

**Ready to start your adventure?** Check out the [Getting Started Guide](docs/getting-started.md)!

**Want to contribute?** Read the [Development Guide](docs/development.md)!

**Need help?** Open an [issue](https://github.com/ellyseum/ellymud/issues/new/choose)!
