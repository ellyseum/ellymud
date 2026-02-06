#!/bin/bash
#=============================================================================
# EllyMUD Production Deployment Script
#
# Usage:
#   ./scripts/deploy-prod.sh [domain]
#
# This script:
#   1. Installs Docker if needed
#   2. Sets up SSL certificates with Let's Encrypt
#   3. Starts EllyMUD with Redis and PostgreSQL
#=============================================================================

set -e

DOMAIN="${1:-ellymud.com}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "============================================"
echo "EllyMUD Production Deployment"
echo "Domain: $DOMAIN"
echo "============================================"

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then
    SUDO="sudo"
else
    SUDO=""
fi

# Install Docker if not present
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com | $SUDO sh
    $SUDO usermod -aG docker $USER
    echo "Docker installed. You may need to log out and back in for group changes."
fi

# Install Docker Compose plugin if not present
if ! docker compose version &> /dev/null; then
    echo "Installing Docker Compose..."
    $SUDO apt-get update
    $SUDO apt-get install -y docker-compose-plugin
fi

# Create required directories
echo "Creating directories..."
mkdir -p "$PROJECT_DIR/certbot/conf"
mkdir -p "$PROJECT_DIR/certbot/www"
mkdir -p "$PROJECT_DIR/logs"

# Update nginx config with actual domain
echo "Configuring nginx for domain: $DOMAIN"
sed -i "s/ellymud.com/$DOMAIN/g" "$PROJECT_DIR/nginx/conf.d/default.conf"

# Create .env.prod if it doesn't exist
if [ ! -f "$PROJECT_DIR/.env.prod" ]; then
    echo "Creating .env.prod..."
    cat > "$PROJECT_DIR/.env.prod" << EOF
# EllyMUD Production Environment
ELLYMUD_MCP_API_KEY=$(openssl rand -hex 32)
POSTGRES_PASSWORD=$(openssl rand -hex 16)
DOMAIN=$DOMAIN
EOF
    echo "Generated .env.prod with random secrets"
fi

# Load environment
set -a
source "$PROJECT_DIR/.env.prod"
set +a

# Create temporary nginx config without SSL for initial cert request
echo "Setting up temporary nginx for SSL certificate..."
cat > "$PROJECT_DIR/nginx/conf.d/default.conf.tmp" << 'EOF'
server {
    listen 80;
    server_name _;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 200 'EllyMUD setup in progress...';
        add_header Content-Type text/plain;
    }
}
EOF

# Backup original config and use temporary
cp "$PROJECT_DIR/nginx/conf.d/default.conf" "$PROJECT_DIR/nginx/conf.d/default.conf.bak"
cp "$PROJECT_DIR/nginx/conf.d/default.conf.tmp" "$PROJECT_DIR/nginx/conf.d/default.conf"

# Comment out stream block temporarily (needs SSL cert first)
sed -i 's/^stream {/# stream {/' "$PROJECT_DIR/nginx/nginx.conf"
sed -i '/^# stream {/,/^}/s/^/# /' "$PROJECT_DIR/nginx/nginx.conf"

# Start nginx only for cert request
echo "Starting nginx for certificate request..."
docker compose -f "$PROJECT_DIR/docker-compose.prod.yml" up -d nginx

# Wait for nginx to be ready
sleep 5

# Request SSL certificate
echo "Requesting SSL certificate for $DOMAIN..."
docker compose -f "$PROJECT_DIR/docker-compose.prod.yml" run --rm certbot certonly \
    --webroot \
    -w /var/www/certbot \
    -d "$DOMAIN" \
    --email "admin@$DOMAIN" \
    --agree-tos \
    --no-eff-email \
    --force-renewal

# Stop nginx
docker compose -f "$PROJECT_DIR/docker-compose.prod.yml" down

# Restore full nginx config
cp "$PROJECT_DIR/nginx/conf.d/default.conf.bak" "$PROJECT_DIR/nginx/conf.d/default.conf"
sed -i "s/ellymud.com/$DOMAIN/g" "$PROJECT_DIR/nginx/conf.d/default.conf"

# Uncomment stream block
sed -i 's/^# stream {/stream {/' "$PROJECT_DIR/nginx/nginx.conf"
sed -i '/^stream {/,/^# }/s/^# //' "$PROJECT_DIR/nginx/nginx.conf"

# Remove temporary files
rm -f "$PROJECT_DIR/nginx/conf.d/default.conf.tmp"
rm -f "$PROJECT_DIR/nginx/conf.d/default.conf.bak"

# Fix permissions for Docker container (runs as uid 1001)
echo "Fixing data/logs permissions for container..."
$SUDO chown -R 1001:1001 "$PROJECT_DIR/data" 2>/dev/null || true
$SUDO chown -R 1001:1001 "$PROJECT_DIR/logs" 2>/dev/null || true

# Start all services
echo "Starting EllyMUD..."
docker compose -f "$PROJECT_DIR/docker-compose.prod.yml" --env-file "$PROJECT_DIR/.env.prod" up -d

echo "============================================"
echo "Deployment complete!"
echo ""
echo "EllyMUD is now running at:"
echo "  - Web:    https://$DOMAIN"
echo "  - Telnet: telnet $DOMAIN 23"
echo "  - MCP:    https://$DOMAIN/api/"
echo ""
echo "To view logs:"
echo "  docker compose -f docker-compose.prod.yml logs -f"
echo ""
echo "To stop:"
echo "  docker compose -f docker-compose.prod.yml down"
echo "============================================"
