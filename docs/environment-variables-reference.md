# Environment Variables Reference

This document provides a comprehensive reference for all environment variables supported by the Open Badges Modular Server. Use this guide to configure your server deployment for different environments and scenarios.

## Table of Contents

1. [Server Configuration](#server-configuration)
2. [Database Configuration](#database-configuration)
3. [Authentication Configuration](#authentication-configuration)
4. [Logging Configuration](#logging-configuration)
5. [Cache Configuration](#cache-configuration)
6. [Asset Storage Configuration](#asset-storage-configuration)
7. [Open Badges Configuration](#open-badges-configuration)
8. [Example Configurations](#example-configurations)

## Server Configuration

These variables control the basic server settings.

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PORT` | Port the server listens on | `3000` | No |
| `HOST` | Host the server binds to | `0.0.0.0` | No |
| `NODE_ENV` | Environment mode (`development`, `production`, `test`) | `development` | No |
| `BASE_URL` | Public URL of the server | `http://localhost:3000` | No |

## Database Configuration

These variables control the database connection and behavior.

### General Database Settings

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `DB_TYPE` | Database type (`sqlite` or `postgresql`) | `sqlite` | No |
| `DB_QUERY_LOGGING` | Enable query logging | `true` | No |
| `DB_SLOW_QUERY_THRESHOLD` | Threshold for slow query logging (ms) | `100` | No |
| `DB_MAX_QUERY_LOGS` | Maximum number of query logs to retain | `1000` | No |
| `DB_USE_PREPARED_STATEMENTS` | Use prepared statements | `true` | No |
| `DB_DEFAULT_PAGE_SIZE` | Default page size for paginated queries | `20` | No |
| `DB_MAX_PAGE_SIZE` | Maximum page size for paginated queries | `100` | No |
| `DB_SAVE_QUERY_LOGS_ON_SHUTDOWN` | Save query logs on shutdown | `false` | No |

### Connection Retry Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `DB_MAX_CONNECTION_ATTEMPTS` | Maximum connection attempts | `5` | No |
| `DB_CONNECTION_RETRY_DELAY_MS` | Delay between connection attempts (ms) | `1000` | No |

### SQLite Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `SQLITE_FILE` or `SQLITE_DB_PATH` | Path to SQLite database file | `:memory:` | No |
| `SQLITE_BUSY_TIMEOUT` | Busy timeout in milliseconds | `5000` | No |
| `SQLITE_SYNC_MODE` | Synchronous mode (`OFF`, `NORMAL`, `FULL`, `EXTRA`) | `NORMAL` | No |
| `SQLITE_CACHE_SIZE` | Cache size in pages | `10000` | No |

### PostgreSQL Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `DATABASE_URL` | PostgreSQL connection string | None | Yes, if `DB_TYPE=postgresql` |
| `PG_HOST` | PostgreSQL host | `localhost` | No |
| `PG_PORT` | PostgreSQL port | `5432` | No |
| `PG_USER` | PostgreSQL username | `postgres` | No |
| `PG_PASSWORD` | PostgreSQL password | `postgres` | No |
| `PG_DATABASE` | PostgreSQL database name | `openbadges` | No |
| `PG_POOL_MAX` | Maximum connections in the pool | `20` | No |
| `PG_POOL_IDLE_TIMEOUT` | Idle timeout in seconds | `30` | No |
| `PG_POOL_CONNECTION_TIMEOUT` | Connection timeout in seconds | `10` | No |

## Authentication Configuration

These variables control the authentication system.

### General Authentication Settings

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `AUTH_ENABLED` | Enable authentication | `true` | No |
| `AUTH_DISABLE_RBAC` | Disable role-based access control | `false` | No |
| `AUTH_PUBLIC_PATHS` | Comma-separated list of public paths | `/docs,/swagger,/health,/public` | No |

### JWT Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `JWT_SECRET` | Secret for JWT signing | Random in dev, required in prod | Yes, in production |
| `JWT_TOKEN_EXPIRY_SECONDS` | JWT token expiry in seconds | `3600` | No |
| `JWT_ISSUER` | JWT issuer claim | `BASE_URL` or `http://localhost:3000` | No |

### Admin User Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `AUTH_ADMIN_USER_ENABLED` | Enable admin user | `false` | No |
| `AUTH_ADMIN_USERNAME` | Admin username | `admin` | No |
| `AUTH_ADMIN_EMAIL` | Admin email | `admin@example.com` | No |
| `AUTH_ADMIN_PASSWORD` | Admin password | None | Yes, if admin user enabled |

### API Key Authentication

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `AUTH_API_KEY_ENABLED` | Enable API key authentication | `true` | No |
| `AUTH_API_KEY_<NAME>` | API key definition | None | No |

Format for API key definition: `<key>:<user-id>:<description>`

Example: `AUTH_API_KEY_SYSTEM=abc123:system-user:System integration`

### Basic Authentication

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `AUTH_BASIC_AUTH_ENABLED` | Enable basic authentication | `true` | No |
| `AUTH_BASIC_AUTH_<USERNAME>` | Basic auth credentials | None | No |

Format for basic auth credentials: `<password>:<user-id>:<role>`

Example: `AUTH_BASIC_AUTH_ADMIN=securepass:admin-user:admin`

### OAuth2 Authentication

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `AUTH_OAUTH2_ENABLED` | Enable OAuth2 authentication | `false` | No |
| `AUTH_OAUTH2_JWKS_URI` | URI for JWKS (for token validation) | None | Yes, if OAuth2 enabled |
| `AUTH_OAUTH2_INTROSPECTION_ENDPOINT` | Token introspection endpoint | None | No |
| `AUTH_OAUTH2_CLIENT_ID` | OAuth2 client ID | None | No |
| `AUTH_OAUTH2_CLIENT_SECRET` | OAuth2 client secret | None | No |
| `AUTH_OAUTH2_USER_ID_CLAIM` | Claim to use as user ID | `sub` | No |
| `AUTH_OAUTH2_AUDIENCE` | Expected audience value | None | No |
| `AUTH_OAUTH2_ISSUER` | Expected issuer value | None | No |

## Logging Configuration

These variables control the logging system.

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `LOG_LEVEL` | Log level (`debug`, `info`, `warn`, `error`) | `info` | No |
| `LOG_FORMAT` | Log format (`json`, `pretty`) | `json` in production, `pretty` otherwise | No |
| `LOG_TIMESTAMP` | Include timestamp in logs | `true` | No |
| `LOG_COLORIZE` | Colorize logs (only for `pretty` format) | `true` in development | No |
| `LOG_INCLUDE_CONTEXT` | Include context in logs | `true` | No |
| `LOG_REDACT_SENSITIVE` | Redact sensitive information | `true` | No |
| `LOG_TO_FILE` | Log to file | `false` | No |
| `LOG_FILE_PATH` | Path to log file | `logs/server.log` | No |
| `LOG_MAX_SIZE` | Maximum log file size before rotation | `10m` | No |
| `LOG_MAX_FILES` | Maximum number of log files to keep | `5` | No |

## Cache Configuration

These variables control the caching system.

### General Cache Settings

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `CACHE_ENABLED` | Enable caching | `true` | No |
| `CACHE_MAX_ITEMS` | Maximum number of items in the cache | `5000` | No |
| `CACHE_TTL` | Default time-to-live in seconds | `3600` | No |

### Entity-Specific Cache Settings

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `CACHE_ISSUER_MAX_ITEMS` | Maximum number of issuer items | `500` | No |
| `CACHE_ISSUER_TTL` | Issuer cache TTL in seconds | `7200` | No |
| `CACHE_BADGE_CLASS_MAX_ITEMS` | Maximum number of badge class items | `1000` | No |
| `CACHE_BADGE_CLASS_TTL` | Badge class cache TTL in seconds | `3600` | No |
| `CACHE_ASSERTION_MAX_ITEMS` | Maximum number of assertion items | `2000` | No |
| `CACHE_ASSERTION_TTL` | Assertion cache TTL in seconds | `1800` | No |

## Asset Storage Configuration

These variables control the asset storage system.

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `ASSETS_STORAGE_TYPE` | Storage type (`local`, `s3`) | `local` | No |
| `ASSETS_LOCAL_DIR` | Local directory for asset storage | `uploads` | No |
| `ASSETS_MAX_FILE_SIZE` | Maximum file size in bytes | `5242880` (5MB) | No |
| `ASSETS_ALLOWED_TYPES` | Comma-separated list of allowed MIME types | `image/png,image/jpeg,image/svg+xml` | No |
| `ASSETS_S3_BUCKET` | S3 bucket name | None | Yes, if `ASSETS_STORAGE_TYPE=s3` |
| `ASSETS_S3_REGION` | S3 region | None | Yes, if `ASSETS_STORAGE_TYPE=s3` |
| `ASSETS_S3_ACCESS_KEY` | S3 access key | None | Yes, if `ASSETS_STORAGE_TYPE=s3` |
| `ASSETS_S3_SECRET_KEY` | S3 secret key | None | Yes, if `ASSETS_STORAGE_TYPE=s3` |
| `ASSETS_S3_PREFIX` | S3 key prefix | `assets/` | No |

## Open Badges Configuration

These variables control the Open Badges implementation.

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `OB_VERSION` | Open Badges version | `3.0` | No |
| `OB_CONTEXT` | Open Badges context URL | Version-specific default | No |
| `OB_VERIFICATION_TYPE` | Verification type | `HostedBadge` | No |
| `OB_REVOCATION_LIST_URL` | Revocation list URL | `${BASE_URL}/revocations` | No |
| `OB_ENABLE_BAKING` | Enable badge baking | `true` | No |
| `OB_ENABLE_SIGNING` | Enable badge signing | `false` | No |
| `OB_SIGNING_KEY` | Path to signing key | None | Yes, if `OB_ENABLE_SIGNING=true` |

## Example Configurations

### Development with SQLite

```dotenv
# Server configuration
PORT=3000
HOST=localhost
NODE_ENV=development
BASE_URL=http://localhost:3000

# Database configuration
DB_TYPE=sqlite
SQLITE_FILE=./dev.sqlite

# Authentication configuration
AUTH_ENABLED=true
JWT_SECRET=dev-secret-do-not-use-in-production
AUTH_BASIC_AUTH_ENABLED=true
AUTH_BASIC_AUTH_ADMIN=admin:admin-user:admin

# Logging configuration
LOG_LEVEL=debug
LOG_FORMAT=pretty
LOG_COLORIZE=true
```

### Production with PostgreSQL

```dotenv
# Server configuration
PORT=3000
HOST=0.0.0.0
NODE_ENV=production
BASE_URL=https://badges.example.com

# Database configuration
DB_TYPE=postgresql
DATABASE_URL=postgres://openbadges:secure-password@db.example.com:5432/openbadges
DB_MAX_CONNECTION_ATTEMPTS=10
DB_CONNECTION_RETRY_DELAY_MS=2000

# Authentication configuration
AUTH_ENABLED=true
JWT_SECRET=your-secure-production-secret
JWT_TOKEN_EXPIRY_SECONDS=3600
AUTH_API_KEY_ENABLED=true
AUTH_API_KEY_SYSTEM=your-api-key:system-user:System integration

# Logging configuration
LOG_LEVEL=info
LOG_FORMAT=json
LOG_TO_FILE=true
LOG_FILE_PATH=/var/log/openbadges/server.log
LOG_MAX_SIZE=50m
LOG_MAX_FILES=10

# Cache configuration
CACHE_ENABLED=true
CACHE_MAX_ITEMS=10000
CACHE_TTL=3600

# Asset storage configuration
ASSETS_STORAGE_TYPE=s3
ASSETS_S3_BUCKET=your-badge-assets
ASSETS_S3_REGION=us-west-2
ASSETS_S3_ACCESS_KEY=your-access-key
ASSETS_S3_SECRET_KEY=your-secret-key
```

### Docker Compose Example

```yaml
version: '3.8'
services:
  api:
    image: ghcr.io/rollercoaster-dev/openbadges-modular-server:latest
    environment:
      # Server configuration
      - PORT=3000
      - HOST=0.0.0.0
      - NODE_ENV=production
      - BASE_URL=https://badges.example.com
      
      # Database configuration
      - DB_TYPE=postgresql
      - DATABASE_URL=postgres://postgres:postgres@db:5432/openbadges
      
      # Authentication configuration
      - AUTH_ENABLED=true
      - JWT_SECRET=your-secure-production-secret
      - AUTH_API_KEY_ENABLED=true
      - AUTH_API_KEY_SYSTEM=your-api-key:system-user:System integration
      
      # Logging configuration
      - LOG_LEVEL=info
      - LOG_FORMAT=json
      
      # Cache configuration
      - CACHE_ENABLED=true
      - CACHE_MAX_ITEMS=10000
    ports:
      - "3000:3000"
    depends_on:
      - db
      
  db:
    image: postgres:14-alpine
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=openbadges
    volumes:
      - postgres_data:/var/lib/postgresql/data
      
volumes:
  postgres_data:
```
