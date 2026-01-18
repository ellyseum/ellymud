# EllyMUD Documentation

Comprehensive documentation for EllyMUD - a modern, extensible Multi-User Dungeon built with Node.js and TypeScript.

License: AGPL-3.0-or-later; commercial/proprietary licensing available via https://github.com/ellyseum.

---

## 📚 Documentation Index

### Getting Started

| Guide | Description |
|-------|-------------|
| [**Getting Started**](getting-started.md) | Quick start guide for new players and developers |
| [**Commands Reference**](commands.md) | Complete list of all 57+ in-game commands |

### Configuration & Deployment

| Guide | Description |
|-------|-------------|
| [**Configuration Guide**](configuration.md) | Environment variables, CLI flags, and runtime settings |
| [**Docker Deployment**](docker.md) | Container-based deployment with Docker Compose |
| [**Storage Backends**](storage-backends.md) | Choosing and configuring JSON, SQLite, or PostgreSQL |
| [**Deployment Guide**](deployment.md) | Production deployment and hosting instructions |
| [**Performance & Scaling**](performance.md) | Optimization strategies and scaling recommendations |

### Administration

| Guide | Description |
|-------|-------------|
| [**Admin Guide**](admin-guide.md) | Admin dashboard, World Builder, and server management |
| [**API Reference**](api-reference.md) | REST API and MCP server documentation |

### Development

| Guide | Description |
|-------|-------------|
| [**Development Guide**](development.md) | Developer guide for contributing to the project |
| [**Architecture**](architecture.md) | System architecture overview and design patterns |

### Support

| Guide | Description |
|-------|-------------|
| [**Troubleshooting**](troubleshooting.md) | Common issues and solutions |

---

## 📖 Quick Navigation

### I want to...

**...get EllyMUD running**
→ Start with [Getting Started](getting-started.md)

**...deploy to production**
→ See [Docker Deployment](docker.md) and [Deployment Guide](deployment.md)

**...configure environment variables**
→ Read [Configuration Guide](configuration.md)

**...switch from JSON to PostgreSQL**
→ Check [Storage Backends](storage-backends.md)

**...use the admin dashboard**
→ Explore [Admin Guide](admin-guide.md)

**...build the World Builder**
→ Go to [Admin Guide - World Builder](admin-guide.md#world-builder)

**...integrate with the API**
→ Reference [API Documentation](api-reference.md)

**...optimize performance**
→ Follow [Performance & Scaling](performance.md)

**...contribute code**
→ Read [Development Guide](development.md)

**...troubleshoot an issue**
→ Check [Troubleshooting](troubleshooting.md)

---

## 📋 Documentation Standards

### File Organization

Documentation is organized by topic and purpose:

- **User-facing**: Getting started, commands, troubleshooting
- **Admin-facing**: Admin guide, API reference
- **Developer-facing**: Development guide, architecture
- **Deployment**: Configuration, Docker, storage, performance

### Markdown Format

All documentation uses GitHub-flavored Markdown with:
- Clear headings hierarchy (H1 → H2 → H3)
- Table of contents for long documents
- Code blocks with syntax highlighting
- Cross-references to related docs
- Consistent formatting

### Keeping Docs Updated

When making significant changes to the codebase:

1. **Update relevant documentation** immediately
2. **Cross-check related docs** for consistency
3. **Update examples** to match current behavior
4. **Test commands and code samples** before committing
5. **Update version numbers** if applicable

---

## 🔗 Related Resources

### Project Documentation
- [Main README](../README.md) - Project overview and quick start
- [Contributing Guidelines](../CONTRIBUTING.md) - How to contribute
- [Security Policy](../SECURITY.md) - Responsible disclosure
- [Code of Conduct](../CODE_OF_CONDUCT.md) - Community guidelines
- [License](../LICENSE) - AGPL-3.0 license

### Technical Resources
- [Agent Ecosystem](../.github/agents/README.md) - AI development pipeline
- [MCP Server](../src/mcp/README.md) - AI integration details
- [Room System](../src/room/README.md) - Room architecture
- [Admin UI](../src/frontend/admin/README.md) - Admin dashboard details

### External Links
- [GitHub Repository](https://github.com/ellyseum/ellymud)
- [GitHub Issues](https://github.com/ellyseum/ellymud/issues)
- [GitHub Discussions](https://github.com/ellyseum/ellymud/discussions)

---

## 📞 Getting Help

### Documentation First

Before asking for help:
1. Check the [Troubleshooting Guide](troubleshooting.md)
2. Search [closed issues](https://github.com/ellyseum/ellymud/issues?q=is%3Aissue+is%3Aclosed)
3. Review relevant documentation above

### Community Support

- **Questions**: [GitHub Discussions](https://github.com/ellyseum/ellymud/discussions)
- **Bug Reports**: [GitHub Issues](https://github.com/ellyseum/ellymud/issues/new?template=bug_report.md)
- **Feature Requests**: [GitHub Issues](https://github.com/ellyseum/ellymud/issues/new?template=feature_request.md)

### Contributing to Docs

Found a typo or want to improve documentation?

1. Fork the repository
2. Edit the relevant `.md` file in `docs/`
3. Submit a pull request

See [Contributing Guidelines](../CONTRIBUTING.md) for details.

---

**Last updated:** 2026-01-17
