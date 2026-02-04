#!/bin/bash
#=============================================================================
# EllyMUD Oracle Cloud Bootstrap Script
#
# Run this on a fresh Oracle Linux VM to set up EllyMUD
#
# Usage (on the VM):
#   curl -fsSL https://raw.githubusercontent.com/ellyseum/ellymud/main/scripts/bootstrap-oracle.sh | bash -s -- [domain]
#
# Or after cloning:
#   ./scripts/bootstrap-oracle.sh [domain]
#=============================================================================

set -e

DOMAIN="${1:-ellymud.com}"
REPO_URL="https://github.com/ellyseum/ellymud.git"

echo "============================================"
echo "EllyMUD Oracle Cloud Bootstrap"
echo "Domain: $DOMAIN"
echo "============================================"

# Update system
echo "Updating system packages..."
sudo dnf update -y

# Install git
echo "Installing git..."
sudo dnf install -y git

# Install Docker
echo "Installing Docker..."
sudo dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Start and enable Docker
sudo systemctl start docker
sudo systemctl enable docker

# Add current user to docker group
sudo usermod -aG docker $USER

# Open firewall ports
echo "Configuring firewall..."
sudo firewall-cmd --permanent --add-port=22/tcp
sudo firewall-cmd --permanent --add-port=23/tcp
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp
sudo firewall-cmd --permanent --add-port=8023/tcp
sudo firewall-cmd --permanent --add-port=8080/tcp
sudo firewall-cmd --permanent --add-port=3100/tcp
sudo firewall-cmd --reload

# Clone repository
echo "Cloning EllyMUD repository..."
cd ~
if [ -d "ellymud" ]; then
    cd ellymud
    git pull
else
    git clone "$REPO_URL"
    cd ellymud
fi

# Create directories
mkdir -p certbot/conf certbot/www logs data

# Create .env.prod
echo "Creating environment file..."
cat > .env.prod << EOF
ELLYMUD_MCP_API_KEY=$(openssl rand -hex 32)
POSTGRES_PASSWORD=$(openssl rand -hex 16)
DOMAIN=$DOMAIN
EOF

# Update nginx config with domain
sed -i "s/ellymud.com/$DOMAIN/g" nginx/conf.d/default.conf

echo "============================================"
echo "Bootstrap complete!"
echo ""
echo "Next steps:"
echo "1. Log out and back in (for docker group)"
echo "2. Run: cd ~/ellymud && ./scripts/deploy-prod.sh $DOMAIN"
echo ""
echo "Or manually:"
echo "  cd ~/ellymud"
echo "  docker compose -f docker-compose.prod.yml up -d"
echo "============================================"
