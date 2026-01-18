# Performance & Scaling Guide

Optimization strategies and scaling recommendations for EllyMUD deployments.

## Table of Contents

- [Performance Overview](#performance-overview)
- [Backend Selection](#backend-selection)
- [Database Optimization](#database-optimization)
- [Caching Strategies](#caching-strategies)
- [Resource Management](#resource-management)
- [Horizontal Scaling](#horizontal-scaling)
- [Monitoring](#monitoring)
- [Benchmarks](#benchmarks)

---

## Performance Overview

EllyMUD is designed to scale from small personal servers to multi-server production deployments.

### Performance Characteristics

| Metric | Small | Medium | Large |
|--------|-------|--------|-------|
| **Concurrent Users** | 1-10 | 10-100 | 100-1000+ |
| **Backend** | JSON | SQLite | PostgreSQL |
| **Memory** | 256 MB | 512 MB - 2 GB | 2 GB - 8 GB |
| **CPU** | 1 core | 1-2 cores | 2-4+ cores |
| **Response Time** | <50ms | <100ms | <200ms |

### Bottlenecks by Scale

**Small Deployments (1-10 users):**
- No significant bottlenecks
- JSON file I/O is adequate

**Medium Deployments (10-100 users):**
- Concurrent writes to JSON files
- Combat processing for many simultaneous battles
- Room state updates

**Large Deployments (100+ users):**
- Database connection limits
- Network I/O
- Combat system CPU usage
- Memory for session management

---

## Backend Selection

### JSON Files

**When to use:**
- Development
- Single-player or small groups (<10 users)
- Testing and debugging

**Performance:**
- Read: ~5-10ms per operation
- Write: ~50-100ms (full file rewrite)
- Concurrent writes: Poor (file locking)

**Optimization:**
```bash
# Keep files small
# Split large datasets if needed
# Use read-only mode for static data
```

### SQLite

**When to use:**
- Small to medium deployments (10-100 users)
- Single-server setups
- Staging environments

**Performance:**
- Read: ~1-2ms per query
- Write: ~2-5ms per transaction
- Concurrent reads: Excellent
- Concurrent writes: Good (WAL mode)

**Optimization:**
```sql
-- Enable Write-Ahead Logging (default in EllyMUD)
PRAGMA journal_mode=WAL;

-- Synchronous mode (balance safety/performance)
PRAGMA synchronous=NORMAL;

-- Increase cache size
PRAGMA cache_size=10000;  -- 10000 pages (~40MB)

-- Memory-mapped I/O
PRAGMA mmap_size=268435456;  -- 256MB
```

**Maintenance:**
```bash
# Periodic VACUUM (reduces file size)
sqlite3 data/game.db "VACUUM;"

# Analyze query performance
sqlite3 data/game.db "ANALYZE;"
```

### PostgreSQL

**When to use:**
- Production deployments (100+ users)
- Multi-server setups
- High-concurrency scenarios

**Performance:**
- Read: ~2-5ms per query (local network)
- Write: ~3-10ms per transaction
- Concurrent operations: Excellent
- Scaling: Horizontal (read replicas)

**Optimization:**
```sql
-- Create indexes for frequently queried columns
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_rooms_id ON rooms(id);
CREATE INDEX idx_items_id ON items(id);

-- Connection pooling (configured in EllyMUD)
-- Default: 10 connections

-- Query performance analysis
EXPLAIN ANALYZE SELECT * FROM users WHERE username = 'player1';
```

**Connection Pooling:**

EllyMUD uses connection pooling by default (max: 10 connections).

Adjust in `src/data/db.ts`:
```typescript
new PostgresDialect({
  pool: new Pool({
    connectionString: DATABASE_URL,
    max: 20,  // Increase for high concurrency
  }),
})
```

---

## Database Optimization

### Indexing Strategy

**Auto-created indexes:**
```sql
-- Primary keys (automatic)
users(username)
rooms(id)
items(id)
npcs(id)

-- Frequently queried
CREATE INDEX idx_users_current_room ON users(current_room);
CREATE INDEX idx_room_state_room_id ON room_state(room_id);
```

**Add custom indexes:**
```sql
-- For leaderboard queries
CREATE INDEX idx_users_level_desc ON users(level DESC);

-- For item lookups
CREATE INDEX idx_item_instances_room ON item_instances(current_room);
```

### Query Optimization

**Bad:**
```sql
-- Full table scan
SELECT * FROM users;
```

**Good:**
```sql
-- Indexed lookup
SELECT * FROM users WHERE username = 'player1';

-- Limit results
SELECT username, level FROM users ORDER BY level DESC LIMIT 10;
```

### Database Maintenance

**PostgreSQL:**
```sql
-- Vacuum (reclaim space)
VACUUM ANALYZE;

-- Reindex (rebuild indexes)
REINDEX DATABASE ellymud;

-- Check table size
SELECT
  relname AS table_name,
  pg_size_pretty(pg_total_relation_size(relid)) AS total_size
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC;
```

**SQLite:**
```sql
-- Vacuum
VACUUM;

-- Analyze query planner
ANALYZE;
```

---

## Caching Strategies

### Redis Session Caching

**Enable Redis:**
```bash
# .env
USE_REDIS=true
REDIS_URL=redis://localhost:6379
```

**Benefits:**
- Fast session lookups (~1ms vs 10-50ms)
- Reduced database load
- Shared session state (multi-server)

**Configuration:**
```typescript
// Redis client configuration (src/data/redis.ts)
{
  retryStrategy: (times) => Math.min(times * 50, 2000),
  maxRetriesPerRequest: 3,
}
```

### In-Memory Caching

EllyMUD caches frequently accessed data in memory:

- **Room templates** (loaded on startup)
- **Item templates** (loaded on startup)
- **NPC templates** (loaded on startup)
- **User sessions** (active players)

**Memory usage:**
- ~1-2 MB per 100 rooms
- ~0.5-1 MB per 100 item templates
- ~10-50 KB per active user session

### Cache Invalidation

**Manual refresh:**
```bash
# Reload data from disk/database
/reload rooms
/reload items
/reload npcs
```

**Automatic refresh:**
- User data: on every action
- Room state: on every update
- Combat state: every tick

---

## Resource Management

### Memory Management

**Check memory usage:**
```bash
# Linux
ps aux | grep node
top -p $(pgrep -f node)

# Docker
docker stats
```

**Memory limits:**
```bash
# Node.js heap size
node --max-old-space-size=2048 dist/server.js  # 2GB

# Docker Compose
services:
  app:
    deploy:
      resources:
        limits:
          memory: 2G
```

**Memory leaks:**
```bash
# Enable heap profiling
node --inspect dist/server.js

# Chrome DevTools
# chrome://inspect
# Take heap snapshots over time
```

### CPU Optimization

**Profiling:**
```bash
# CPU profiling
node --prof dist/server.js

# Process profile
node --prof-process isolate-*.log > processed.txt
```

**Optimization tips:**
- Reduce NPC count in high-traffic rooms
- Optimize combat tick interval
- Use async operations for I/O
- Batch database writes

### Network I/O

**Optimize WebSocket:**
- Use binary frames for large data (not yet implemented)
- Compress messages (Socket.IO built-in)
- Batch updates where possible

**Telnet optimization:**
- Minimize unnecessary output
- Use ANSI codes efficiently
- Buffer output for large messages

---

## Horizontal Scaling

### Multi-Server Architecture

```
                    Load Balancer
                         |
        +----------------+----------------+
        |                |                |
   EllyMUD-1        EllyMUD-2        EllyMUD-3
        |                |                |
        +-------+--------+-------+--------+
                |                |
           PostgreSQL         Redis
        (shared database) (shared sessions)
```

### Requirements for Multi-Server

1. **Shared Database:** PostgreSQL (not SQLite)
2. **Shared Sessions:** Redis (required)
3. **Load Balancer:** Nginx, HAProxy, or cloud LB
4. **Sticky Sessions:** WebSocket connections

### Configuration

**Server 1:**
```bash
# .env
STORAGE_BACKEND=postgres
DATABASE_URL=postgresql://user:pass@db-server:5432/ellymud
USE_REDIS=true
REDIS_URL=redis://redis-server:6379
```

**Server 2:** (same configuration)

**Nginx Load Balancer:**
```nginx
upstream ellymud_backend {
    ip_hash;  # Sticky sessions
    server 10.0.0.1:8080;
    server 10.0.0.2:8080;
    server 10.0.0.3:8080;
}

server {
    listen 80;

    location / {
        proxy_pass http://ellymud_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Limitations

**Current limitations:**
- Combat state is server-local (players in same combat must be on same server)
- Room state updates are not synchronized across servers

**Future improvements:**
- Distributed combat state via Redis
- Real-time room state synchronization

---

## Monitoring

### Metrics to Track

**Server metrics:**
- CPU usage
- Memory usage
- Network I/O
- Disk I/O

**Application metrics:**
- Active connections
- Requests per second
- Average response time
- Error rate

**Game metrics:**
- Online players
- Active combats
- Commands per second
- Database query time

### Monitoring Tools

**Built-in:**
```bash
# Server stats
/stats

# Memory usage
/memory

# Active sessions
/sessions
```

**External tools:**
- **Prometheus** - Metrics collection
- **Grafana** - Visualization
- **New Relic** - APM
- **Datadog** - Infrastructure monitoring

### Log Analysis

```bash
# Response times
grep "Request" logs/access.log | awk '{print $NF}' | sort -n

# Error rate
grep -c "ERROR" logs/error.log

# Active users over time
grep "User connected" logs/system.log | awk '{print $1}' | uniq -c
```

---

## Benchmarks

### Methodology

**Test environment:**
- Ubuntu 22.04
- Node.js 20.19
- 4 CPU cores, 8 GB RAM

**Test scenarios:**
1. Sequential user logins
2. Concurrent user actions
3. Combat processing
4. Database operations

### Results

#### JSON Backend

| Operation | Avg Time | Concurrent (10 users) |
|-----------|----------|----------------------|
| User login | 45ms | 180ms |
| Command execution | 15ms | 60ms |
| Combat turn | 25ms | 100ms |
| Room navigation | 20ms | 80ms |

#### SQLite Backend

| Operation | Avg Time | Concurrent (10 users) |
|-----------|----------|----------------------|
| User login | 12ms | 25ms |
| Command execution | 8ms | 15ms |
| Combat turn | 18ms | 35ms |
| Room navigation | 6ms | 12ms |

#### PostgreSQL Backend (local)

| Operation | Avg Time | Concurrent (10 users) |
|-----------|----------|----------------------|
| User login | 15ms | 28ms |
| Command execution | 10ms | 18ms |
| Combat turn | 20ms | 38ms |
| Room navigation | 8ms | 15ms |

### Scaling Benchmarks

| Concurrent Users | Backend | CPU Usage | Memory | Avg Response |
|-----------------|---------|-----------|--------|--------------|
| 10 | JSON | 5% | 250 MB | 50ms |
| 10 | SQLite | 8% | 300 MB | 20ms |
| 10 | PostgreSQL | 10% | 350 MB | 25ms |
| 50 | SQLite | 25% | 600 MB | 45ms |
| 50 | PostgreSQL | 20% | 700 MB | 35ms |
| 100 | SQLite | 60% | 1.2 GB | 120ms |
| 100 | PostgreSQL | 35% | 1.5 GB | 50ms |

**Key takeaways:**
- PostgreSQL scales better with increased concurrency
- Memory usage is ~10-15 MB per concurrent user
- SQLite hits limits around 50-100 users
- PostgreSQL maintains <100ms response up to 100+ users

---

## Best Practices

### Development

✅ Use JSON backend for fast iteration
✅ Enable test mode for deterministic testing
✅ Profile code changes before deploying
✅ Monitor memory during development

### Staging

✅ Use SQLite or PostgreSQL
✅ Enable Redis for session testing
✅ Load test with realistic user counts
✅ Monitor query performance

### Production

✅ Use PostgreSQL with connection pooling
✅ Enable Redis for session caching
✅ Set memory limits (Node + Docker)
✅ Implement proper logging and monitoring
✅ Use CDN for static assets
✅ Enable compression (gzip)
✅ Schedule regular database maintenance
✅ Plan for horizontal scaling

---

## Related Documentation

- [Storage Backends](storage-backends.md) - Backend selection
- [Docker Guide](docker.md) - Container deployment
- [Configuration Guide](configuration.md) - Performance tuning
- [Deployment Guide](deployment.md) - Production setup

---

**Need help?** Open an [issue](https://github.com/ellyseum/ellymud/issues) or check the [troubleshooting guide](troubleshooting.md).
