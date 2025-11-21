# EllyMUD Documentation

Welcome to the comprehensive documentation for EllyMUD! This directory contains all the guides and references you need to use, develop, and deploy EllyMUD.

## Documentation Index

### For New Users

**[Getting Started Guide](getting-started.md)** - Start here!
- Installation instructions
- First steps in the game
- Basic commands
- Troubleshooting common issues

**[Commands Reference](commands.md)** - Complete command list
- All available commands
- Command syntax and examples
- Tips and tricks
- Role-specific commands

### For Developers

**[Development Guide](development.md)** - Contributing code
- Development environment setup
- Project structure
- Adding new features
- Testing and debugging
- Best practices

**[Architecture Documentation](architecture.md)** - System design
- High-level architecture
- Design patterns
- Component overview
- Data flow
- Extensibility

### For System Administrators

**[Deployment Guide](deployment.md)** - Production setup
- Server requirements
- Deployment options
- Security hardening
- Monitoring and maintenance
- Backup and recovery

### Additional Documentation

**[CONTRIBUTING.md](../CONTRIBUTING.md)** - Contribution guidelines
- How to contribute
- Code style guide
- Git commit conventions
- Pull request process

**[SECURITY.md](../SECURITY.md)** - Security policy
- Reporting vulnerabilities
- Security best practices
- Known considerations
- Security features

**[CODE_OF_CONDUCT.md](../CODE_OF_CONDUCT.md)** - Community guidelines
- Expected behavior
- Enforcement policy
- Reporting issues

## Quick Links

### Common Tasks

- **Installing EllyMUD**: [Getting Started → Installation](getting-started.md#installation)
- **Starting the server**: [Getting Started → Starting the Server](getting-started.md#starting-the-server)
- **Adding a new command**: [Development Guide → Adding New Features](development.md#adding-a-new-command)
- **Deploying to production**: [Deployment Guide → Production Setup](deployment.md#production-setup)
- **Reporting a bug**: [CONTRIBUTING.md → Reporting Bugs](../CONTRIBUTING.md#reporting-bugs)
- **Security vulnerability**: [SECURITY.md → Reporting](../SECURITY.md#reporting-a-vulnerability)

### By Role

**Players:**
- [Getting Started Guide](getting-started.md)
- [Commands Reference](commands.md)

**Developers:**
- [Development Guide](development.md)
- [Architecture Documentation](architecture.md)
- [CONTRIBUTING.md](../CONTRIBUTING.md)

**Administrators:**
- [Deployment Guide](deployment.md)
- [SECURITY.md](../SECURITY.md)
- [Commands Reference](commands.md) (Admin section)

## What is EllyMUD?

EllyMUD is a Multi-User Dungeon (MUD) - a text-based multiplayer online role-playing game built with Node.js and TypeScript.

### Key Features

- 🎮 **Classic MUD gameplay** with modern architecture
- 🌐 **Multiple connection methods**: Telnet, WebSocket, web browser
- ⚔️ **Real-time combat** with turn-based mechanics
- 👥 **Multiplayer** - Play with friends
- 🔧 **Highly extensible** - Easy to add new features
- 📊 **Comprehensive logging** - Detailed audit trails
- 🔒 **Secure** - Password hashing, RBAC, input validation
- 🎨 **Web admin interface** - Manage the game from your browser

### Technology Stack

- **Language**: TypeScript
- **Runtime**: Node.js 18+
- **Protocols**: Telnet, WebSocket, HTTP
- **Data Storage**: JSON files (easily adaptable to databases)
- **Logging**: Winston with daily rotation
- **State Management**: State machine pattern

## Documentation Standards

When contributing to documentation:

### Style Guidelines

- Use clear, concise language
- Include practical examples
- Add code blocks with syntax highlighting
- Use headings for structure
- Keep lines to 80-120 characters
- Add links to related documentation

### Example Format

```markdown
### Command Name

Brief description of what the command does.

**Usage:**
\```
command <required> [optional]
\```

**Examples:**
\```
command example1
command example2 --flag
\```

**Notes:**
- Important detail 1
- Important detail 2
```

## Documentation Maintenance

Documentation must be kept up to date with code changes. See the [Documentation Maintenance](../.github/copilot-instructions.md#documentation-maintenance) section in the Copilot instructions.

### When to Update Documentation

- Adding new features → Update relevant guides
- Changing commands → Update commands.md
- Modifying architecture → Update architecture.md
- Changing workflows → Update development.md
- Security changes → Update SECURITY.md

## Getting Help

Can't find what you're looking for?

1. **Search the docs**: Use your browser's search (Ctrl+F / Cmd+F)
2. **Check the main README**: [README.md](../README.md)
3. **Search issues**: [GitHub Issues](https://github.com/ellyseum/ellymud/issues)
4. **Ask the community**: Open a [new issue](https://github.com/ellyseum/ellymud/issues/new)

## Contributing to Documentation

Found a mistake or want to improve the docs? We welcome contributions!

1. **Fork the repository**
2. **Make your changes** to the documentation
3. **Test that links work** and examples are correct
4. **Submit a pull request**

See [CONTRIBUTING.md](../CONTRIBUTING.md) for detailed guidelines.

## Documentation Structure

```
docs/
├── README.md              # This file - Documentation index
├── getting-started.md     # New user onboarding
├── commands.md            # Complete command reference
├── development.md         # Developer guide
├── architecture.md        # System architecture
└── deployment.md          # Production deployment

Root level:
├── README.md              # Project overview
├── CONTRIBUTING.md        # Contribution guidelines  
├── CODE_OF_CONDUCT.md     # Community guidelines
├── SECURITY.md            # Security policy
└── LICENSE                # MIT License
```

## Document Versions

EllyMUD is in active development. Documentation is updated with each release.

- **Current Version**: 0.0.1
- **Last Updated**: 2025-11-21

Check the [CHANGELOG](../CHANGELOG.md) (if exists) for recent changes.

## License

EllyMUD is open source software licensed under the MIT License. See [LICENSE](../LICENSE) for details.

---

**Ready to get started?** Head to the [Getting Started Guide](getting-started.md)!

**Want to contribute?** Check out the [Development Guide](development.md) and [CONTRIBUTING.md](../CONTRIBUTING.md)!

**Need help?** Open an [issue on GitHub](https://github.com/ellyseum/ellymud/issues)!

---

[← Back to Main README](../README.md)
