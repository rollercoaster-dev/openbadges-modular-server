FROM --platform=$BUILDPLATFORM oven/bun:1 AS builder

# Add build arguments for architecture-specific optimizations
ARG BUILDPLATFORM
ARG TARGETPLATFORM
ARG TARGETARCH

# Print build information for debugging
RUN echo "Building on $BUILDPLATFORM for $TARGETPLATFORM ($TARGETARCH)"

WORKDIR /app

# Install system dependencies for better-sqlite3
# Use architecture-specific optimizations where possible
RUN apt-get update && \
    apt-get install -y libsqlite3-dev python3 make g++ && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy package.json and bun.lock
COPY package.json bun.lock ./

# Install dependencies
RUN bun install

# Copy source code
COPY . .

# Build the application and migrations
RUN bun run build && \
    bun run build:migrations

# Production image
FROM oven/bun:1-slim

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && \
    apt-get install -y libsqlite3-0 curl && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/drizzle ./drizzle

# Copy scripts
COPY docker/scripts/health-check.sh /app/health-check.sh
RUN chmod +x /app/health-check.sh

# Create data directory for SQLite
RUN mkdir -p /data && chmod 777 /data

# Expose the port the app runs on
EXPOSE 3000

# Create a script to run migrations and start the app
RUN echo '#!/bin/sh\n\
set -e\n\
echo "Running migrations..."\n\
bun run dist/migrations/run.js\n\
echo "Starting application..."\n\
exec bun run dist/index.js' > /app/start.sh && chmod +x /app/start.sh

# Set health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 CMD ["/app/health-check.sh"]

# Command to run the application
CMD ["/app/start.sh"]
