# Database Credential Management

This document provides guidelines for securely managing database credentials in the Open Badges API.

## Table of Contents

1. [Overview](#overview)
2. [Environment Variables](#environment-variables)
3. [Docker Secrets](#docker-secrets)
4. [Credential Rotation](#credential-rotation)
5. [Security Best Practices](#security-best-practices)

## Overview

The Open Badges API supports two database types:
- **SQLite**: File-based database that doesn't require credentials
- **PostgreSQL**: Client-server database that requires username and password

Proper credential management is essential for maintaining the security of your database, especially in production environments.

## Environment Variables

The simplest way to provide database credentials is through environment variables. These can be set in the `.env` file or passed directly to Docker Compose.

### PostgreSQL Credentials

The following environment variables are used for PostgreSQL credentials:

- `POSTGRES_USER`: PostgreSQL username (default: "postgres")
- `POSTGRES_PASSWORD`: PostgreSQL password (default: "postgres")
- `POSTGRES_DB`: PostgreSQL database name (default: "openbadges")
- `DATABASE_URL`: Full PostgreSQL connection string (default: "postgres://postgres:postgres@db:5432/openbadges")

Example `.env` file:
```
DB_TYPE=postgresql
POSTGRES_USER=openbadges_user
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=openbadges
DATABASE_URL=postgres://openbadges_user:your_secure_password@db:5432/openbadges
```

### Security Considerations

- Never commit the `.env` file to version control
- Use different credentials for development, staging, and production
- Generate strong, random passwords for production environments

## Docker Secrets

For production deployments, especially in Docker Swarm, it's recommended to use Docker Secrets instead of environment variables.

### Creating Docker Secrets

```bash
echo "your_secure_password" | docker secret create postgres_password -
```

### Using Docker Secrets in Docker Compose

```yaml
services:
  db:
    image: postgres:14-alpine
    environment:
      - POSTGRES_USER=openbadges_user
      - POSTGRES_DB=openbadges
    secrets:
      - postgres_password
    environment:
      - POSTGRES_PASSWORD_FILE=/run/secrets/postgres_password
    # ...

  api:
    # ...
    secrets:
      - postgres_password
    environment:
      - DB_TYPE=postgresql
      - POSTGRES_USER=openbadges_user
      - POSTGRES_PASSWORD_FILE=/run/secrets/postgres_password
      - POSTGRES_DB=openbadges
    # ...

secrets:
  postgres_password:
    external: true
```

## Credential Rotation

Regularly rotating database credentials is a security best practice. Here's how to rotate PostgreSQL credentials:

1. Create a new PostgreSQL user:
   ```sql
   CREATE USER new_user WITH PASSWORD 'new_password';
   GRANT ALL PRIVILEGES ON DATABASE openbadges TO new_user;
   ```

2. Update the application configuration with the new credentials:
   - If using environment variables, update the `.env` file
   - If using Docker Secrets, create new secrets and update the Docker Compose file

3. Restart the application to use the new credentials:
   ```bash
   docker-compose -f docker-compose.prod.yml down
   docker-compose -f docker-compose.prod.yml up -d
   ```

4. Verify that the application is working with the new credentials

5. Remove the old PostgreSQL user:
   ```sql
   REVOKE ALL PRIVILEGES ON DATABASE openbadges FROM old_user;
   DROP USER old_user;
   ```

## Security Best Practices

### Password Strength

- Use passwords with at least 16 characters
- Include a mix of uppercase, lowercase, numbers, and special characters
- Avoid dictionary words and common patterns
- Use a password generator for maximum security

Example of generating a secure password:
```bash
openssl rand -base64 24
```

### Access Control

- Create a dedicated database user for the application
- Grant only the necessary permissions to the user
- Use different users for different environments
- Restrict network access to the database server

### Monitoring and Auditing

- Enable logging of database access
- Monitor for suspicious login attempts
- Regularly audit database users and permissions
- Set up alerts for failed login attempts

### Encryption

- Use TLS/SSL for database connections
- Encrypt sensitive data at rest
- Use encrypted backups
- Consider using encrypted volumes for SQLite databases
