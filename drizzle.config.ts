import type { Config } from 'drizzle-kit';
import { config } from './src/config/config';

/**
 * Drizzle Kit configuration
 *
 * This file configures Drizzle Kit for database migrations.
 * It supports both SQLite and PostgreSQL databases based on the DB_TYPE environment variable.
 */

// Determine database type from environment variable or config
const dbType = process.env.DB_TYPE || config.database.type || 'sqlite';

// Configure based on database type
let drizzleConfig: Config;

if (dbType === 'postgresql') {
  // Parse connection string to extract credentials
  const connectionString = config.database.connectionString || 'postgres://postgres:postgres@localhost:5432/openbadges';
  let url;
  try {
    url = new URL(connectionString);
  } catch (error) {
    console.error('Invalid connection string:', connectionString, error);
    throw new Error('Failed to parse the database connection string. Please check your configuration.');
  }

  drizzleConfig = {
    dialect: 'postgresql',
    schema: './src/infrastructure/database/modules/postgresql/schema.ts',
    out: './drizzle/pg-migrations',
    dbCredentials: {
      host: url.hostname,
      port: parseInt(url.port || '5432'),
      user: url.username || 'postgres',
      password: url.password || 'postgres',
      database: url.pathname.substring(1) || 'openbadges',
    },
  };
} else {
  // Default to SQLite
  drizzleConfig = {
    dialect: 'sqlite',
    schema: './src/infrastructure/database/modules/sqlite/schema.ts',
    out: './drizzle/migrations',
    dbCredentials: {
      url: config.database.sqliteFile || 'sqlite.db',
    },
  };
}

// Add common configuration
drizzleConfig.verbose = process.env.NODE_ENV !== 'production';
drizzleConfig.strict = true;

export default drizzleConfig;
