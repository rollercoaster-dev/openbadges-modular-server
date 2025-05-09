import type { Config } from 'drizzle-kit';
import { existsSync } from 'fs';
import { dirname } from 'path';
import { databaseConfig } from './drizzle-config-helper';

// Use console for logging in drizzle.config.ts to avoid module resolution issues
const logger = {
  // eslint-disable-next-line no-console
  error: console.error,
  // eslint-disable-next-line no-console
  warn: console.warn,
  // eslint-disable-next-line no-console
  info: console.info,
  // eslint-disable-next-line no-console
  debug: console.debug
};

/**
 * Drizzle Kit configuration
 *
 * This file configures Drizzle Kit for database migrations.
 * It supports both SQLite and PostgreSQL databases based on the DB_TYPE environment variable.
 */

// Use the main application logger

// Determine database type from environment variable or config
const dbType = process.env['DB_TYPE'] || databaseConfig.type || 'sqlite';

// Validate database type
const supportedDbTypes = ['postgresql', 'sqlite'];
if (!supportedDbTypes.includes(dbType)) {
  logger.error(`Unsupported database type '${dbType}'. Supported types are: ${supportedDbTypes.join(', ')}`);
  process.exit(1);
}

// Configure based on database type
let drizzleConfig: Config;

if (dbType === 'postgresql') {
  // Parse connection string to extract credentials
  const connectionString = databaseConfig.connectionString || 'postgres://postgres:postgres@localhost:5432/openbadges';
  let url: URL;
  try {
    url = new URL(connectionString);
  } catch (error) {
    // Log error without sensitive data
    logger.error('Invalid connection string', { error });
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
      url: process.env['SQLITE_DB_PATH'] || databaseConfig.sqliteFile || 'sqlite.db',
    },
  };
}

// Add common configuration
drizzleConfig.verbose = process.env.NODE_ENV !== 'production';
drizzleConfig.strict = true;

// Verify configuration
verifyConfiguration(drizzleConfig, dbType);

export default drizzleConfig;

/**
 * Verifies the drizzle configuration
 * @param config The drizzle configuration
 * @param dbType The database type
 */
function verifyConfiguration(config: Config, dbType: string) {
  // Check if schema file exists
  const schemaPath = Array.isArray(config.schema) ? config.schema[0] : config.schema;
  if (schemaPath && !existsSync(schemaPath)) {
    logger.error("Schema file not found:", { schemaPath });
    process.exit(1);
  }

  // Verify migrations directory exists or can be created
  if (config.out) {
    const migrationsDir = dirname(config.out);
    if (!existsSync(migrationsDir)) {
      logger.warn(`Migrations directory not found: ${migrationsDir}. It will be created.`);
    }
  }

  // PostgreSQL specific checks
  // We need to access dbCredentials which is not directly defined in the Config type
  // Define a type for database credentials
  type DbCredentials = {
    host?: string;
    port?: number;
    user?: string;
    password?: string;
    database?: string;
    url?: string;
  };

  // Use type assertion to access dbCredentials
  const dbCredentials = (config as { dbCredentials?: DbCredentials }).dbCredentials;

  if (dbType === 'postgresql' && dbCredentials) {
    const { host, port, user, database } = dbCredentials;
    if (!host || !port || !user || !database) {
      logger.error("Missing PostgreSQL connection details:", {
        missingFields: ['host', 'port', 'user', 'database'].filter(field => !dbCredentials[field as keyof DbCredentials])
      });
      process.exit(1);
    }
  } else if (dbType === 'sqlite' && dbCredentials) {
    const { url } = dbCredentials;
    if (!url) {
      logger.error("Missing SQLite connection URL");
      process.exit(1);
    }
    if (url && url !== ':memory:' && !existsSync(url) && !url.includes(':memory:')) {
      logger.warn(`SQLite database file not found: ${url}. It will be created.`);
    }
  }
}
