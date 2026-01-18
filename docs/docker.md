# Docker Deployment Guide

This guide covers deploying EllyMUD using Docker and Docker Compose for development, staging, and production environments.

## Table of Contents

- [Quick Start](#quick-start)
- [Docker Compose Services](#docker-compose-services)
- [PostgreSQL Deployment](#postgresql-deployment)
- [Environment Configuration](#environment-configuration)
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

### Basic Deployment (JSON + Redis)

```bash
# 1. Clone the repository
git clone https://github.com/ellyseum/ellymud.git
cd ellymud

# 2. Configure environment
cp .env.example .env
# Edit .env and set required variables:
# - ELLYMUD_MCP_API_KEY
# - JWT_SECRET

# 3. Start all services
npm run docker:up
# Or: docker compose up -d

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
# NAME                COMMAND                  SERVICE   STATUS
# ellymud-app-1       "docker-entrypoint.s…"   app       Up
# ellymud-redis-1     "docker-entrypoint.s…"   redis     Up (healthy)
```

---

## Docker Compose Services

### Default Configuration (docker-compose.yml)

EllyMUD's default Docker Compose configuration includes two services:

```yaml
services:
  app:      # EllyMUD game server
  redis:    # Session state storage
```

### Service Details

#### App Service (EllyMUD)

| Port | Protocol | Purpose |
|------|----------|---------|
| 8023 | Telnet | Classic MUD client connections |
| 8080 | HTTP/WebSocket | Web client, API, admin dashboard |
| 3100 | HTTP | MCP server for AI integration |

**Default Configuration:**
- Storage: JSON files (mounted volume)
- Session: Redis-backed
- Logs: Mounted volume at `./logs`
- Data: Mounted volume at `./data`

#### Redis Service

| Port | Protocol | Purpose |
|------|----------|---------|
| 6379 | Redis | Session state storage |

**Features:**
- Persistent storage (appendonly mode)
- Health checks (5s interval)
- Alpine-based (minimal footprint)
- Named volume for data persistence

### Volume Mounts

```yaml
volumes:
  ./data:/app/data      # Game data (JSON files, SQLite DB)
  ./logs:/app/logs      # Server logs
  redis_data:           # Redis persistent storage (named volume)
```

---

## PostgreSQL Deployment

For production deployments requiring PostgreSQL, use the overlay configuration.

### Setup PostgreSQL

```bash
# 1. Configure environment for PostgreSQL
cat >> .env << EOF
STORAGE_BACKEND=postgres
DATABASE_URL=postgresql://ellymud:ellymud_secure_pass@postgres:5432/ellymud
EOF

# 2. Start with PostgreSQL
npm run docker:up:postgres
# Or: docker compose -f docker-compose.yml -f docker-compose.postgres.yml up -d

# 3. Check all services are healthy
npm run docker:ps
```

### PostgreSQL Service Details

The PostgreSQL service adds:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: ellymud
      POSTGRES_USER: ellymud
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-ellymud_pass}
    volumes:
      - postgres_data:/var/lib/postgresql/data
```

**Security Note:** Change `POSTGRES_PASSWORD` in production!

### Data Migration

When switching from JSON to PostgreSQL, EllyMUD automatically migrates data:

```bash
# EllyMUD detects backend change and migrates on startup
# Check logs to verify:
npm run docker:logs | grep -i migration

# Expected output:
# [Database] Migrating from JSON to PostgreSQL...
# [Database] Migration complete. 42 users, 156 rooms migrated.
```

---

## Environment Configuration

### Required Variables

Create a `.env` file with these required variables:

```bash
# Security (REQUIRED)
ELLYMUD_MCP_API_KEY=<openssl rand -hex 32>
JWT_SECRET=<openssl rand -base64 32>

# Storage Backend
STORAGE_BACKEND=json  # or: sqlite, postgres, auto

# Database (required if STORAGE_BACKEND=postgres)
DATABASE_URL=postgresql://user:password@postgres:5432/ellymud

# Session Management
USE_REDIS=true
REDIS_URL=redis://redis:6379

# Environment
NODE_ENV=production
```

### Docker-Specific Considerations

**Hostnames:**
- Use Docker service names as hostnames: `redis`, `postgres`
- Not `localhost` or `127.0.0.1`

**Networking:**
- All services are on the same Docker network
- Access from host: use `localhost`
- Access between containers: use service names

**Example:**
```bash
# ✅ Correct (from within app container)
REDIS_URL=redis://redis:6379
DATABASE_URL=postgresql://ellymud:pass@postgres:5432/ellymud

# ❌ Wrong (localhost doesn't work between containers)
REDIS_URL=redis://localhost:6379
DATABASE_URL=postgresql://ellymud:pass@localhost:5432/ellymud
```

### Optional Variables

```bash
# Security
DISABLE_REMOTE_ADMIN=false
MAX_PASSWORD_ATTEMPTS=3

# PostgreSQL (if using postgres service)
POSTGRES_PASSWORD=ellymud_secure_password_here
```

---

## Docker Commands Reference

EllyMUD provides npm scripts for common Docker operations:

### Basic Operations

```bash
# Build Docker image
npm run docker:build

# Start all services (detached)
npm run docker:up

# Stop all services
npm run docker:down

# Restart services
npm run docker:restart

# View service status
npm run docker:ps
```

### Logs & Debugging

```bash
# Follow logs (all services)
npm run docker:logs

# Follow logs (specific service)
docker compose logs -f app
docker compose logs -f redis

# View last 100 lines
docker compose logs --tail=100 app
```

### Interactive Access

```bash
# Access app container shell
npm run docker:shell
# Or: docker compose exec app /bin/sh

# Access PostgreSQL (if using postgres service)
docker compose exec postgres psql -U ellymud

# Access Redis CLI
docker compose exec redis redis-cli
```

### Maintenance

```bash
# Clean up (removes containers and volumes)
npm run docker:clean

# Full rebuild (down → build → up)
npm run docker:rebuild

# Remove unused Docker resources
docker system prune -a
```

### PostgreSQL-Specific

```bash
# Start with PostgreSQL
npm run docker:up:postgres

# Stop PostgreSQL deployment
npm run docker:down:postgres

# Access PostgreSQL shell
docker compose exec postgres psql -U ellymud -d ellymud
```

---

## Production Best Practices

### 1. Security Hardening

**Generate Strong Secrets:**
```bash
# Add to .env
echo "JWT_SECRET=$(openssl rand -base64 32)" >> .env
echo "ELLYMUD_MCP_API_KEY=$(openssl rand -hex 32)" >> .env
echo "POSTGRES_PASSWORD=$(openssl rand -base64 32)" >> .env
```

**Restrict Admin Access:**
```bash
# Disable remote admin if not needed
echo "DISABLE_REMOTE_ADMIN=true" >> .env
```

**Use Strong PostgreSQL Password:**
```bash
# Never use default passwords in production
POSTGRES_PASSWORD=<strong-unique-password>
```

### 2. Resource Limits

Add resource constraints to prevent resource exhaustion:

```yaml
services:
  app:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 512M
```

### 3. Persistent Storage

**Named Volumes (Recommended):**
```yaml
volumes:
  ellymud_data:
    driver: local
  ellymud_logs:
    driver: local
  postgres_data:
    driver: local
  redis_data:
    driver: local
```

**Backup Strategy:**
```bash
# Backup volumes
docker run --rm -v ellymud_data:/data -v $(pwd):/backup \
  alpine tar czf /backup/ellymud-data-$(date +%Y%m%d).tar.gz /data

# Backup PostgreSQL
docker compose exec postgres pg_dump -U ellymud ellymud > backup-$(date +%Y%m%d).sql
```

### 4. Monitoring & Health Checks

**View Health Status:**
```bash
docker compose ps
# Look for "(healthy)" status
```

**Custom Health Check for App:**
```yaml
services:
  app:
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

### 5. Logging Configuration

**Limit Log Size:**
```yaml
services:
  app:
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

### 7. Production Compose Override

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  app:
    restart: unless-stopped
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  redis:
    restart: unless-stopped
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}

  postgres:
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 4G
```

**Start with production config:**
```bash
docker compose -f docker-compose.yml -f docker-compose.postgres.yml -f docker-compose.prod.yml up -d
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

**Check connectivity from app:**
```bash
docker compose exec app sh
nc -zv redis 6379
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

**Check DATABASE_URL format:**
```bash
# Correct format:
postgresql://username:password@postgres:5432/database

# Common mistakes:
# - Using 'localhost' instead of 'postgres'
# - Missing password
# - Wrong port (5433 instead of 5432)
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

**Inspect volume:**
```bash
docker volume inspect ellymud_redis_data
```

### High Memory Usage

**Check resource usage:**
```bash
docker stats
```

**If needed, add limits:**
```yaml
services:
  app:
    deploy:
      resources:
        limits:
          memory: 2G
```

### Logs Too Large

**Check log size:**
```bash
docker compose exec app du -sh /app/logs
```

**Configure log rotation** (see [Logging Configuration](#5-logging-configuration))

---

## Related Documentation

- [Configuration Guide](configuration.md) - Environment variables
- [Storage Backends](storage-backends.md) - Database setup
- [Deployment Guide](deployment.md) - Alternative deployment methods
- [Troubleshooting](troubleshooting.md) - General troubleshooting

---

**Need help?** Open an [issue](https://github.com/ellyseum/ellymud/issues) or check the [troubleshooting guide](troubleshooting.md).
