# Docker Setup for Open Badges API

This document describes the Docker setup for the Open Badges API.

## Overview

The Open Badges API uses Docker and Docker Compose for containerization. The setup includes:

1. **API Service**: The main application service that runs the API
2. **Database Service**: A PostgreSQL database service (optional)
3. **Migrations Service**: A service that runs database migrations

## Configuration

### Environment Variables

The Docker setup uses environment variables for configuration. The main environment variables are:

- `PORT`: The port the API listens on (default: 3000)
- `HOST`: The host the API binds to (default: 0.0.0.0)
- `NODE_ENV`: The environment mode (development, production, test)
- `DB_TYPE`: The database type (sqlite, postgresql)
- `SQLITE_FILE`: The path to the SQLite database file (for SQLite)
- `DATABASE_URL`: The PostgreSQL connection string (for PostgreSQL)
- `BASE_URL`: The base URL for the API

### Database Configuration

The Docker setup supports both SQLite and PostgreSQL databases:

#### SQLite (Default)

```yaml
environment:
  - DB_TYPE=sqlite
  - SQLITE_FILE=/data/sqlite.db
volumes:
  - sqlite_data:/data
```

#### PostgreSQL

```yaml
environment:
  - DB_TYPE=postgresql
  - DATABASE_URL=postgres://postgres:postgres@db:5432/openbadges
depends_on:
  - db
```

## Services

### API Service

The API service runs the main application. It includes:

- The compiled application code
- The database migration scripts
- The Drizzle ORM configuration

The service automatically runs migrations before starting the application.

### Database Service

The database service runs PostgreSQL. It's only needed if you're using PostgreSQL as your database.

### Migrations Service

The migrations service runs database migrations separately from the API service. This is useful for:

- Running migrations before the API service starts
- Running migrations manually
- Running migrations in a CI/CD pipeline

## Volumes

The Docker setup uses volumes to persist data:

- `sqlite_data`: Stores the SQLite database file
- `postgres_data`: Stores the PostgreSQL data

## Usage

### Starting the Services

```bash
# Start all services
docker-compose up

# Start only the API service
docker-compose up api

# Start only the migrations service
docker-compose up migrations
```

### Running Migrations

```bash
# Run migrations using the migrations service
docker-compose run migrations
```

### Accessing the API

The API is accessible at `http://localhost:3000`.

## Production Deployment

For production deployment, consider:

1. Using environment variables for sensitive information
2. Setting up proper logging
3. Configuring health checks
4. Setting up monitoring
5. Using a reverse proxy (e.g., Nginx) for SSL termination

## Troubleshooting

### Database Connection Issues

If the API service can't connect to the database:

1. Check that the database service is running
2. Check the database connection string
3. Check that the database exists
4. Check that the migrations have run successfully

### Migration Issues

If migrations fail:

1. Check the migration logs
2. Check that the database exists and is accessible
3. Check that the migration files are correct
4. Try running migrations manually
