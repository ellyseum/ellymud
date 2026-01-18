# Deployment Guide

This guide covers deploying EllyMUD to production environments.

License: AGPL-3.0-or-later; commercial/proprietary licensing available via https://github.com/ellyseum.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Deployment Options](#deployment-options)
- [Production Setup](#production-setup)
- [Security Hardening](#security-hardening)
- [Monitoring and Maintenance](#monitoring-and-maintenance)
- [Backup and Recovery](#backup-and-recovery)
- [Troubleshooting](#troubleshooting)

## Related Guides

Before deploying, review these comprehensive guides:

- **[Docker Deployment](docker.md)** - Complete Docker setup with Docker Compose
- **[Configuration Guide](configuration.md)** - Environment variables and production settings
- **[Storage Backends](storage-backends.md)** - Choosing PostgreSQL, SQLite, or JSON
- **[Performance Guide](performance.md)** - Optimization and scaling strategies
- **[Troubleshooting](troubleshooting.md)** - Common deployment issues

This guide provides deployment workflows. For detailed configuration, see the guides above.

## Prerequisites

### System Requirements

**Minimum:**

- 1 CPU core
- 512 MB RAM
- 5 GB disk space
- Linux OS (Ubuntu 20.04+ recommended)

**Recommended:**

- 2+ CPU cores
- 2 GB+ RAM
- 20 GB+ disk space
- Linux OS with latest updates

### Software Requirements

- Node.js 20.19 or higher
- npm 8.x or higher
- PM2 (for process management)
- nginx (for reverse proxy, optional but recommended)
- certbot (for SSL/TLS certificates, optional)

## Deployment Options

### Option 1: Traditional Server

Deploy on a VPS or dedicated server (DigitalOcean, Linode, AWS EC2, etc.).

**Pros:**

- Full control
- Predictable costs
- Easy to manage

**Cons:**

- Manual server management
- No auto-scaling

### Option 2: Container (Docker)

Deploy using Docker containers.

**Pros:**

- Consistent environment
- Easy to scale
- Portable

**Cons:**

- Requires Docker knowledge
- Slightly more complex setup

**See:** [Docker Deployment Guide](docker.md) for complete container-based deployment instructions.

### Option 3: Platform as a Service

Deploy on platforms like Heroku, Render, or Railway.

**Pros:**

- Minimal setup
- Automatic scaling
- Built-in monitoring

**Cons:**

- Higher cost
- Less control
- Platform-specific limitations

## Production Setup

### Step 1: Server Preparation

#### Update System

```bash
sudo apt update
sudo apt upgrade -y
```

#### Install Node.js

```bash
# Using NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version
npm --version
```

#### Install PM2

```bash
sudo npm install -g pm2
```

#### Create User

```bash
# Create dedicated user for the application
sudo useradd -m -s /bin/bash ellymud
sudo su - ellymud
```

### Step 2: Deploy Application

#### Clone Repository

```bash
cd /home/ellymud
git clone https://github.com/ellyseum/ellymud.git
cd ellymud
```

#### Install Dependencies

```bash
npm install --production
```

#### Configure Environment

```bash
cp .env.example .env
nano .env
```

Set production values:

```
NODE_ENV=production
MAX_PASSWORD_ATTEMPTS=3
# Add other configuration as needed
```

#### Build Application

```bash
npm run build
```

### Step 3: Configure PM2

Create PM2 ecosystem file:

```bash
nano ecosystem.config.js
```

```javascript
module.exports = {
  apps: [
    {
      name: 'ellymud',
      script: './dist/server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '500M',
    },
  ],
};
```

#### Start with PM2

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

Follow the instructions from `pm2 startup` to enable auto-start on boot.

### Step 4: Configure Firewall

```bash
# Install UFW if not present
sudo apt install ufw

# Allow SSH
sudo ufw allow ssh

# Allow MUD ports
sudo ufw allow 8023/tcp  # Telnet
sudo ufw allow 8080/tcp  # HTTP/WebSocket

# Enable firewall
sudo ufw enable
```

### Step 5: Set Up Reverse Proxy (Optional but Recommended)

#### Install nginx

```bash
sudo apt install nginx
```

#### Configure nginx

```bash
sudo nano /etc/nginx/sites-available/ellymud
```

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Redirect HTTP to HTTPS (after SSL setup)
    # return 301 https://$server_name$request_uri;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/ellymud /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Step 6: Set Up SSL/TLS (Recommended)

#### Install Certbot

```bash
sudo apt install certbot python3-certbot-nginx
```

#### Obtain Certificate

```bash
sudo certbot --nginx -d your-domain.com
```

Follow the prompts to configure SSL.

#### Auto-Renewal

Certbot sets up auto-renewal. Test it:

```bash
sudo certbot renew --dry-run
```

## Security Hardening

### 1. Restrict Telnet Access

If you don't need public Telnet access, restrict it to localhost or trusted IPs:

```bash
# In your firewall
sudo ufw delete allow 8023/tcp
sudo ufw allow from <trusted_ip> to any port 8023
```

Or use SSH tunneling for Telnet:

```bash
# On client:
ssh -L 8023:localhost:8023 user@your-server.com
telnet localhost 8023
```

### 2. Harden SSH

```bash
sudo nano /etc/ssh/sshd_config
```

Set:

```
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
```

Restart SSH:

```bash
sudo systemctl restart sshd
```

### 3. Set File Permissions

```bash
cd /home/ellymud/ellymud

# Secure data files
chmod 700 data/
chmod 600 data/**/*.json

# Secure environment file
chmod 600 .env

# Secure logs
chmod 700 logs/
```

### 4. Enable Automatic Security Updates

```bash
sudo apt install unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

### 5. Install Fail2Ban

Protect against brute force attacks:

```bash
sudo apt install fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 6. Regular Dependency Updates

```bash
# Check for vulnerabilities
npm audit

# Update dependencies
npm update

# Fix vulnerabilities
npm audit fix
```

## Monitoring and Maintenance

### PM2 Monitoring

```bash
# View logs
pm2 logs ellymud

# Monitor resources
pm2 monit

# Check status
pm2 status

# Restart application
pm2 restart ellymud

# Stop application
pm2 stop ellymud
```

### Log Management

EllyMUD uses daily log rotation. Logs are in:

```
logs/
├── system/     # System events
├── error/      # Errors
├── players/    # Player actions
└── raw-sessions/  # Raw I/O
```

Set up log cleanup:

```bash
# Create cleanup script
nano /home/ellymud/cleanup-logs.sh
```

```bash
#!/bin/bash
# Keep logs for 30 days
find /home/ellymud/ellymud/logs -type f -name "*.log" -mtime +30 -delete
```

```bash
chmod +x /home/ellymud/cleanup-logs.sh

# Add to crontab
crontab -e
# Add: 0 2 * * * /home/ellymud/cleanup-logs.sh
```

### System Monitoring

Install monitoring tools:

```bash
# htop for process monitoring
sudo apt install htop

# iotop for disk I/O monitoring
sudo apt install iotop

# nethogs for network monitoring
sudo apt install nethogs
```

### Application Health Checks

Create a health check script:

```bash
nano /home/ellymud/health-check.sh
```

```bash
#!/bin/bash
# Check if Telnet port is responding
nc -zv localhost 8023 > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "Telnet port not responding, restarting..."
    pm2 restart ellymud
fi

# Check if HTTP port is responding
nc -zv localhost 8080 > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "HTTP port not responding, restarting..."
    pm2 restart ellymud
fi
```

```bash
chmod +x /home/ellymud/health-check.sh

# Add to crontab (every 5 minutes)
crontab -e
# Add: */5 * * * * /home/ellymud/health-check.sh
```

## Backup and Recovery

### Automated Backups

Create backup script:

```bash
nano /home/ellymud/backup.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/home/ellymud/backups"
DATE=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_FILE="ellymud-backup-$DATE.tar.gz"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup data directory
tar -czf $BACKUP_DIR/$BACKUP_FILE /home/ellymud/ellymud/data/

# Keep only last 7 days of backups
find $BACKUP_DIR -type f -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_FILE"
```

```bash
chmod +x /home/ellymud/backup.sh

# Add to crontab (daily at 3 AM)
crontab -e
# Add: 0 3 * * * /home/ellymud/backup.sh
```

### Manual Backup

```bash
# Backup data
tar -czf ellymud-backup-$(date +%Y-%m-%d).tar.gz data/

# Download to local machine
scp user@your-server:/home/ellymud/ellymud-backup-*.tar.gz ./
```

### Recovery

```bash
# Stop application
pm2 stop ellymud

# Restore from backup
tar -xzf ellymud-backup-YYYY-MM-DD.tar.gz

# Start application
pm2 start ellymud
```

### Off-Site Backups

For production, use off-site backups:

**Options:**

- AWS S3
- Google Cloud Storage
- Backblaze B2
- rsync to remote server

**Example with rsync:**

```bash
# In backup script, add:
rsync -avz --delete $BACKUP_DIR user@backup-server:/backups/ellymud/
```

## Troubleshooting

### Application Won't Start

Check logs:

```bash
pm2 logs ellymud
cat logs/error/error-$(date +%Y-%m-%d).log
```

Common issues:

- Port already in use
- Permissions issues
- Missing dependencies
- Configuration errors

### High Memory Usage

```bash
# Check memory
pm2 monit

# Restart if needed
pm2 restart ellymud

# Adjust max memory in ecosystem.config.js
max_memory_restart: '500M'
```

### Connection Issues

Test ports:

```bash
# Telnet port
telnet localhost 8023

# HTTP port
curl http://localhost:8080
```

Check firewall:

```bash
sudo ufw status
```

### Performance Issues

Monitor:

```bash
# CPU and memory
htop

# Disk I/O
iotop

# Network
nethogs
```

Optimize:

- Increase server resources
- Enable caching
- Optimize database queries
- Review and optimize code

### Database Corruption

If JSON files become corrupted:

```bash
# Stop application
pm2 stop ellymud

# Restore from backup
cp backup/data/* data/

# Validate files
npm run validate

# Start application
pm2 start ellymud
```

## Production Checklist

Before going live:

- [ ] Environment variables configured
- [ ] Strong admin password set
- [ ] Firewall configured
- [ ] SSL/TLS certificates installed
- [ ] PM2 configured for auto-restart
- [ ] Backup system set up
- [ ] Monitoring in place
- [ ] Log rotation configured
- [ ] Security hardening complete
- [ ] Health checks running
- [ ] Documentation updated
- [ ] Tested failover procedures
- [ ] Load testing performed

## Scaling

### Horizontal Scaling

EllyMUD supports horizontal scaling with Redis session storage and PostgreSQL.

See [Performance Guide - Horizontal Scaling](performance.md#horizontal-scaling) for complete multi-server setup instructions.

**Requirements:**
1. **Redis for session storage** - Shared session state
2. **PostgreSQL for persistence** - Shared database
3. **Load balancer** - nginx or HAProxy with sticky sessions
4. **Shared file system** - For data synchronization

### Vertical Scaling

Increase server resources:

- More CPU cores
- More RAM
- Faster disk (SSD)
- Better network

See [Performance Guide](performance.md) for optimization strategies.

## Cost Estimation

### Small Deployment (50-100 users)

- VPS: $5-10/month
- Domain: $10-15/year
- Total: ~$75-150/year

### Medium Deployment (100-500 users)

- VPS: $20-40/month
- Domain: $10-15/year
- Backups: $5-10/month
- Total: ~$300-600/year

### Large Deployment (500+ users)

- Dedicated server or multiple VPS
- $50-200+/month
- Professional monitoring
- DDoS protection
- Total: $600+/year

---

## Related Documentation

- **[Docker Deployment](docker.md)** - Container-based deployment with Docker Compose
- **[Configuration Guide](configuration.md)** - Environment variables and production settings
- **[Storage Backends](storage-backends.md)** - Database setup and migration
- **[Performance Guide](performance.md)** - Optimization and scaling strategies
- **[Troubleshooting](troubleshooting.md)** - Deployment issue resolution
- **[Admin Guide](admin-guide.md)** - Server administration
- **[Security Policy](../SECURITY.md)** - Security best practices

---

**Need help?** Check [Troubleshooting](troubleshooting.md) or open an [issue](https://github.com/ellyseum/ellymud/issues)
