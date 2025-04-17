FROM oven/bun:1 as builder

WORKDIR /app

# Install system dependencies for better-sqlite3
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

# Build the application
RUN bun run build

# Production image
FROM oven/bun:1-slim

WORKDIR /app

# Copy from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/src/config ./src/config
COPY --from=builder /app/src/infrastructure/database/migrations ./src/infrastructure/database/migrations

# Expose the port the app runs on
EXPOSE 3000

# Create a script to run migrations and start the app
RUN echo '#!/bin/sh\necho "Running migrations..."\nbun run db:migrate\necho "Starting application..."\nexec bun run dist/index.js' > /app/start.sh && chmod +x /app/start.sh

# Command to run the application
CMD ["/app/start.sh"]
