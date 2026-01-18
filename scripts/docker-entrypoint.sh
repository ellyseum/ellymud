#!/bin/sh
#=============================================================================
# Docker Entrypoint
#
# Generates a random MCP API key if not provided, then starts the server.
#=============================================================================

set -e

if [ -z "$ELLYMUD_MCP_API_KEY" ]; then
  ELLYMUD_MCP_API_KEY="$(node -e "const crypto=require('crypto');process.stdout.write(crypto.randomBytes(32).toString('hex'));")"
  export ELLYMUD_MCP_API_KEY
  echo "Generated MCP API key for this container run."
  echo "Set ELLYMUD_MCP_API_KEY to persist a stable key."
fi

exec "$@"
