#!/bin/bash
# Live E2E test against production ellymud.com
# No tick manipulation - real gameplay testing
#
# Usage:
#   ./scripts/test-live-prod.sh
#   ./scripts/test-live-prod.sh --verbose
#
# Requires: ~/.secrets/ellymud-prod.env with ELLYMUD_PROD_MCP_KEY

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Load production key
if [[ ! -f ~/.secrets/ellymud-prod.env ]]; then
  echo "Error: ~/.secrets/ellymud-prod.env not found"
  echo "Create it with: ELLYMUD_PROD_MCP_KEY=<your-key>"
  exit 1
fi

source ~/.secrets/ellymud-prod.env

if [[ -z "$ELLYMUD_PROD_MCP_KEY" ]]; then
  echo "Error: ELLYMUD_PROD_MCP_KEY not set in ~/.secrets/ellymud-prod.env"
  exit 1
fi

MCP_URL="https://ellymud.com/api/"
VERBOSE="${1:-}"

# Helper to call MCP
mcp_call() {
  local method="$1"
  local params="${2:-{}}"

  curl -sL -X POST "$MCP_URL" \
    -H "Content-Type: application/json" \
    -H "X-API-Key: $ELLYMUD_PROD_MCP_KEY" \
    -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"$method\",\"arguments\":$params}}"
}

echo "=========================================="
echo "  EllyMUD Live Production E2E Test"
echo "  Target: $MCP_URL"
echo "=========================================="
echo

# Test 1: Health check
echo -n "1. Health check... "
HEALTH=$(curl -sL "$MCP_URL/health" 2>/dev/null)
if echo "$HEALTH" | grep -q '"status":"ok"'; then
  echo "PASS"
else
  echo "FAIL - Server not healthy"
  exit 1
fi

# Test 2: Get online users
echo -n "2. Get online users... "
RESULT=$(mcp_call "get_online_users")
if echo "$RESULT" | grep -q '"result"'; then
  USERS=$(echo "$RESULT" | jq -r '.result.content[0].text' 2>/dev/null | jq -r 'length' 2>/dev/null || echo "?")
  echo "PASS ($USERS users online)"
else
  echo "FAIL"
  [[ -n "$VERBOSE" ]] && echo "$RESULT"
fi

# Test 3: Get all rooms
echo -n "3. Get all rooms... "
RESULT=$(mcp_call "get_all_rooms")
if echo "$RESULT" | grep -q '"result"'; then
  ROOMS=$(echo "$RESULT" | jq -r '.result.content[0].text' 2>/dev/null | jq -r 'length' 2>/dev/null || echo "?")
  echo "PASS ($ROOMS rooms)"
else
  echo "FAIL"
  [[ -n "$VERBOSE" ]] && echo "$RESULT"
fi

# Test 4: Direct login as test user
echo -n "4. Direct login (temp user)... "
RESULT=$(mcp_call "direct_login" '{"username":"livetest_'$$'"}')
if echo "$RESULT" | grep -q 'sessionId'; then
  SESSION_ID=$(echo "$RESULT" | jq -r '.result.content[0].text' 2>/dev/null | jq -r '.sessionId' 2>/dev/null)
  echo "PASS (session: ${SESSION_ID:0:8}...)"
else
  echo "FAIL"
  [[ -n "$VERBOSE" ]] && echo "$RESULT"
  SESSION_ID=""
fi

if [[ -n "$SESSION_ID" ]]; then
  # Test 5: Send command (look)
  echo -n "5. Send 'look' command... "
  RESULT=$(mcp_call "virtual_session_command" "{\"sessionId\":\"$SESSION_ID\",\"command\":\"look\"}")
  if echo "$RESULT" | grep -q '"result"'; then
    echo "PASS"
    if [[ -n "$VERBOSE" ]]; then
      echo "$RESULT" | jq -r '.result.content[0].text' 2>/dev/null | head -10
    fi
  else
    echo "FAIL"
  fi

  # Test 6: Movement
  echo -n "6. Test movement (north)... "
  RESULT=$(mcp_call "virtual_session_command" "{\"sessionId\":\"$SESSION_ID\",\"command\":\"north\"}")
  if echo "$RESULT" | grep -q '"result"'; then
    echo "PASS"
  else
    echo "FAIL"
  fi

  # Test 7: Check stats
  echo -n "7. Check player stats... "
  RESULT=$(mcp_call "virtual_session_command" "{\"sessionId\":\"$SESSION_ID\",\"command\":\"stats\"}")
  if echo "$RESULT" | grep -q '"result"'; then
    echo "PASS"
  else
    echo "FAIL"
  fi

  # Cleanup: Close session
  echo -n "8. Cleanup session... "
  RESULT=$(mcp_call "virtual_session_close" "{\"sessionId\":\"$SESSION_ID\"}")
  if echo "$RESULT" | grep -q '"result"'; then
    echo "PASS"
  else
    echo "FAIL"
  fi
fi

echo
echo "=========================================="
echo "  Live Production Test Complete"
echo "=========================================="
