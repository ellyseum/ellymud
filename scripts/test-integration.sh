#!/bin/bash
# Run integration tests with external services (Redis, PostgreSQL)
#
# Usage:
#   ./scripts/test-integration.sh           # Run all tests (Redis + PostgreSQL)
#   ./scripts/test-integration.sh --no-postgres  # Run without PostgreSQL
#   ./scripts/test-integration.sh <test-file>    # Run specific test file
#
# Environment variables:
#   TEST_DATABASE_URL - Override PostgreSQL connection string
#   REDIS_URL         - Override Redis connection string

set -e

REDIS_CONTAINER="ellymud-redis-test"
POSTGRES_CONTAINER="ellymud-postgres-test"

cleanup() {
  echo ""
  echo "Stopping test containers..."
  docker stop "$REDIS_CONTAINER" 2>/dev/null || true
  docker rm "$REDIS_CONTAINER" 2>/dev/null || true
  docker stop "$POSTGRES_CONTAINER" 2>/dev/null || true
  docker rm "$POSTGRES_CONTAINER" 2>/dev/null || true
}

# Cleanup on exit
trap cleanup EXIT

# Parse arguments - PostgreSQL enabled by default now
RUN_POSTGRES=true
EXTRA_ARGS=()
for arg in "$@"; do
  case $arg in
    --no-postgres)
      RUN_POSTGRES=false
      ;;
    --with-postgres)
      # Kept for backwards compatibility, no-op since it's default now
      ;;
    *)
      EXTRA_ARGS+=("$arg")
      ;;
  esac
done

echo "=== EllyMUD Integration Tests ==="
echo ""

# Start Redis
echo "Starting Redis for integration tests..."
docker run -d --name "$REDIS_CONTAINER" -p 6379:6379 redis:alpine

# Wait for Redis to be ready
echo "Waiting for Redis..."
for i in {1..30}; do
  if docker exec "$REDIS_CONTAINER" redis-cli ping >/dev/null 2>&1; then
    echo "✅ Redis is ready!"
    break
  fi
  sleep 0.5
done

# Start PostgreSQL (enabled by default)
if [ "$RUN_POSTGRES" = true ]; then
  echo ""
  echo "Starting PostgreSQL for integration tests..."
  docker run -d --name "$POSTGRES_CONTAINER" \
    -p 5432:5432 \
    -e POSTGRES_DB=ellymud_test \
    -e POSTGRES_USER=ellymud \
    -e POSTGRES_PASSWORD=testpass \
    postgres:16-alpine

  # Wait for PostgreSQL to be ready
  echo "Waiting for PostgreSQL..."
  for i in {1..30}; do
    if docker exec "$POSTGRES_CONTAINER" pg_isready -U ellymud >/dev/null 2>&1; then
      echo "✅ PostgreSQL is ready!"
      break
    fi
    sleep 1
  done
  
  export TEST_DATABASE_URL="postgres://ellymud:testpass@localhost:5432/ellymud_test"
else
  echo ""
  echo "⚠️  PostgreSQL tests will be SKIPPED (use default to enable)"
fi

echo ""
echo "Running integration tests..."
echo "  Storage backends: JSON ✅ | SQLite ✅ | PostgreSQL $([ "$RUN_POSTGRES" = true ] && echo "✅" || echo "⏭️")"
echo ""

REDIS_URL=redis://localhost:6379 npx jest --config jest.integration.config.js "${EXTRA_ARGS[@]}"

echo ""
echo "✅ Integration tests complete!"
