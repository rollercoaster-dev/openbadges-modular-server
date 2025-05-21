# Docker Deployment Guide

This guide provides comprehensive instructions for deploying the Open Badges Modular Server using Docker in various environments, from development to production.

## Table of Contents

1. [Introduction](#introduction)
2. [Prerequisites](#prerequisites)
3. [Quick Start](#quick-start)
4. [Configuration Options](#configuration-options)
5. [Integration with Existing Systems](#integration-with-existing-systems)
6. [Production Deployment](#production-deployment)
7. [Troubleshooting](#troubleshooting)

## Introduction

The Open Badges Modular Server is containerized using Docker, making it easy to deploy in various environments. The Docker image supports multiple architectures (amd64 and arm64) and can be configured to use either SQLite or PostgreSQL databases.

### Key Features

- **Multi-architecture support**: Works on both x86_64 and ARM64 systems
- **Multiple database backends**: Supports both SQLite and PostgreSQL
- **Flexible authentication**: Multiple authentication methods available
- **Stateless design**: Easy to scale horizontally
- **Health checks**: Built-in health monitoring

## Prerequisites

Before deploying the Open Badges Modular Server, ensure you have:

- **Docker**: Version 20.10.0 or later
- **Docker Compose**: Version 2.0.0 or later (for multi-container deployments)
- **Network access**: Outbound internet access for pulling images
- **Storage**: Sufficient disk space for the database and application data
- **Memory**: At least 512MB RAM (1GB recommended for production)

## Quick Start

### Using Docker Run

The simplest way to start the server with default settings (SQLite database):

```bash
docker run -p 3000:3000 \
  -e DB_TYPE=sqlite \
  -v sqlite_data:/data \
  ghcr.io/rollercoaster-dev/openbadges-modular-server:latest
```

### Using Docker Compose

For a more complete setup with PostgreSQL:

1. Create a `docker-compose.yml` file:

```yaml
version: '3.8'

services:
  api:
    image: ghcr.io/rollercoaster-dev/openbadges-modular-server:latest
    ports:
      - "3000:3000"
    environment:
      - PORT=3000
      - HOST=0.0.0.0
      - NODE_ENV=production
      - DB_TYPE=postgresql
      - DATABASE_URL=postgres://postgres:postgres@db:5432/openbadges
      - BASE_URL=http://localhost:3000
      - JWT_SECRET=change-this-in-production
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped

  db:
    image: postgres:14-alpine
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=openbadges
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD", "pg_isready", "-U", "postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

volumes:
  postgres_data:
```

2. Start the services:

```bash
docker-compose up -d
```

3. Access the API at http://localhost:3000

## Configuration Options

### Environment Variables

The Docker container is configured using environment variables. Here are the most important ones:

#### Server Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Port the server listens on | `3000` |
| `HOST` | Host the server binds to | `0.0.0.0` |
| `NODE_ENV` | Environment mode | `production` |
| `BASE_URL` | Public URL of the server | `http://localhost:3000` |

#### Database Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_TYPE` | Database type (`sqlite` or `postgresql`) | `sqlite` |
| `SQLITE_FILE` | Path to SQLite database file | `/data/sqlite.db` |
| `DATABASE_URL` | PostgreSQL connection string | `postgres://postgres:postgres@db:5432/openbadges` |

#### Authentication Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `AUTH_ENABLED` | Enable authentication | `true` |
| `JWT_SECRET` | Secret for JWT tokens | `change-this-in-production` |
| `JWT_TOKEN_EXPIRY_SECONDS` | JWT token expiry in seconds | `3600` |
| `AUTH_API_KEY_ENABLED` | Enable API key authentication | `true` |
| `AUTH_BASIC_AUTH_ENABLED` | Enable basic authentication | `true` |
| `AUTH_OAUTH2_ENABLED` | Enable OAuth2 authentication | `false` |

For a complete list of environment variables, see the [Environment Variables Reference](./environment-variables-reference.md).

### Volumes

The Docker container uses the following volumes:

| Volume | Description |
|--------|-------------|
| `/data` | SQLite database and other persistent data |

## Integration with Existing Systems

### Connecting to an External Database

#### External PostgreSQL

To connect to an existing PostgreSQL database:

```bash
docker run -p 3000:3000 \
  -e DB_TYPE=postgresql \
  -e DATABASE_URL=postgres://username:password@your-db-host:5432/your-db-name \
  ghcr.io/rollercoaster-dev/openbadges-modular-server:latest
```

Ensure your database user has the following permissions:
- `CREATE TABLE` - For running migrations
- `INSERT`, `UPDATE`, `DELETE`, `SELECT` - For normal operations

#### External SQLite

To use an external SQLite database file:

```bash
docker run -p 3000:3000 \
  -e DB_TYPE=sqlite \
  -e SQLITE_FILE=/data/external.db \
  -v /path/to/your/data:/data \
  ghcr.io/rollercoaster-dev/openbadges-modular-server:latest
```

### Network Configuration

#### Using a Reverse Proxy

For production deployments, it's recommended to use a reverse proxy like Nginx or Traefik:

##### Nginx Example

```nginx
server {
    listen 80;
    server_name badges.example.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

##### Traefik Example

```yaml
# docker-compose.yml with Traefik
services:
  traefik:
    image: traefik:v2.5
    command:
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro

  api:
    image: ghcr.io/rollercoaster-dev/openbadges-modular-server:latest
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.badges.rule=Host(`badges.example.com`)"
      - "traefik.http.routers.badges.entrypoints=websecure"
      - "traefik.http.routers.badges.tls=true"
    # ... other configuration
```

#### Custom Network Setup

To place the container in a custom Docker network:

```bash
# Create a custom network
docker network create badges-network

# Run the container in the custom network
docker run --network badges-network -p 3000:3000 \
  ghcr.io/rollercoaster-dev/openbadges-modular-server:latest
```

## Production Deployment

### Security Considerations

For production deployments, consider the following security measures:

1. **Use HTTPS**: Always use HTTPS in production
2. **Set a strong JWT secret**: Use a strong, unique secret for JWT signing
3. **Secure database credentials**: Use environment variables or Docker secrets
4. **Limit exposed ports**: Only expose necessary ports
5. **Use non-root user**: The container already runs as a non-root user

### High Availability Setup

For high availability, consider:

1. **Multiple instances**: Run multiple instances behind a load balancer
2. **Database replication**: Use PostgreSQL with replication
3. **Health checks**: Use the built-in health check endpoint at `/health`

### Resource Allocation

Recommended resource allocation for production:

- **CPU**: 1-2 cores
- **Memory**: 1-2GB RAM
- **Disk**: Depends on database size, start with 10GB

Example Docker Compose configuration with resource limits:

```yaml
services:
  api:
    image: ghcr.io/rollercoaster-dev/openbadges-modular-server:latest
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
    # ... other configuration
```

## Troubleshooting

### Common Issues

#### Container Fails to Start

Check the container logs:

```bash
docker logs <container-id>
```

Common issues:
- Database connection problems
- Invalid environment variables
- Insufficient permissions

#### Database Connection Issues

If the API can't connect to the database:

1. Check that the database service is running
2. Verify the connection string is correct
3. Ensure the database exists and is accessible
4. Check that the database user has the necessary permissions

#### Authentication Problems

If authentication is not working:

1. Verify that `AUTH_ENABLED` is set to `true`
2. Check that the JWT secret is properly set
3. Ensure the authentication method is enabled (API key, basic auth, OAuth2)
4. Verify the credentials are correct

For more troubleshooting information, see the [Troubleshooting Guide](./troubleshooting-guide.md).
