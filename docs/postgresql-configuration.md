# PostgreSQL Configuration Guide

This document provides detailed information on configuring the OpenBadges Modular Server to work with PostgreSQL.

## Prerequisites

Before configuring the server to use PostgreSQL, ensure you have:

1. PostgreSQL server installed and running (version 12 or higher recommended)
2. A database created for the OpenBadges Modular Server
3. A user with appropriate permissions for the database

## Environment Variables

The following environment variables are used to configure PostgreSQL:

| Variable | Description | Required | Default | Example |
|----------|-------------|----------|---------|---------|
| `DB_TYPE` | Set to `postgresql` to use PostgreSQL | Yes | `sqlite` | `postgresql` |
| `DATABASE_URL` | PostgreSQL connection string | Yes when `DB_TYPE=postgresql` | None | `postgres://user:password@localhost:5432/openbadges` |

### Connection String Format

The `DATABASE_URL` should follow this format:
```
postgres://USERNAME:PASSWORD@HOST:PORT/DATABASE_NAME
```

Where:
- `USERNAME`: PostgreSQL user with access to the database
- `PASSWORD`: Password for the PostgreSQL user
- `HOST`: Hostname or IP address of the PostgreSQL server
- `PORT`: Port number for PostgreSQL (default is 5432)
- `DATABASE_NAME`: Name of the database to use

### Connection Pool Configuration

The server uses connection pooling for PostgreSQL. The following settings are used:

| Setting | Value | Description |
|---------|-------|-------------|
| `max` | 20 | Maximum number of connections in the pool |
| `idle_timeout` | 30 | Close idle connections after 30 seconds |
| `connect_timeout` | 10 | Connection timeout in seconds |
| `max_lifetime` | 3600 | Maximum connection lifetime in seconds (1 hour) |

These settings are configured in the `RepositoryFactory` and are not currently customizable via environment variables.

## Optional Database Settings

The following optional settings can be configured:

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `DB_QUERY_LOGGING` | Enable/disable query logging | `true` | `true` or `false` |
| `DB_SLOW_QUERY_THRESHOLD` | Threshold for logging slow queries (ms) | `100` | `200` |
| `DB_MAX_QUERY_LOGS` | Maximum number of query logs to retain | `1000` | `500` |
| `DB_MAX_CONNECTION_ATTEMPTS` | Maximum number of connection attempts | `5` | `10` |
| `DB_CONNECTION_RETRY_DELAY_MS` | Delay between connection attempts (ms) | `1000` | `2000` |
| `DB_USE_PREPARED_STATEMENTS` | Use prepared statements for queries | `true` | `true` or `false` |
| `DB_DEFAULT_PAGE_SIZE` | Default page size for paginated queries | `20` | `50` |
| `DB_MAX_PAGE_SIZE` | Maximum page size for paginated queries | `100` | `200` |
| `DB_SAVE_QUERY_LOGS_ON_SHUTDOWN` | Save query logs when server shuts down | `false` | `true` or `false` |

## Setting Up PostgreSQL

### Local Development

1. Install PostgreSQL:
   ```bash
   # Ubuntu/Debian
   sudo apt-get update
   sudo apt-get install postgresql postgresql-contrib

   # macOS with Homebrew
   brew install postgresql
   brew services start postgresql
   ```

2. Create a database and user:
   ```bash
   sudo -u postgres psql
   ```

   In the PostgreSQL prompt:
   ```sql
   CREATE DATABASE openbadges;
   CREATE USER openbadges_user WITH ENCRYPTED PASSWORD 'your_secure_password';
   GRANT ALL PRIVILEGES ON DATABASE openbadges TO openbadges_user;
   \q
   ```

3. Configure environment variables:
   ```
   DB_TYPE=postgresql
   DATABASE_URL=postgres://openbadges_user:your_secure_password@localhost:5432/openbadges
   ```

### Docker Development

If you're using Docker for development, you can use the following Docker Compose configuration:

```yaml
version: '3'
services:
  postgres:
    image: postgres:14
    environment:
      POSTGRES_USER: openbadges_user
      POSTGRES_PASSWORD: your_secure_password
      POSTGRES_DB: openbadges
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

Then configure your environment variables:
```
DB_TYPE=postgresql
DATABASE_URL=postgres://openbadges_user:your_secure_password@localhost:5432/openbadges
```

## Running Migrations

After configuring PostgreSQL, you need to run migrations to create the necessary tables:

```bash
npm run db:migrate:pg
# or
bun run db:migrate:pg
```

## Troubleshooting

### Connection Issues

If you encounter connection issues:

1. Verify PostgreSQL is running:
   ```bash
   # For systemd-based systems
   sudo systemctl status postgresql
   
   # For macOS
   brew services list | grep postgresql
   ```

2. Check if you can connect to the database:
   ```bash
   psql -U openbadges_user -h localhost -d openbadges
   ```

3. Verify firewall settings if connecting to a remote PostgreSQL server.

### Migration Issues

If migrations fail:

1. Check the database user has sufficient permissions.
2. Ensure the database exists and is accessible.
3. Check for conflicting table names or schema issues.

## Performance Considerations

For optimal performance with PostgreSQL:

1. Ensure your PostgreSQL server is properly configured for your hardware.
2. Consider increasing the connection pool size for high-traffic applications.
3. Use indexes for frequently queried fields.
4. Monitor query performance and optimize slow queries.
