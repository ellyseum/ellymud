# Troubleshooting Guide

Common issues and solutions for EllyMUD deployment, configuration, and operation.

## Table of Contents

- [Installation Issues](#installation-issues)
- [Server Won't Start](#server-wont-start)
- [Connection Problems](#connection-problems)
- [Database Issues](#database-issues)
- [Redis Issues](#redis-issues)
- [Docker Problems](#docker-problems)
- [Performance Issues](#performance-issues)
- [Build & Compilation Errors](#build--compilation-errors)
- [MCP Server Issues](#mcp-server-issues)
- [Session & Authentication](#session--authentication)
- [Getting Help](#getting-help)

---

## Installation Issues

### npm install fails

**Error:** `EACCES: permission denied`

**Solution:**
```bash
# Fix npm permissions
sudo chown -R $(whoami) ~/.npm
npm cache clean --force
npm install
```

**Error:** `node-gyp rebuild failed`

**Solution:**
```bash
# Install build tools
# Ubuntu/Debian
sudo apt-get install build-essential python3

# macOS
xcode-select --install

# Then retry
npm install
```

### Bootstrap script fails

**Error:** `Permission denied: ./scripts/bootstrap.sh`

**Solution:**
```bash
# Make script executable
chmod +x scripts/bootstrap.sh
npm run bootstrap
```

### Missing dependencies

**Error:** `Cannot find module 'xyz'`

**Solution:**
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# If still failing, check Node version
node --version  # Should be 20.19+
```

---

## Server Won't Start

### Port already in use

**Error:** `EADDRINUSE: address already in use :::8023`

**Solution:**
```bash
# Find process using the port
lsof -i :8023  # Telnet
lsof -i :8080  # WebSocket/HTTP
lsof -i :3100  # MCP Server

# Kill specific port
lsof -i :8023 -t | xargs kill

# Or kill all EllyMUD processes safely
lsof -i :8023 -t | xargs kill
lsof -i :8080 -t | xargs kill
lsof -i :3100 -t | xargs kill
```

**⚠️ Never do this:**
```bash
# DON'T - This kills VS Code and all Node apps!
pkill node
killall node
```

### JWT_SECRET required error

**Error:** `JWT_SECRET environment variable is required in production`

**Solution:**
```bash
# Add to .env file
echo "JWT_SECRET=$(openssl rand -base64 32)" >> .env

# Or set in environment
export JWT_SECRET="your-secure-random-string"
npm start
```

### Cannot find data directory

**Error:** `ENOENT: no such file or directory, open 'data/users.json'`

**Solution:**
```bash
# Create data directory
mkdir -p data

# Or run bootstrap
npm run bootstrap
```

### TypeScript compilation errors on start

**Error:** `error TS2304: Cannot find name 'xyz'`

**Solution:**
```bash
# Rebuild TypeScript
npm run clean
npm run build
npm start
```

---

## Connection Problems

### Cannot connect via web browser

**Issue:** `http://localhost:8080` doesn't load

**Checklist:**
```bash
# 1. Verify server is running
npm run docker:ps  # Docker
# Or check logs
tail -f logs/system.log

# 2. Verify correct port
curl http://localhost:8080/health
# Should return: {"status":"ok"}

# 3. Check firewall
# Ubuntu
sudo ufw status
sudo ufw allow 8080

# macOS
# System Preferences → Security & Privacy → Firewall

# 4. Try different browser
# Clear cache, try incognito mode
```

### Cannot connect via Telnet

**Issue:** `telnet localhost 8023` fails

**Solutions:**
```bash
# 1. Verify Telnet server is running
lsof -i :8023
# Should show node process

# 2. Test with netcat
nc -v localhost 8023

# 3. Install Telnet client (if missing)
# Ubuntu/Debian
sudo apt-get install telnet

# macOS (use nc instead)
nc localhost 8023

# 4. Try PuTTY (Windows) or MUD client
# ZMud, TinTin++, MUSHclient, etc.
```

### Connection drops immediately

**Issue:** Client connects then disconnects

**Check logs:**
```bash
tail -f logs/system.log | grep -i "disconnect\|error"
```

**Common causes:**
- Idle timeout (default: 15 minutes)
- Network issues
- Client incompatibility
- Server crash (check logs)

**Solution:**
```bash
# Increase idle timeout
# Edit data/mud-config.json
{
  "idleTimeout": 1800000  # 30 minutes (in milliseconds)
}
```

### WebSocket connection fails

**Error:** `WebSocket connection to 'ws://localhost:8080' failed`

**Solutions:**
```bash
# 1. Check WebSocket server is running
grep -i "websocket" logs/system.log

# 2. Verify Socket.IO is working
curl http://localhost:8080/socket.io/
# Should return Socket.IO response

# 3. Check for reverse proxy issues
# Nginx: ensure WebSocket upgrade headers
# Apache: enable mod_proxy_wstunnel
```

---

## Database Issues

### SQLite database locked

**Error:** `SQLITE_BUSY: database is locked`

**Solutions:**
```bash
# 1. Ensure only one EllyMUD instance is running
ps aux | grep node

# 2. Check file permissions
ls -la data/game.db
chmod 644 data/game.db

# 3. Close any SQLite viewers/tools

# 4. If persistent, remove lock file
rm data/game.db-journal
```

### PostgreSQL connection refused

**Error:** `connect ECONNREFUSED 127.0.0.1:5432`

**Solutions:**
```bash
# 1. Verify PostgreSQL is running
sudo systemctl status postgresql  # Linux
brew services list | grep postgres  # macOS

# 2. Start PostgreSQL
sudo systemctl start postgresql  # Linux
brew services start postgresql  # macOS

# 3. Verify PostgreSQL is listening
sudo netstat -tlnp | grep 5432

# 4. Check DATABASE_URL
echo $DATABASE_URL
# Format: postgresql://user:pass@host:port/database

# 5. Test connection
psql -U ellymud -d ellymud -h localhost
```

### PostgreSQL authentication failed

**Error:** `password authentication failed for user "ellymud"`

**Solutions:**
```bash
# 1. Verify credentials
psql -U ellymud -d ellymud
# Enter password manually

# 2. Reset password
sudo -u postgres psql
ALTER USER ellymud WITH PASSWORD 'new_secure_password';
\q

# 3. Update DATABASE_URL in .env
DATABASE_URL=postgresql://ellymud:new_secure_password@localhost:5432/ellymud

# 4. Check pg_hba.conf (PostgreSQL config)
# Should allow md5 or password authentication
```

### Database migration failed

**Error:** `Migration failed: ...`

**Solutions:**
```bash
# 1. Check logs
tail -f logs/system.log | grep -i migration

# 2. Backup current data
npm run data:backup

# 3. Try manual migration
npm run data:export
npm run data:import

# 4. Verify source data integrity
cat data/users.json | jq '.'  # Should be valid JSON

# 5. Reset backend state
rm data/.backend-state
# Server will detect as fresh migration on next start
```

---

## Redis Issues

### Redis connection timeout

**Error:** `Error: connect ETIMEDOUT`

**Solutions:**
```bash
# 1. Verify Redis is running
redis-cli ping
# Should return: PONG

# 2. Start Redis
# Docker
docker compose up -d redis

# Ubuntu/Debian
sudo systemctl start redis

# macOS
brew services start redis

# 3. Check REDIS_URL
echo $REDIS_URL
# Should be: redis://host:port

# 4. Test connectivity
redis-cli -h localhost -p 6379 ping
```

### Redis authentication required

**Error:** `NOAUTH Authentication required`

**Solution:**
```bash
# Update REDIS_URL with password
REDIS_URL=redis://:password@localhost:6379

# Or in Docker Compose, set REDIS_PASSWORD
```

### Redis out of memory

**Error:** `OOM command not allowed when used memory > 'maxmemory'`

**Solutions:**
```bash
# 1. Check Redis memory usage
redis-cli INFO memory

# 2. Increase maxmemory
redis-cli CONFIG SET maxmemory 256mb

# 3. Enable eviction policy
redis-cli CONFIG SET maxmemory-policy allkeys-lru

# 4. Or disable Redis temporarily
echo "USE_REDIS=false" >> .env
```

---

## Docker Problems

### Docker daemon not running

**Error:** `Cannot connect to the Docker daemon`

**Solutions:**
```bash
# Start Docker Desktop (macOS/Windows)
# Or start Docker service (Linux)
sudo systemctl start docker

# Verify
docker ps
```

### Docker Compose service won't start

**Issue:** Services stuck in "starting" state

**Solutions:**
```bash
# 1. Check logs
npm run docker:logs

# 2. Check service health
docker compose ps

# 3. Restart services
npm run docker:restart

# 4. Full rebuild
npm run docker:clean
npm run docker:rebuild
```

### Docker volume permission denied

**Error:** `EACCES: permission denied` in Docker logs

**Solutions:**
```bash
# 1. Check volume permissions
ls -la data/

# 2. Fix ownership (if needed)
sudo chown -R 1000:1000 data/ logs/

# 3. Or update docker-compose.yml user directive
user: "$(id -u):$(id -g)"
```

### Docker image build fails

**Error:** Build fails during `npm install`

**Solutions:**
```bash
# 1. Clean Docker cache
docker builder prune -a

# 2. Rebuild without cache
docker compose build --no-cache

# 3. Check Dockerfile for syntax errors
docker compose config
```

---

## Performance Issues

### High CPU usage

**Diagnosis:**
```bash
# Check process stats
top -p $(pgrep -f "node.*ellymud")

# Check Node.js profiling
node --prof dist/server.js
```

**Common causes:**
- Too many NPCs active
- Combat processing loops
- Inefficient queries
- Memory leak

**Solutions:**
```bash
# 1. Reduce NPC count temporarily
# 2. Check logs for infinite loops
tail -f logs/system.log | grep -i "error\|warning"

# 3. Restart server
npm restart
```

### High memory usage

**Diagnosis:**
```bash
# Check memory usage
ps aux | grep node

# Docker stats
docker stats
```

**Solutions:**
```bash
# 1. Check for memory leaks
# Monitor memory over time

# 2. Restart server periodically
# Add to cron for automatic restarts

# 3. Increase available memory
# Docker: Update deploy.resources.limits.memory

# 4. Enable garbage collection logging
node --max-old-space-size=2048 dist/server.js
```

### Slow database queries

**PostgreSQL:**
```bash
# Enable query logging
# Edit postgresql.conf:
log_statement = 'all'
log_duration = on

# Restart PostgreSQL
sudo systemctl restart postgresql

# Check logs
tail -f /var/log/postgresql/postgresql-*.log
```

**SQLite:**
```bash
# Check query performance
sqlite3 data/game.db
.timer ON
SELECT * FROM users;
```

**Solutions:**
- Add indexes to frequently queried columns
- Optimize query structure
- Consider PostgreSQL for better query optimization
- Use connection pooling

---

## Build & Compilation Errors

### TypeScript errors

**Error:** `error TS2xxx: ...`

**Solutions:**
```bash
# 1. Type check without building
npm run typecheck

# 2. Clean build
npm run clean
npm run build

# 3. Update TypeScript
npm install -D typescript@latest

# 4. Check tsconfig.json is valid
cat tsconfig.json | jq '.'
```

### ESLint errors blocking build

**Error:** `ESLint found X errors`

**Solutions:**
```bash
# 1. Auto-fix errors
npm run lint-fix

# 2. Disable for specific lines (temporary)
// eslint-disable-next-line @typescript-eslint/no-explicit-any

# 3. Run build without lint (not recommended)
npm run build:server
```

### Frontend build fails

**Error:** Vite build errors

**Solutions:**
```bash
# 1. Clear Vite cache
rm -rf node_modules/.vite

# 2. Rebuild
npm run build:frontend

# 3. Check for React/TypeScript errors
cd admin-ui
npm run build
```

---

## MCP Server Issues

### MCP server won't start

**Error:** `MCP Server failed to start`

**Solutions:**
```bash
# 1. Check API key is set
echo $ELLYMUD_MCP_API_KEY
# Should be 64-character hex string

# 2. Generate API key if missing
openssl rand -hex 32

# 3. Add to .env
echo "ELLYMUD_MCP_API_KEY=<generated-key>" >> .env

# 4. Verify port 3100 is available
lsof -i :3100
```

### MCP authentication fails

**Error:** `401 Unauthorized`

**Solutions:**
```bash
# 1. Verify API key matches
# Server: cat .env | grep ELLYMUD_MCP_API_KEY
# Client: check MCP client configuration

# 2. Test with curl
curl -H "Authorization: Bearer YOUR_API_KEY" \
  http://localhost:3100/health

# Should return: {"status":"healthy"}
```

### Virtual session fails

**Error:** Virtual session creation fails

**Solutions:**
```bash
# 1. Check test mode is enabled (for deterministic testing)
npm start -- --testMode

# 2. Check logs
tail -f logs/system.log | grep -i "virtual\|session"

# 3. Verify MCP server is running
curl http://localhost:3100/health
```

---

## Session & Authentication

### Cannot login as admin

**Issue:** Admin password not accepted

**Solutions:**
```bash
# 1. Reset admin password
npm run setup:admin

# 2. Check admin.json exists
cat data/admin.json

# 3. Force admin session (bypass login)
npm run start-admin
```

### Session expires immediately

**Issue:** JWT token expires right away

**Solutions:**
```bash
# 1. Check system time is correct
date

# 2. Check JWT_SECRET is consistent
echo $JWT_SECRET

# 3. Clear browser cookies/localStorage
# Browser DevTools → Application → Clear storage
```

### Rate limiting blocks login

**Error:** `Too many requests, please try again later`

**Solutions:**
```bash
# 1. Wait 15 minutes
# 2. Restart server to reset limits
npm restart

# 3. Adjust rate limit in code (development only)
# Edit src/server/apiServer.ts
```

---

## Getting Help

### Before asking for help

1. **Check logs:**
   ```bash
   tail -f logs/system.log
   tail -f logs/error.log
   ```

2. **Verify environment:**
   ```bash
   node --version  # Should be 20.19+
   npm --version
   cat .env
   ```

3. **Check GitHub issues:**
   - [Open issues](https://github.com/ellyseum/ellymud/issues)
   - [Closed issues](https://github.com/ellyseum/ellymud/issues?q=is%3Aissue+is%3Aclosed)

4. **Search documentation:**
   - [Configuration](configuration.md)
   - [Docker Guide](docker.md)
   - [Storage Backends](storage-backends.md)

### Reporting issues

When opening an issue, include:

```markdown
**Environment:**
- OS: Ubuntu 22.04 / macOS 14 / Windows 11
- Node.js version: 20.19.0
- EllyMUD version: 1.1.0
- Deployment: Local / Docker / Cloud

**Configuration:**
- Storage backend: json / sqlite / postgres
- Using Redis: yes / no
- Docker: yes / no

**Steps to reproduce:**
1. Start server with...
2. Connect to...
3. Execute command...
4. See error...

**Expected behavior:**
What should happen

**Actual behavior:**
What actually happens

**Logs:**
```
[Paste relevant logs here]
```

**Additional context:**
Any other relevant information
```

### Community resources

- **GitHub Issues:** [github.com/ellyseum/ellymud/issues](https://github.com/ellyseum/ellymud/issues)
- **GitHub Discussions:** [github.com/ellyseum/ellymud/discussions](https://github.com/ellyseum/ellymud/discussions)
- **Documentation:** [docs/](.)

---

## Related Documentation

- [Configuration Guide](configuration.md) - Environment setup
- [Docker Guide](docker.md) - Container deployment
- [Storage Backends](storage-backends.md) - Database configuration
- [Deployment Guide](deployment.md) - Production deployment

---

**Still stuck?** Open an [issue](https://github.com/ellyseum/ellymud/issues/new) with details about your problem.
