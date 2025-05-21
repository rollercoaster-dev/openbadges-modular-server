# Database Connection Guide

This guide provides step-by-step instructions for connecting the Open Badges Modular Server to existing database instances, including required schema, permissions, and configuration examples.

## Table of Contents

1. [Overview](#overview)
2. [PostgreSQL Connection](#postgresql-connection)
3. [SQLite Connection](#sqlite-connection)
4. [Required Database Schema](#required-database-schema)
5. [Configuration Examples](#configuration-examples)
6. [Troubleshooting](#troubleshooting)

## Overview

The Open Badges Modular Server supports two database backends:

- **PostgreSQL**: Recommended for production deployments
- **SQLite**: Suitable for development, testing, or small deployments

The server uses [Drizzle ORM](https://orm.drizzle.team/) to interact with the database and automatically runs migrations to create or update the required schema.

## PostgreSQL Connection

### Prerequisites

- PostgreSQL 12 or higher
- A database user with appropriate permissions
- Network connectivity between the server and the database

### Connection Steps

1. **Create a database and user** (if not already existing):

   ```sql
   -- Connect to PostgreSQL
   psql -U postgres

   -- Create a dedicated user
   CREATE USER openbadges WITH PASSWORD 'your_secure_password';

   -- Create a database
   CREATE DATABASE openbadges;

   -- Grant privileges
   GRANT ALL PRIVILEGES ON DATABASE openbadges TO openbadges;
   ```

2. **Configure the server** to use PostgreSQL:

   ```
   DB_TYPE=postgresql
   DATABASE_URL=postgres://openbadges:your_secure_password@hostname:5432/openbadges
   ```

   Alternatively, you can specify individual connection parameters:

   ```
   DB_TYPE=postgresql
   PG_HOST=hostname
   PG_PORT=5432
   PG_USER=openbadges
   PG_PASSWORD=your_secure_password
   PG_DATABASE=openbadges
   ```

3. **Run migrations** to create the schema:

   ```bash
   # Using the CLI
   DB_TYPE=postgresql DATABASE_URL=postgres://openbadges:your_secure_password@hostname:5432/openbadges bun run db:migrate

   # Using Docker
   docker run --rm \
     -e DB_TYPE=postgresql \
     -e DATABASE_URL=postgres://openbadges:your_secure_password@hostname:5432/openbadges \
     ghcr.io/rollercoaster-dev/openbadges-modular-server:latest \
     bun run db:migrate
   ```

### Required Permissions

The database user needs the following permissions:

- `CREATE TABLE`: For running migrations
- `ALTER TABLE`: For schema modifications during migrations
- `CREATE INDEX`: For creating indexes
- `SELECT`, `INSERT`, `UPDATE`, `DELETE`: For normal operations

For a minimal permissions setup (after initial migration):

```sql
-- Connect to the database
\c openbadges

-- Grant minimal permissions to a read-write user
GRANT CONNECT ON DATABASE openbadges TO openbadges_user;
GRANT USAGE ON SCHEMA public TO openbadges_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO openbadges_user;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO openbadges_user;
```

## SQLite Connection

### Prerequisites

- Write access to the directory where the SQLite file will be stored
- SQLite 3.x (included with the server)

### Connection Steps

1. **Decide on a location** for your SQLite database file:

   ```
   # Local file in the current directory
   SQLITE_FILE=./openbadges.sqlite

   # Absolute path
   SQLITE_FILE=/path/to/openbadges.sqlite
   ```

2. **Configure the server** to use SQLite:

   ```
   DB_TYPE=sqlite
   SQLITE_FILE=/path/to/openbadges.sqlite
   ```

3. **Run migrations** to create the schema:

   ```bash
   # Using the CLI
   DB_TYPE=sqlite SQLITE_FILE=/path/to/openbadges.sqlite bun run db:migrate

   # Using Docker
   docker run --rm \
     -v /host/path:/data \
     -e DB_TYPE=sqlite \
     -e SQLITE_FILE=/data/openbadges.sqlite \
     ghcr.io/rollercoaster-dev/openbadges-modular-server:latest \
     bun run db:migrate
   ```

### Required Permissions

For SQLite, the permissions are file system based:

- The process running the server needs read and write access to the SQLite file
- The process needs write access to the directory containing the file (for journal files)

## Required Database Schema

The Open Badges Modular Server requires the following core tables:

- `issuers`: Stores issuer information
- `badge_classes`: Stores badge class definitions
- `assertions`: Stores badge assertions
- `users`: Stores user information
- `api_keys`: Stores API keys

The complete schema is created automatically by the migration process. You don't need to create tables manually.

## Configuration Examples

### Docker with External PostgreSQL

```yaml
# docker-compose.yml
version: '3.8'

services:
  api:
    image: ghcr.io/rollercoaster-dev/openbadges-modular-server:latest
    environment:
      - DB_TYPE=postgresql
      - DATABASE_URL=postgres://openbadges:your_secure_password@db.example.com:5432/openbadges
    ports:
      - "3000:3000"
```

### Docker with External SQLite

```yaml
# docker-compose.yml
version: '3.8'

services:
  api:
    image: ghcr.io/rollercoaster-dev/openbadges-modular-server:latest
    environment:
      - DB_TYPE=sqlite
      - SQLITE_FILE=/data/openbadges.sqlite
    volumes:
      - /path/on/host:/data
    ports:
      - "3000:3000"
```

### Environment Variables for PostgreSQL Connection

```
# Basic connection
DB_TYPE=postgresql
DATABASE_URL=postgres://username:password@hostname:5432/database

# Connection with SSL
DB_TYPE=postgresql
DATABASE_URL=postgres://username:password@hostname:5432/database?sslmode=require

# Connection with individual parameters
DB_TYPE=postgresql
PG_HOST=hostname
PG_PORT=5432
PG_USER=username
PG_PASSWORD=password
PG_DATABASE=database

# Connection with pool configuration
DB_TYPE=postgresql
DATABASE_URL=postgres://username:password@hostname:5432/database
PG_POOL_MAX=20
PG_POOL_IDLE_TIMEOUT=30
```

### Environment Variables for SQLite Connection

```
# Basic connection
DB_TYPE=sqlite
SQLITE_FILE=./openbadges.sqlite

# Connection with performance options
DB_TYPE=sqlite
SQLITE_FILE=./openbadges.sqlite
SQLITE_BUSY_TIMEOUT=5000
SQLITE_SYNC_MODE=NORMAL
SQLITE_CACHE_SIZE=10000
```

## Troubleshooting

### Common PostgreSQL Issues

1. **Connection Refused**
   - Ensure PostgreSQL is running
   - Check network connectivity
   - Verify firewall settings
   - Confirm PostgreSQL is configured to accept remote connections

2. **Authentication Failed**
   - Verify username and password
   - Check `pg_hba.conf` for authentication settings
   - Ensure the user has access to the database

3. **Permission Denied**
   - Verify the user has appropriate permissions
   - Check schema ownership
   - Ensure the user can create tables (for migrations)

4. **Database Does Not Exist**
   - Create the database before connecting
   - Verify the database name in the connection string

### Common SQLite Issues

1. **File Not Found**
   - Ensure the directory exists
   - Check file path is correct
   - Verify the process has access to the specified location

2. **Permission Denied**
   - Check file and directory permissions
   - Ensure the process has write access

3. **Database Locked**
   - Increase `SQLITE_BUSY_TIMEOUT`
   - Ensure no other process is using the database
   - Check for lingering journal files

### Diagnosing Connection Issues

Enable detailed logging to diagnose connection issues:

```
DB_QUERY_LOGGING=true
LOG_LEVEL=debug
```

For Docker deployments, check the container logs:

```bash
docker logs <container-id>
```

### Migration Issues

If migrations fail:

1. Check database connection
2. Verify user permissions
3. Ensure the database is accessible
4. Check for conflicting schema

To manually run migrations:

```bash
# For PostgreSQL
DB_TYPE=postgresql DATABASE_URL=postgres://username:password@hostname:5432/database bun run db:migrate

# For SQLite
DB_TYPE=sqlite SQLITE_FILE=/path/to/database.sqlite bun run db:migrate
```
