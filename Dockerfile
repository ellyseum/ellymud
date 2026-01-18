# EllyMUD Production Dockerfile
# Multi-stage build for optimized production image

#=============================================================================
# Stage 1: Build
#=============================================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source files
COPY tsconfig.json ./
COPY vite.config.ts ./
COPY src/ ./src/

# Build TypeScript and frontend
RUN npm run build

#=============================================================================
# Stage 2: Production
#=============================================================================
FROM node:20-alpine AS production

WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S ellymud && \
    adduser -S ellymud -u 1001 -G ellymud

# Copy package files
COPY package*.json ./

# Install production dependencies only (ignore scripts to skip husky prepare)
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

# Copy public assets
COPY public/ ./public/

# Copy data files (as templates - mount volume for persistence)
COPY data/ ./data/

# Copy entrypoint script
COPY scripts/docker-entrypoint.sh ./scripts/docker-entrypoint.sh

# Create log directories
RUN mkdir -p logs/system logs/players logs/error logs/mcp logs/raw-sessions logs/audit && \
    chown -R ellymud:ellymud /app

# Switch to non-root user
USER ellymud

# Environment variables
ENV NODE_ENV=production
ENV PORT_TELNET=8023
ENV PORT_WEBSOCKET=8080
ENV PORT_MCP=3100

# Expose ports
# Telnet
EXPOSE 8023
# WebSocket
EXPOSE 8080
# MCP API
EXPOSE 3100

# Health check (use 127.0.0.1 explicitly to avoid IPv6 issues in Alpine)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "const http=require('http');const req=http.get('http://127.0.0.1:3100/health',res=>{res.statusCode===200?process.exit(0):process.exit(1);});req.on('error',()=>process.exit(1));"

# Start server with --force flag to auto-create admin with default password
ENTRYPOINT ["./scripts/docker-entrypoint.sh"]
CMD ["node", "--enable-source-maps", "dist/server.js", "--force"]
