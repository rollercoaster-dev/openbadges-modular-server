/**
 * Helper functions for drizzle.config.ts
 *
 * This file provides simplified versions of config functions
 * that don't rely on external dependencies like rd-logger.
 */

// Helper function to determine PostgreSQL connection string
export const determinePostgresConnectionString = (): string => {
  // Priority 1: Explicit DATABASE_URL from environment
  if (process.env['DATABASE_URL']) {
    return process.env['DATABASE_URL'];
  }

  // Priority 2: Construct from individual POSTGRES_* vars
  const host = process.env['POSTGRES_HOST'];
  const port = process.env['POSTGRES_PORT'] || '5432';
  const user = process.env['POSTGRES_USER'];
  const password = process.env['POSTGRES_PASSWORD'];
  const dbName = process.env['POSTGRES_DB'];

  if (host && user && password && dbName) {
    if (process.env['DB_TYPE'] === 'postgresql' ||
        (!process.env['DB_TYPE'] && host.toLowerCase() !== 'sqlite.db' && !dbName.toLowerCase().endsWith('.sqlite'))) {
      return `postgresql://${user}:${password}@${host}:${port}/${dbName}`;
    }
  }

  // Priority 3: Default connection string
  return `postgres://postgres:postgres@localhost:5432/openbadges`;
};

// Simplified database config
export const databaseConfig = {
  // Supported types: 'sqlite', 'postgresql'
  type: process.env['DB_TYPE'] || 'sqlite',
  // For Postgres, use a generic connection string
  connectionString: determinePostgresConnectionString(),
  // SQLite configuration
  sqliteFile: process.env['SQLITE_DB_PATH'] || process.env['SQLITE_FILE'] || ':memory:'
};
