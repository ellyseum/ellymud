#!/bin/bash
# Run integration tests with external services (Redis, PostgreSQL)

set -e

REDIS_CONTAINER="ellymud-redis-test"
POSTGRES_CONTAINER="ellymud-postgres-test"

cleanup() {
  echo "Stopping test containers..."
  docker stop "$REDIS_CONTAINER" 2>/dev/null || true
  docker rm "$REDIS_CONTAINER" 2>/dev/null || true
  docker stop "$POSTGRES_CONTAINER" 2>/dev/null || true
  docker rm "$POSTGRES_CONTAINER" 2>/dev/null || true
}

# Cleanup on exit
trap cleanup EXIT

# Parse arguments
RUN_POSTGRES=false
for arg in "$@"; do
  case $arg in
    --with-postgres)
      RUN_POSTGRES=true
      shift
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

# Optionally start PostgreSQL
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
fi

echo ""
echo "Running integration tests..."
REDIS_URL=redis://localhost:6379 npx jest --config jest.integration.config.js "$@"

echo ""
echo "✅ Integration tests complete!"
