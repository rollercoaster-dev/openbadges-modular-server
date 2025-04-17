# Database Migrations

This document describes the database migration process for the Open Badges API.

## Overview

The Open Badges API uses [Drizzle ORM](https://orm.drizzle.team/) for database operations and [Drizzle Kit](https://orm.drizzle.team/kit-docs/overview) for database migrations. The system supports both SQLite and PostgreSQL databases.

## Migration Process

### Generating Migrations

When you make changes to the database schema (in `src/infrastructure/database/modules/sqlite/schema.ts` or `src/infrastructure/database/modules/postgresql/schema.ts`), you need to generate migration files:

```bash
# For SQLite (default)
bun run db:generate

# For PostgreSQL
DB_TYPE=postgresql bun run db:generate
```

This will create migration files in the `drizzle/migrations` directory for SQLite or `drizzle/pg-migrations` directory for PostgreSQL.

### Running Migrations

To apply migrations to the database:

```bash
# For SQLite (default)
bun run db:migrate

# For PostgreSQL
DB_TYPE=postgresql bun run db:migrate
```

This will run the migration script in `src/infrastructure/database/migrations/run.ts`, which will apply migrations for the specified database type.

### Viewing Database Schema

You can use Drizzle Kit Studio to view the database schema:

```bash
# For SQLite (default)
bun run db:studio

# For PostgreSQL
DB_TYPE=postgresql bun run db:studio
```

This will start a web server that allows you to browse the database schema and data.

## Docker Setup

The Docker setup includes a separate service for running migrations:

```bash
docker-compose up migrations
```

This will run the migrations and then exit. The main API service will also run migrations on startup.

## Configuration

The migration configuration is in `drizzle.config.ts` in the project root. It supports both SQLite and PostgreSQL databases based on the `DB_TYPE` environment variable.

```typescript
// Determine database type from environment variable or config
const dbType = process.env.DB_TYPE || config.database.type || 'sqlite';

// Configure based on database type
let drizzleConfig: Config;

if (dbType === 'postgresql') {
  // PostgreSQL configuration
  drizzleConfig = {
    dialect: 'postgresql',
    schema: './src/infrastructure/database/modules/postgresql/schema.ts',
    out: './drizzle/pg-migrations',
    dbCredentials: {
      host: 'localhost',
      port: 5432,
      user: 'postgres',
      password: 'postgres',
      database: 'openbadges',
    },
  };
} else {
  // SQLite configuration (default)
  drizzleConfig = {
    dialect: 'sqlite',
    schema: './src/infrastructure/database/modules/sqlite/schema.ts',
    out: './drizzle/migrations',
    dbCredentials: {
      url: 'sqlite.db',
    },
  };
}
```

## Best Practices

1. **Always generate migrations**: Never modify the database schema directly. Always use migrations.
2. **Test migrations**: Always test migrations in a development environment before applying them to production.
3. **Backup data**: Always backup your data before running migrations in production.
4. **Version control**: Keep migration files in version control.
5. **Idempotent migrations**: Make sure migrations are idempotent (can be run multiple times without side effects).
