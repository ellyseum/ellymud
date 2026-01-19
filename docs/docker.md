# Docker Deployment Guide

This guide covers deploying EllyMUD using Docker and Docker Compose for development, staging, and production environments.

## Table of Contents

- [Quick Start](#quick-start)
- [Environment Profiles](#environment-profiles)
- [Docker Commands Reference](#docker-commands-reference)
- [Production Best Practices](#production-best-practices)
- [Troubleshooting](#troubleshooting)

---

## Quick Start

### Prerequisites

- Docker Engine 20.10+ ([Install Docker](https://docs.docker.com/get-docker/))
- Docker Compose 2.0+ (included with Docker Desktop)
- 2GB+ available RAM
- 10GB+ available disk space

### Basic Deployment

```bash
# 1. Clone the repository
git clone https://github.com/ellyseum/ellymud.git
cd ellymud

# 2. Configure environment
cp .env.example .env
# Edit .env and set required variables:
# - ELLYMUD_MCP_API_KEY
# - JWT_SECRET

# 3. Start dev environment
npm run docker:dev
# Or: docker compose --profile dev up -d

# 4. View logs
npm run docker:logs

# 5. Access the game
# Web Client: http://localhost:8080
# Telnet: telnet localhost 8023
# MCP Server: http://localhost:3100
# Admin Dashboard: http://localhost:8080/admin
```

### Verify Deployment

```bash
# Check service status
npm run docker:ps

# Expected output:
# NAME                    STATUS
# ellymud-app-dev-1       Up
```

---

## Environment Profiles

EllyMUD uses Docker Compose profiles to manage different environments. Each profile is a complete, self-contained stack.

### Profile Summary

| Profile | Services | Storage | Sessions | Use Case |
|---------|----------|---------|----------|----------|
| `dev` | app only | JSON files | in-memory | Local development, fast iteration |
| `staging` | app + redis | SQLite | Redis | Integration testing, Kysely validation |
| `prod` | app + redis + postgres | PostgreSQL | Redis | Production, hardened |

### Dev Profile

Minimal setup for local development. No external dependencies.

```bash
# Start
npm run docker:dev
# Or: docker compose --profile dev up -d

# Stop
npm run docker:dev:down

# Clean (removes volumes)
npm run docker:dev:clean

# Rebuild
npm run docker:dev:rebuild
```

**Configuration:**
- Storage: JSON files (mounted from `./data`)
- Sessions: In-memory
- Logs: Mounted to `./logs`

**Override storage backend:**
```bash
STORAGE_BACKEND=sqlite docker compose --profile dev up -d
```

### Staging Profile

Integration testing environment with Redis and SQLite.

```bash
# Start
npm run docker:staging
# Or: docker compose --profile staging up -d

# Stop
npm run docker:staging:down

# Clean (removes volumes)
npm run docker:staging:clean

# Rebuild
npm run docker:staging:rebuild
```

**Configuration:**
- Storage: SQLite (validates Kysely abstraction layer)
- Sessions: Redis-backed
- Data: Mounted from `./data`

### Prod Profile

Full production stack with PostgreSQL and Redis.

```bash
# Start
npm run docker:prod
# Or: docker compose --profile prod up -d

# Stop
npm run docker:prod:down

# Clean (removes volumes - DESTRUCTIVE)
npm run docker:prod:clean

# Rebuild
npm run docker:prod:rebuild
```

**Configuration:**
- Storage: PostgreSQL (named volume)
- Sessions: Redis-backed (named volume)
- Logs: Mounted to `./logs`

### Service Details

#### App Service (EllyMUD)

| Port | Protocol | Purpose |
|------|----------|---------|
| 8023 | Telnet | Classic MUD client connections |
| 8080 | HTTP/WebSocket | Web client, API, admin dashboard |
| 3100 | HTTP | MCP server for AI integration |

#### Redis Service (staging, prod)

| Port | Protocol | Purpose |
|------|----------|---------|
| 6379 | Redis | Session state storage |

**Features:**
- Persistent storage (appendonly mode)
- Health checks (5s interval)
- Alpine-based (minimal footprint)
- Named volume for data persistence

#### PostgreSQL Service (prod only)

| Port | Protocol | Purpose |
|------|----------|---------|
| 5432 | PostgreSQL | Game data storage |

**Features:**
- PostgreSQL 16 Alpine
- Health checks
- Named volume for data persistence
- Default credentials: `ellymud:ellymud`

### Volume Mounts

| Profile | Volumes |
|---------|---------|
| dev | `./data:/app/data`, `./logs:/app/logs` |
| staging | `./data:/app/data`, `./logs:/app/logs`, `redis_data` (named) |
| prod | `./logs:/app/logs`, `redis_data` (named), `postgres_data` (named) |

---

## Docker Commands Reference

EllyMUD provides npm scripts and make targets for common Docker operations.

### By Profile

```bash
# Dev
npm run docker:dev              # Start
npm run docker:dev:down         # Stop
npm run docker:dev:clean        # Stop + remove volumes
npm run docker:dev:rebuild      # Rebuild + restart

# Staging
npm run docker:staging          # Start
npm run docker:staging:down     # Stop
npm run docker:staging:clean    # Stop + remove volumes
npm run docker:staging:rebuild  # Rebuild + restart

# Prod
npm run docker:prod             # Start
npm run docker:prod:down        # Stop
npm run docker:prod:clean       # Stop + remove volumes
npm run docker:prod:rebuild     # Rebuild + restart
```

### Shared Commands

```bash
# Build Docker image
npm run docker:build

# View service status
npm run docker:ps

# Follow logs (all services)
npm run docker:logs

# Access app container shell
npm run docker:shell
```

### Make Targets

```bash
make docker-dev          # Start dev
make docker-staging      # Start staging
make docker-prod         # Start prod
make docker-logs         # Follow logs
make docker-ps           # Service status
```

### Direct Docker Compose

```bash
# Follow logs (specific service)
docker compose logs -f app-dev
docker compose logs -f redis

# View last 100 lines
docker compose logs --tail=100 app-staging

# Access PostgreSQL (prod)
docker compose exec postgres psql -U ellymud -d ellymud

# Access Redis CLI
docker compose exec redis redis-cli
```

---

## Production Best Practices

### 1. Security Hardening

**Generate Strong Secrets:**
```bash
# Add to .env
echo "JWT_SECRET=$(openssl rand -base64 32)" >> .env
echo "ELLYMUD_MCP_API_KEY=$(openssl rand -hex 32)" >> .env
```

**Restrict Admin Access:**
```bash
# Disable remote admin if not needed
echo "DISABLE_REMOTE_ADMIN=true" >> .env
```

### 2. Resource Limits

Add resource constraints to prevent resource exhaustion:

```yaml
services:
  app-prod:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 512M
```

### 3. Backup Strategy

```bash
# Backup PostgreSQL
docker compose exec postgres pg_dump -U ellymud ellymud > backup-$(date +%Y%m%d).sql

# Backup Redis
docker compose exec redis redis-cli BGSAVE

# Backup volumes
docker run --rm -v ellymud_postgres_data:/data -v $(pwd):/backup \
  alpine tar czf /backup/postgres-$(date +%Y%m%d).tar.gz /data
```

### 4. Monitoring & Health Checks

**View Health Status:**
```bash
docker compose ps
# Look for "(healthy)" status
```

### 5. Logging Configuration

**Limit Log Size:**
```yaml
services:
  app-prod:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

### 6. Reverse Proxy Setup

**Nginx Example:**
```nginx
server {
    listen 80;
    server_name ellymud.example.com;

    # Web client & API
    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # MCP Server (optional, restrict access)
    location /mcp {
        proxy_pass http://localhost:3100;
        allow 10.0.0.0/8;  # Internal network only
        deny all;
    }
}
```

---

## Troubleshooting

### Services Won't Start

**Check logs:**
```bash
npm run docker:logs
```

**Common issues:**
- Port already in use: `lsof -i :8023` / `lsof -i :8080`
- Missing environment variables: Check `.env` file
- Docker daemon not running: `docker ps`

### Cannot Connect to Game

**Verify services are running:**
```bash
npm run docker:ps
# All services should show "Up"
```

**Test connectivity:**
```bash
# Test HTTP endpoint
curl http://localhost:8080/health

# Test MCP server
curl http://localhost:3100/health

# Test Telnet
telnet localhost 8023
```

### Redis Connection Failed

**Check Redis health:**
```bash
docker compose exec redis redis-cli ping
# Should return: PONG
```

### PostgreSQL Connection Failed

**Verify PostgreSQL is running:**
```bash
docker compose exec postgres pg_isready -U ellymud
# Should return: accepting connections
```

**Test connection:**
```bash
docker compose exec postgres psql -U ellymud -d ellymud -c "SELECT version();"
```

### Data Not Persisting

**Check volume mounts:**
```bash
docker compose config | grep volumes -A 5
```

**List volumes:**
```bash
docker volume ls | grep ellymud
```

### High Memory Usage

**Check resource usage:**
```bash
docker stats
```

---

## Related Documentation

- [Configuration Guide](configuration.md) - Environment variables
- [Storage Backends](storage-backends.md) - Database setup
- [Deployment Guide](deployment.md) - Alternative deployment methods

---

**Need help?** Open an [issue](https://github.com/ellyseum/ellymud/issues) or check the [troubleshooting guide](troubleshooting.md).
