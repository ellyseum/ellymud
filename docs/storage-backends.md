# Storage Backends Guide

EllyMUD supports multiple storage backends with automatic data migration, allowing you to choose the right persistence layer for your deployment scale and requirements.

## Table of Contents

- [Overview](#overview)
- [Backend Comparison](#backend-comparison)
- [JSON Files (Default)](#json-files-default)
- [SQLite](#sqlite)
- [PostgreSQL](#postgresql)
- [Auto Mode](#auto-mode)
- [Switching Backends](#switching-backends)
- [Data Migration](#data-migration)
- [Backup & Restore](#backup--restore)
- [Performance Considerations](#performance-considerations)

---

## Overview

EllyMUD uses a **repository pattern** for data persistence, providing a unified interface across all storage backends. This architecture allows seamless switching between backends with automatic data migration.

### Supported Backends

| Backend | Use Case | Setup Complexity | Performance | Scalability |
|---------|----------|------------------|-------------|-------------|
| **JSON** | Development, testing, single-player | None | Low | Low |
| **SQLite** | Small-medium deployments (<100 users) | Low | Medium | Medium |
| **PostgreSQL** | Production, high-scale (100+ users) | Medium | High | High |
| **Auto** | Development with DB features | Low | Medium | Medium |

### How to Choose

```
Development → JSON (zero-config, fast iteration)
            ↓
Staging    → SQLite (test DB features, single file)
            ↓
Production → PostgreSQL (scalable, battle-tested)
```

---

## Backend Comparison

### JSON Files (Default)

**Pros:**
- ✅ Zero configuration required
- ✅ Human-readable data (easy debugging)
- ✅ Git-friendly (track changes)
- ✅ Fast startup
- ✅ No dependencies

**Cons:**
- ❌ Not transactional
- ❌ Poor concurrent write performance
- ❌ Full file rewrite on changes
- ❌ No query optimization
- ❌ Limited to single server

**Best for:** Development, testing, small personal servers

### SQLite

**Pros:**
- ✅ Single file database
- ✅ ACID transactions
- ✅ Fast queries
- ✅ Zero configuration
- ✅ Embedded (no separate server)
- ✅ Battle-tested reliability

**Cons:**
- ❌ Limited concurrent writes
- ❌ Single server only
- ❌ No network access
- ❌ File-based limitations

**Best for:** Single-server deployments, staging environments, 10-100 concurrent users

### PostgreSQL

**Pros:**
- ✅ Excellent concurrent performance
- ✅ ACID transactions
- ✅ Advanced indexing
- ✅ Network-accessible
- ✅ Horizontal scaling (read replicas)
- ✅ Enterprise-grade reliability
- ✅ Comprehensive tooling

**Cons:**
- ❌ Requires separate PostgreSQL server
- ❌ More complex setup
- ❌ Additional resource overhead
- ❌ Requires DATABASE_URL configuration

**Best for:** Production deployments, multi-server setups, 100+ concurrent users

### Auto Mode

**Pros:**
- ✅ Database features with JSON fallback
- ✅ Graceful degradation
- ✅ Good for development

**Cons:**
- ❌ Fallback behavior may be confusing
- ❌ Not recommended for production

**Best for:** Development when you want to test DB features without strict requirements

---

## JSON Files (Default)

### Configuration

No configuration needed! JSON is the default backend.

```bash
# Explicitly set (optional)
STORAGE_BACKEND=json
```

### File Structure

Data is stored in `data/` directory:

```
data/
├── users.json              # Player accounts, stats, inventory
├── rooms.json              # Room templates
├── room_state.json         # Runtime state (items, NPCs, currency)
├── items.json              # Item templates
├── itemInstances.json      # Specific item instances
├── npcs.json               # NPC definitions
├── areas.json              # Area groupings
├── abilities.json          # Spell & ability definitions
├── admin.json              # Admin credentials
├── bug-reports.json        # Player bug reports
├── snake-scores.json       # Minigame high scores
├── merchant-state.json     # Merchant inventory
├── mud-config.json         # Game configuration
├── gametimer-config.json   # Timer settings
└── .backend-state          # Current backend tracker
```

### Viewing Data

```bash
# Pretty-print user data
cat data/users.json | jq '.'

# Count total users
cat data/users.json | jq 'length'

# Find specific user
cat data/users.json | jq '.[] | select(.username == "player1")'
```

### Manual Editing

JSON files can be edited directly (server must be stopped):

```bash
# 1. Stop server
npm stop

# 2. Edit file
nano data/users.json

# 3. Validate JSON
cat data/users.json | jq '.' > /dev/null && echo "Valid JSON"

# 4. Restart server
npm start
```

---

## SQLite

### Configuration

```bash
# Set in .env or environment
STORAGE_BACKEND=sqlite

# Start server
npm start
```

### Database Location

SQLite stores all data in a single file:

```
data/game.db
```

### First-Time Setup

EllyMUD automatically creates tables on first run:

```bash
# Set backend
echo "STORAGE_BACKEND=sqlite" >> .env

# Start server (auto-creates tables)
npm start

# Check logs for confirmation
# Expected output:
# [Database] Using SQLite dialect: /path/to/data/game.db
# [Database] Initialized tables
```

### Migrating from JSON

Automatic migration happens on first start:

```bash
# If you have existing JSON data
# 1. Ensure data/ folder contains JSON files
# 2. Switch to SQLite
echo "STORAGE_BACKEND=sqlite" >> .env

# 3. Start server (migration runs automatically)
npm start

# Check logs:
# [Database] Migrating from JSON to SQLite...
# [Database] Migration complete. 42 users, 156 rooms migrated.
```

### SQLite Tools

**View database schema:**
```bash
sqlite3 data/game.db .schema
```

**Query data:**
```bash
sqlite3 data/game.db "SELECT username, level, gold FROM users;"
```

**Interactive shell:**
```bash
sqlite3 data/game.db
> SELECT COUNT(*) FROM users;
> .tables
> .quit
```

### Backup SQLite

```bash
# Simple file copy (server stopped)
cp data/game.db data/game-backup-$(date +%Y%m%d).db

# Online backup (server running)
sqlite3 data/game.db ".backup data/game-backup-$(date +%Y%m%d).db"
```

---

## PostgreSQL

### Prerequisites

- PostgreSQL 12+ server
- Database created
- User with permissions

### Setup PostgreSQL Server

**Option 1: Docker (Recommended)**
```bash
# Start PostgreSQL via Docker Compose
npm run docker:up:postgres
```

**Option 2: Local Install**
```bash
# Ubuntu/Debian
sudo apt-get install postgresql

# macOS (Homebrew)
brew install postgresql
brew services start postgresql

# Create database and user
sudo -u postgres psql
CREATE DATABASE ellymud;
CREATE USER ellymud WITH PASSWORD 'secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE ellymud TO ellymud;
\q
```

**Option 3: Cloud PostgreSQL**
- AWS RDS
- Google Cloud SQL
- Azure Database
- DigitalOcean Managed Databases
- Heroku Postgres

### Configuration

```bash
# Set in .env
STORAGE_BACKEND=postgres
DATABASE_URL=postgresql://username:password@host:port/database

# Example (local)
DATABASE_URL=postgresql://ellymud:secure_pass@localhost:5432/ellymud

# Example (Docker)
DATABASE_URL=postgresql://ellymud:ellymud_pass@postgres:5432/ellymud

# Example (cloud)
DATABASE_URL=postgresql://user:pass@db.example.com:5432/ellymud
```

### Connection String Format

```
postgresql://[user]:[password]@[host]:[port]/[database]?[options]

Components:
- user: Database username
- password: Database password (URL-encode special characters)
- host: Server hostname or IP
- port: Usually 5432
- database: Database name
- options: Optional query parameters (e.g., sslmode=require)
```

### First-Time Setup

```bash
# 1. Configure environment
cat >> .env << EOF
STORAGE_BACKEND=postgres
DATABASE_URL=postgresql://ellymud:secure_pass@localhost:5432/ellymud
EOF

# 2. Start server (auto-creates tables)
npm start

# Expected logs:
# [Database] Using PostgreSQL dialect
# [Database] Connected to PostgreSQL
# [Database] Initialized tables
```

### Migrating from JSON/SQLite

```bash
# Automatic migration on first PostgreSQL start
# 1. Ensure existing data exists in JSON/SQLite
# 2. Switch to PostgreSQL
echo "STORAGE_BACKEND=postgres" >> .env
echo "DATABASE_URL=postgresql://..." >> .env

# 3. Start server (migration runs automatically)
npm start

# Check logs:
# [Database] Migrating from JSON to PostgreSQL...
# [Database] Migration complete. 42 users, 156 rooms migrated.
```

### PostgreSQL Tools

**psql (CLI):**
```bash
# Connect
psql postgresql://ellymud:password@localhost:5432/ellymud

# List tables
\dt

# Describe table
\d users

# Query data
SELECT username, level FROM users;

# Quit
\q
```

**GUI Tools:**
- pgAdmin 4
- DBeaver
- TablePlus
- Postico (macOS)

### Backup PostgreSQL

```bash
# Dump to SQL file
pg_dump -U ellymud ellymud > backup-$(date +%Y%m%d).sql

# Restore from SQL file
psql -U ellymud ellymud < backup-20260117.sql

# Compressed backup
pg_dump -U ellymud ellymud | gzip > backup-$(date +%Y%m%d).sql.gz
```

---

## Auto Mode

Auto mode attempts to use the database (SQLite), with fallback to JSON if database connection fails.

### Configuration

```bash
STORAGE_BACKEND=auto
```

### Behavior

1. **On startup:**
   - Tries to connect to SQLite
   - If successful: uses SQLite
   - If fails: falls back to JSON

2. **Use cases:**
   - Development with optional DB features
   - Testing database code without strict requirements

**⚠️ Not recommended for production** - fallback behavior may mask configuration issues.

---

## Switching Backends

### Using Environment Variables

```bash
# Stop server
npm stop

# Change backend
echo "STORAGE_BACKEND=sqlite" >> .env

# Start server (migration happens automatically)
npm start
```

### Using Data Migration Script

```bash
# Check current backend status
npm run data:status

# Switch to SQLite
npm run data:switch -- --to=sqlite

# Switch to PostgreSQL (requires DATABASE_URL)
npm run data:switch -- --to=postgres

# Switch back to JSON
npm run data:switch -- --to=json
```

---

## Data Migration

### Automatic Migration

EllyMUD automatically detects backend changes and migrates data on startup.

**Tracked in:** `data/.backend-state`

```json
{
  "current": "postgres",
  "previous": "json",
  "migratedAt": "2026-01-17T12:34:56.789Z"
}
```

### Migration Process

1. **Detection:**
   - Compare `STORAGE_BACKEND` env var with `data/.backend-state`
   - If different, migration is needed

2. **Export:**
   - Export all data from current backend to JSON format
   - 14 entity types exported

3. **Import:**
   - Import JSON data to new backend
   - Validate data integrity

4. **Update State:**
   - Update `data/.backend-state` with new backend

### Manual Migration

```bash
# Export current data to JSON
npm run data:export

# Import from JSON to current backend
npm run data:import
```

### Migration Logs

```bash
# Watch migration progress
tail -f logs/system.log | grep -i migration
```

### Supported Migration Paths

All combinations are supported:

```
JSON ⟷ SQLite
JSON ⟷ PostgreSQL
SQLite ⟷ PostgreSQL
```

---

## Backup & Restore

### JSON Backup

```bash
# Backup entire data directory
tar czf backup-$(date +%Y%m%d).tar.gz data/

# Restore
tar xzf backup-20260117.tar.gz
```

### SQLite Backup

```bash
# Create backup
npm run data:backup

# Or manually
cp data/game.db data/game-backup-$(date +%Y%m%d).db
```

### PostgreSQL Backup

```bash
# Full database dump
pg_dump -U ellymud ellymud > backup-$(date +%Y%m%d).sql

# Restore
psql -U ellymud ellymud < backup-20260117.sql
```

### Cross-Backend Backup

```bash
# Export to JSON (works for all backends)
npm run data:export
# Creates: data/export-YYYYMMDD-HHMMSS/

# Restore from JSON export
npm run data:import -- --from=data/export-20260117-123456/
```

---

## Performance Considerations

### Benchmarks (Approximate)

| Operation | JSON | SQLite | PostgreSQL |
|-----------|------|--------|------------|
| Read user | 5ms | 1ms | 2ms |
| Write user | 50ms | 2ms | 3ms |
| Query 100 users | 100ms | 5ms | 10ms |
| Concurrent writes (10/s) | Poor | Good | Excellent |
| Startup time | 100ms | 200ms | 300ms |

### Optimization Tips

**JSON:**
- Keep files small (<1MB each)
- Avoid frequent writes
- Use for read-heavy workloads

**SQLite:**
- Enable WAL mode (default in EllyMUD)
- Regular VACUUM operations
- Consider memory-mapped I/O for large datasets

**PostgreSQL:**
- Use connection pooling (default: 10 connections)
- Add indexes for frequently queried columns
- Enable query logging for slow queries
- Consider read replicas for scaling

### Scaling Recommendations

| Concurrent Users | Recommended Backend | Notes |
|-----------------|---------------------|-------|
| 1-10 | JSON | Fine for personal/dev |
| 10-50 | SQLite | Good performance |
| 50-100 | SQLite or PostgreSQL | SQLite may start showing limits |
| 100-500 | PostgreSQL | Clear winner |
| 500+ | PostgreSQL + replicas | Horizontal scaling |

---

## Related Documentation

- [Configuration Guide](configuration.md) - Environment setup
- [Docker Guide](docker.md) - PostgreSQL via Docker
- [Deployment Guide](deployment.md) - Production deployment
- [Performance Guide](performance.md) - Optimization strategies

---

**Need help?** Open an [issue](https://github.com/ellyseum/ellymud/issues) or check the [troubleshooting guide](troubleshooting.md).
