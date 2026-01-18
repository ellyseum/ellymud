# Configuration Guide

This guide covers all configuration options for EllyMUD, including environment variables, CLI flags, and runtime settings.

## Table of Contents

- [Environment Variables](#environment-variables)
- [CLI Flags](#cli-flags)
- [Configuration File](#configuration-file)
- [Best Practices](#best-practices)

---

## Environment Variables

EllyMUD uses environment variables for configuration. Create a `.env` file in the project root or set these in your deployment environment.

### Required Variables (Production)

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `JWT_SECRET` | Secret key for admin JWT tokens | Auto-generated (dev only) | Production only |
| `ELLYMUD_MCP_API_KEY` | API key for MCP server authentication | Prompt on first run | Yes (for MCP) |

### Storage & Database

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `STORAGE_BACKEND` | Storage system: `json`, `sqlite`, `postgres`, `auto` | `json` | `sqlite` |
| `DATABASE_URL` | PostgreSQL connection string | - | `postgresql://user:pass@localhost:5432/ellymud` |

### Session Management

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `USE_REDIS` | Enable Redis for session storage | `false` | `true` |
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379` | `redis://redis-host:6379` |

### Security

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `DISABLE_REMOTE_ADMIN` | Disable remote admin access | `false` | `true` |
| `MAX_PASSWORD_ATTEMPTS` | Failed login attempts before disconnect | `3` | `5` |
| `NODE_ENV` | Environment mode: `development`, `production`, `test` | `development` | `production` |

### Example .env File

**Development:**
```bash
# Auto-generated JWT secret is fine for development
# ELLYMUD_MCP_API_KEY will prompt on first run

# Use JSON files (zero-config)
STORAGE_BACKEND=json

# Optional Redis for testing
USE_REDIS=false
```

**Production:**
```bash
# Security (REQUIRED)
JWT_SECRET=your-secure-random-string-here-use-openssl-rand-base64-32
ELLYMUD_MCP_API_KEY=your-mcp-api-key-here-use-openssl-rand-hex-32

# Storage Backend
STORAGE_BACKEND=postgres
DATABASE_URL=postgresql://ellymud_user:secure_password@localhost:5432/ellymud_production

# Session Management
USE_REDIS=true
REDIS_URL=redis://localhost:6379

# Security
DISABLE_REMOTE_ADMIN=false
MAX_PASSWORD_ATTEMPTS=3
NODE_ENV=production
```

**Docker:**
```bash
# Security
ELLYMUD_MCP_API_KEY=your-mcp-api-key-here
JWT_SECRET=your-jwt-secret-here

# Storage (Docker uses service names as hostnames)
STORAGE_BACKEND=postgres
DATABASE_URL=postgresql://ellymud:ellymud_pass@postgres:5432/ellymud

# Session Management (Docker service name)
USE_REDIS=true
REDIS_URL=redis://redis:6379

NODE_ENV=production
```

### Generating Secure Secrets

**JWT_SECRET (base64, 32 bytes):**
```bash
openssl rand -base64 32
```

**ELLYMUD_MCP_API_KEY (hex, 32 bytes):**
```bash
openssl rand -hex 32
```

Or let the server generate one automatically on first run.

---

## CLI Flags

EllyMUD supports command-line flags for runtime configuration. These override environment variables.

### Server Ports

```bash
# Custom Telnet port (default: 8023)
npm start -- --port=8024

# Custom HTTP/WebSocket port (default: 8080)
npm start -- --httpPort=8081

# Custom WebSocket port (if different from HTTP)
npm start -- --wsPort=8082
```

### Data & Storage

```bash
# Custom data directory (default: ./data)
npm start -- --dataDir=/custom/path/to/data

# Custom rooms file
npm start -- --roomsFile=/path/to/rooms.json

# Custom users file
npm start -- --usersFile=/path/to/users.json

# Custom items file
npm start -- --itemsFile=/path/to/items.json

# Custom NPCs file
npm start -- --npcsFile=/path/to/npcs.json

# Custom MUD config file
npm start -- --mudConfigFile=/path/to/mud-config.json
```

### Storage Backend

```bash
# Use SQLite backend
npm start -- --storageBackend=sqlite

# Use PostgreSQL backend (requires DATABASE_URL env var)
npm start -- --storageBackend=postgres

# Use auto mode (database with JSON fallback)
npm start -- --storageBackend=auto

# Provide database URL via CLI
npm start -- --databaseUrl="postgresql://user:pass@localhost:5432/ellymud"
```

### Security & Access

```bash
# Disable remote admin access
npm start -- --disableRemoteAdmin

# Force overwrite protections (dangerous, use with caution)
npm start -- --force
```

### Auto-Login & Testing

```bash
# Auto-login as admin
npm start -- --adminSession
# Or use the shorthand:
npm start -- -af

# Auto-login as specific user
npm start -- --forceSession=username
# Or use the shorthand:
npm start -- -u username

# Enable test mode (controllable game ticks)
npm start -- --testMode
```

### Combined Examples

**Development with custom ports:**
```bash
npm start -- --port=8024 --httpPort=8081 --adminSession
```

**Production with custom data directory:**
```bash
npm start -- --dataDir=/var/ellymud/data --storageBackend=postgres
```

**Testing with specific user:**
```bash
npm start -- --forceSession=testuser --testMode
```

---

## Configuration File

EllyMUD uses `data/mud-config.json` for game-specific settings that persist across restarts.

### Default Configuration

```json
{
  "gameName": "EllyMUD",
  "welcomeMessage": "Welcome to EllyMUD!",
  "motd": "Message of the Day",
  "maxPlayers": 100,
  "startingRoom": "town_square",
  "startingGold": 100,
  "startingHealth": 100,
  "startingMana": 50,
  "combatTickInterval": 6000,
  "regenerationTickInterval": 30000,
  "idleTimeout": 900000,
  "enablePvP": false
}
```

### Editing Configuration

**Option 1: Direct file edit**
```bash
# Edit the file directly
nano data/mud-config.json
```

**Option 2: Via API (admin only)**
```bash
# Update via REST API
curl -X PUT http://localhost:8080/api/config \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"maxPlayers": 200}'
```

**Option 3: Via admin console**
```
# From in-game admin console
/config set maxPlayers 200
```

### Configuration Options Explained

| Option | Description | Type | Default |
|--------|-------------|------|---------|
| `gameName` | Display name of your MUD | string | "EllyMUD" |
| `welcomeMessage` | Message shown on connection | string | "Welcome to EllyMUD!" |
| `motd` | Message of the day | string | "" |
| `maxPlayers` | Maximum concurrent players | number | 100 |
| `startingRoom` | Room ID where new players spawn | string | "town_square" |
| `startingGold` | Initial gold for new characters | number | 100 |
| `startingHealth` | Initial HP for new characters | number | 100 |
| `startingMana` | Initial mana for new characters | number | 50 |
| `combatTickInterval` | Milliseconds between combat turns | number | 6000 |
| `regenerationTickInterval` | Milliseconds between regen ticks | number | 30000 |
| `idleTimeout` | Milliseconds before auto-disconnect | number | 900000 |
| `enablePvP` | Allow player-vs-player combat | boolean | false |

---

## Best Practices

### Development Environment

1. **Use auto-generated secrets** - JWT_SECRET is auto-generated in development
2. **Use JSON storage** - Fast, no setup required
3. **Enable test mode** - For deterministic testing
4. **Use auto-login** - Skip login prompts during development

```bash
# Typical development setup
npm run dev
# No .env needed - defaults work great
```

### Staging Environment

1. **Use SQLite** - Good balance of performance and simplicity
2. **Set explicit JWT_SECRET** - Prevent session loss on restart
3. **Enable Redis** - Test session management
4. **Use production-like settings**

```bash
# .env
JWT_SECRET=staging-specific-secret-here
ELLYMUD_MCP_API_KEY=staging-mcp-key
STORAGE_BACKEND=sqlite
USE_REDIS=true
REDIS_URL=redis://localhost:6379
NODE_ENV=staging
```

### Production Environment

1. **Use PostgreSQL** - Scalable, reliable
2. **Use Redis** - Session state management
3. **Set strong secrets** - 32-byte random values
4. **Restrict admin access** - Consider DISABLE_REMOTE_ADMIN
5. **Monitor logs** - Enable proper logging
6. **Use environment variables** - Never commit secrets

```bash
# .env (never commit this file!)
JWT_SECRET=<openssl rand -base64 32>
ELLYMUD_MCP_API_KEY=<openssl rand -hex 32>
STORAGE_BACKEND=postgres
DATABASE_URL=postgresql://user:pass@db-host:5432/ellymud
USE_REDIS=true
REDIS_URL=redis://redis-host:6379
NODE_ENV=production
MAX_PASSWORD_ATTEMPTS=3
```

### Security Checklist

- [ ] JWT_SECRET is set to a strong random value
- [ ] ELLYMUD_MCP_API_KEY is set and unique
- [ ] DATABASE_URL does not use default credentials
- [ ] REDIS_URL is protected (password if exposed)
- [ ] `.env` is in `.gitignore` (already is)
- [ ] Secrets are rotated periodically
- [ ] DISABLE_REMOTE_ADMIN is considered for sensitive deployments
- [ ] NODE_ENV is set to `production`

---

## Related Documentation

- [Docker Deployment](docker.md) - Container-based configuration
- [Storage Backends](storage-backends.md) - Choosing and configuring storage
- [Troubleshooting](troubleshooting.md) - Configuration issues
- [Deployment Guide](deployment.md) - Production deployment

---

**Need help?** Open an [issue](https://github.com/ellyseum/ellymud/issues) or check the [troubleshooting guide](troubleshooting.md).
