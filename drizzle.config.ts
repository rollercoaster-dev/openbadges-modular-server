import type { Config } from 'drizzle-kit';
import { config } from './src/config/config';
import { existsSync } from 'fs';
import { dirname } from 'path';

/**
 * Drizzle Kit configuration
 *
 * This file configures Drizzle Kit for database migrations.
 * It supports both SQLite and PostgreSQL databases based on the DB_TYPE environment variable.
 */

// Determine database type from environment variable or config
const dbType = process.env.DB_TYPE || config.database.type || 'sqlite';

// Validate database type
const supportedDbTypes = ['postgresql', 'sqlite'];
if (!supportedDbTypes.includes(dbType)) {
  console.error(`Error: Unsupported database type '${dbType}'. Supported types are: ${supportedDbTypes.join(', ')}`);
  process.exit(1);
}

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

// Verify configuration
verifyConfiguration(drizzleConfig, dbType);

export default drizzleConfig;

/**
 * Verifies the drizzle configuration
 * @param config The drizzle configuration
 * @param dbType The database type
 */
function verifyConfiguration(config: any, dbType: string) {
  // Check if schema file exists
  const schemaPath = Array.isArray(config.schema) ? config.schema[0] : config.schema;
  if (schemaPath && !existsSync(schemaPath)) {
    console.error("🔴 Error: Schema file not found:", schemaPath);
    process.exit(1);
  }

  // Verify migrations directory exists or can be created
  if (config.out) {
    const migrationsDir = dirname(config.out);
    if (!existsSync(migrationsDir)) {
      console.warn(`Warning: Migrations directory not found: ${migrationsDir}. It will be created.`);
    }
  }

  // PostgreSQL specific checks
  const configAny = config as any; // Cast to any to access potentially non-standard dbCredentials
  if (dbType === 'postgresql' && configAny.dbCredentials) {
    const { host, port, user, database } = configAny.dbCredentials;
    if (!host || !port || !user || !database) {
      console.error(
        "🔴 Error: Missing PostgreSQL connection details (host, port, user, database) in dbCredentials."
      );
      process.exit(1);
    }
  } else if (dbType === 'sqlite' && configAny.dbCredentials) {
    const { url } = configAny.dbCredentials;
    if (!url) {
      console.error("🔴 Error: Missing SQLite connection URL in dbCredentials.");
      process.exit(1);
    }
    if (url && url !== ':memory:' && !existsSync(url) && !url.includes(':memory:')) {
      console.warn(`Warning: SQLite database file not found: ${url}. It will be created.`);
    }
  }
}
