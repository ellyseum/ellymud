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
COPY src/ ./src/

# Build TypeScript
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

# Install production dependencies only
RUN npm ci --omit=dev && npm cache clean --force

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

# Copy public assets
COPY public/ ./public/

# Copy data files (as templates - mount volume for persistence)
COPY data/ ./data/

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

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3100/health || exit 1

# Start server
CMD ["node", "--enable-source-maps", "dist/server.js"]
