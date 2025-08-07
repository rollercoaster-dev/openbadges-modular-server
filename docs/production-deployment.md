# Production Deployment Guide

This document provides instructions for deploying the Open Badges API in a production environment.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Deployment Options](#deployment-options)
3. [Environment Variables](#environment-variables)
4. [Database Configuration](#database-configuration)
5. [Backup and Restore](#backup-and-restore)
6. [Performance Tuning](#performance-tuning)
7. [Monitoring](#monitoring)
8. [Security Considerations](#security-considerations)

## Prerequisites

- Docker and Docker Compose installed
- Git for cloning the repository
- Basic understanding of containerization and Docker
- Access to a server with sufficient resources (recommended: 2 CPU cores, 2GB RAM minimum)

## Deployment Options

### Option 1: Docker Compose (Recommended)

1. Clone the repository:
   ```bash
   git clone https://github.com/your-org/openbadges-modular-server.git
   cd openbadges-modular-server
   ```

2. Create a `.env` file with your configuration (see [Environment Variables](#environment-variables))

3. Deploy using Docker Compose:
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

### Option 2: Kubernetes

For Kubernetes deployment, we provide Helm charts in the `kubernetes/` directory. Refer to the Kubernetes-specific documentation for details.

## Environment Variables

The following environment variables can be set to configure the application:

### Server Configuration
- `PORT`: Server port (default: 3000)
- `HOST`: Server host (default: 0.0.0.0)
- `NODE_ENV`: Environment (set to "production")
- `BASE_URL`: Public URL of the API (default: http://localhost:3000)

### Database Configuration
- `DB_TYPE`: Database type ("sqlite" or "postgresql", default: "sqlite")
- `SQLITE_FILE`: SQLite database file path (default: "/data/sqlite.db")
- `SQLITE_BUSY_TIMEOUT`: SQLite busy timeout in ms (default: 10000)
- `SQLITE_SYNC_MODE`: SQLite synchronization mode (default: "NORMAL")
- `SQLITE_CACHE_SIZE`: SQLite cache size (default: 20000)
- `DATABASE_URL`: PostgreSQL connection string (default: "postgres://postgres:postgres@db:5432/openbadges")
- `POSTGRES_USER`: PostgreSQL username (default: "postgres")
- `POSTGRES_PASSWORD`: PostgreSQL password (default: "postgres")
- `POSTGRES_DB`: PostgreSQL database name (default: "openbadges")
- `POSTGRES_PORT`: PostgreSQL port (default: 5432)

### Query Optimization
- `DB_QUERY_LOGGING`: Enable query logging (default: "true")
- `DB_SLOW_QUERY_THRESHOLD`: Slow query threshold in ms (default: 200)
- `DB_MAX_QUERY_LOGS`: Maximum number of query logs to keep (default: 2000)
- `DB_USE_PREPARED_STATEMENTS`: Use prepared statements (default: "true")
- `DB_DEFAULT_PAGE_SIZE`: Default page size for pagination (default: 20)
- `DB_MAX_PAGE_SIZE`: Maximum page size for pagination (default: 100)
- `DB_SAVE_QUERY_LOGS_ON_SHUTDOWN`: Save query logs on shutdown (default: "true")

### Cache Configuration
- `CACHE_ENABLED`: Enable caching (default: "true")
- `CACHE_MAX_ITEMS`: Maximum number of items in cache (default: 5000)
- `CACHE_TTL`: Default cache TTL in seconds (default: 3600)
- `CACHE_ISSUER_MAX_ITEMS`: Maximum number of issuer items in cache (default: 1000)
- `CACHE_ISSUER_TTL`: Issuer cache TTL in seconds (default: 7200)
- `CACHE_BADGE_CLASS_MAX_ITEMS`: Maximum number of badge class items in cache (default: 2000)
- `CACHE_BADGE_CLASS_TTL`: Badge class cache TTL in seconds (default: 3600)
- `CACHE_ASSERTION_MAX_ITEMS`: Maximum number of assertion items in cache (default: 5000)
- `CACHE_ASSERTION_TTL`: Assertion cache TTL in seconds (default: 1800)

## Database Configuration

### SQLite (Default)

SQLite is the default database and requires minimal configuration. It's suitable for small to medium deployments.

Key configuration options:
- `SQLITE_FILE`: Path to the SQLite database file
- `SQLITE_BUSY_TIMEOUT`: Timeout for busy connections
- `SQLITE_SYNC_MODE`: Synchronization mode (NORMAL, FULL, OFF)
- `SQLITE_CACHE_SIZE`: Cache size for SQLite

### PostgreSQL

For larger deployments, PostgreSQL is recommended. It provides better concurrency and scalability.

Key configuration options:
- `DATABASE_URL`: PostgreSQL connection string
- `POSTGRES_USER`: PostgreSQL username
- `POSTGRES_PASSWORD`: PostgreSQL password
- `POSTGRES_DB`: PostgreSQL database name

The PostgreSQL configuration file (`docker/postgres/postgresql.conf`) is optimized for production use. You can adjust the settings based on your server resources.

## Backup and Restore

### Automated Backups

The production Docker Compose configuration includes an automated backup service that runs daily. Backups are stored in the `backups/` directory.

To configure backups:
- `BACKUP_RETENTION_DAYS`: Number of days to keep backups (default: 7)

### Manual Backup

To manually create a backup:

```bash
docker-compose -f docker-compose.prod.yml run --rm backup
```

### Restore from Backup

To restore from a backup:

1. Stop the API service:
   ```bash
   docker-compose -f docker-compose.prod.yml stop api
   ```

2. Run the restore script:
   ```bash
   docker-compose -f docker-compose.prod.yml run --rm -v ./backups:/backups backup /scripts/restore.sh /backups/your-backup-file.gz
   ```

3. Restart the API service:
   ```bash
   docker-compose -f docker-compose.prod.yml start api
   ```

## Performance Tuning

### Database Performance

#### SQLite
- Increase `SQLITE_CACHE_SIZE` for better performance (default: 20000)
- Set `SQLITE_SYNC_MODE` to "NORMAL" for a balance of safety and performance
- Use `SQLITE_BUSY_TIMEOUT` to handle concurrent access (default: 10000ms)

#### PostgreSQL
- Adjust `shared_buffers` in postgresql.conf based on available memory
- Increase `work_mem` for complex queries
- Adjust `max_connections` based on expected load

### Caching

- Enable caching with `CACHE_ENABLED=true`
- Adjust cache sizes based on your data volume:
  - `CACHE_MAX_ITEMS`: Overall cache size
  - `CACHE_ISSUER_MAX_ITEMS`: Issuer cache size
  - `CACHE_BADGE_CLASS_MAX_ITEMS`: Badge class cache size
  - `CACHE_ASSERTION_MAX_ITEMS`: Assertion cache size

- Adjust TTL (Time To Live) values based on data update frequency:
  - `CACHE_TTL`: Default TTL in seconds
  - `CACHE_ISSUER_TTL`: Issuer TTL
  - `CACHE_BADGE_CLASS_TTL`: Badge class TTL
  - `CACHE_ASSERTION_TTL`: Assertion TTL

### Container Resources

Adjust the resource limits in `docker-compose.prod.yml` based on your server capacity:

```yaml
deploy:
  resources:
    limits:
      cpus: '1'
      memory: 1G
    reservations:
      cpus: '0.5'
      memory: 512M
```

## Monitoring

### Health Check Endpoint

The API provides a health check endpoint at `/health` that returns detailed information about the system status.

Example health check response:
```json
{
  "status": "ok",
  "timestamp": "2023-10-15T12:34:56.789Z",
  "uptime": 3600,
  "database": {
    "type": "sqlite",
    "connected": true,
    "responseTime": "5ms",
    "metrics": { ... }
  },
  "cache": {
    "enabled": true,
    "stats": { ... }
  },
  "queries": {
    "enabled": true,
    "stats": { ... },
    "slowQueries": [ ... ]
  },
  "memory": { ... },
  "environment": "production",
  "version": "1.0.0"
}
```

### Container Health Checks

The Docker containers include health checks that monitor the system status. You can view the health status with:

```bash
docker-compose -f docker-compose.prod.yml ps
```

## Security Considerations

### Database Credentials

Store database credentials securely using environment variables or Docker secrets. Never commit credentials to the repository.

### Network Security

- Use a reverse proxy (like Nginx) in front of the API
- Enable HTTPS with proper certificates
- Configure appropriate CORS settings
  - Set `CORS_ORIGINS` with allowed domains (comma-separated)
  - Confirm non-listed origins are blocked in production

### Data Protection

- Enable regular backups
- Test restore procedures periodically
- Consider encrypting sensitive data

### Access Control

- Implement proper authentication and authorization
- Use API keys or JWT tokens for API access
- Limit access to administrative endpoints
