#!/bin/bash
# Run integration tests with Redis

set -e

REDIS_CONTAINER="ellymud-redis-test"

cleanup() {
  echo "Stopping Redis..."
  docker stop "$REDIS_CONTAINER" 2>/dev/null || true
  docker rm "$REDIS_CONTAINER" 2>/dev/null || true
}

# Cleanup on exit
trap cleanup EXIT

echo "Starting Redis for integration tests..."
docker run -d --name "$REDIS_CONTAINER" -p 6379:6379 redis:alpine

# Wait for Redis to be ready
echo "Waiting for Redis..."
for i in {1..30}; do
  if docker exec "$REDIS_CONTAINER" redis-cli ping >/dev/null 2>&1; then
    echo "Redis is ready!"
    break
  fi
  sleep 0.5
done

echo "Running integration tests..."
REDIS_URL=redis://localhost:6379 npx jest --config jest.integration.config.js

echo "Integration tests complete!"
