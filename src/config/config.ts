/**
 * Configuration for the Open Badges API
 *
 * This file contains configuration settings for the API, including
 * database connection details and other environment-specific settings.
 */

export const config = {
  // Server configuration
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || '0.0.0.0',
  },

  // Database configuration
  database: {
    // Supported types: 'sqlite', 'postgresql', 'mongodb', etc.
    type: process.env.DB_TYPE || 'sqlite',
    // For Postgres or Mongo, use a generic connection string
    connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/openbadges',
    // SQLite configuration
    sqliteFile: process.env.SQLITE_FILE || ':memory:',
    sqliteBusyTimeout: parseInt(process.env.SQLITE_BUSY_TIMEOUT || '5000', 10),
    sqliteSyncMode: process.env.SQLITE_SYNC_MODE || 'NORMAL',
    sqliteCacheSize: parseInt(process.env.SQLITE_CACHE_SIZE || '10000', 10),
    // Connection retry configuration
    maxConnectionAttempts: parseInt(process.env.DB_MAX_CONNECTION_ATTEMPTS || '5', 10),
    connectionRetryDelayMs: parseInt(process.env.DB_CONNECTION_RETRY_DELAY_MS || '1000', 10),
    // Query logging configuration
    queryLogging: process.env.DB_QUERY_LOGGING !== 'false',
    slowQueryThreshold: parseInt(process.env.DB_SLOW_QUERY_THRESHOLD || '100', 10), // ms
    maxQueryLogs: parseInt(process.env.DB_MAX_QUERY_LOGS || '1000', 10),
    // Prepared statements configuration
    usePreparedStatements: process.env.DB_USE_PREPARED_STATEMENTS !== 'false',
    // Pagination defaults
    defaultPageSize: parseInt(process.env.DB_DEFAULT_PAGE_SIZE || '20', 10),
    maxPageSize: parseInt(process.env.DB_MAX_PAGE_SIZE || '100', 10),
    // Shutdown configuration
    saveQueryLogsOnShutdown: process.env.DB_SAVE_QUERY_LOGS_ON_SHUTDOWN === 'true'
  },

  // Cache configuration
  cache: {
    // Default cache settings
    default: {
      max: parseInt(process.env.CACHE_MAX_ITEMS || '1000', 10),
      ttl: parseInt(process.env.CACHE_TTL || '3600', 10), // 1 hour in seconds
      updateAgeOnGet: true
    },
    // Entity-specific cache settings
    entities: {
      issuer: {
        max: parseInt(process.env.CACHE_ISSUER_MAX_ITEMS || '500', 10),
        ttl: parseInt(process.env.CACHE_ISSUER_TTL || '7200', 10) // 2 hours in seconds
      },
      badgeClass: {
        max: parseInt(process.env.CACHE_BADGE_CLASS_MAX_ITEMS || '1000', 10),
        ttl: parseInt(process.env.CACHE_BADGE_CLASS_TTL || '3600', 10) // 1 hour in seconds
      },
      assertion: {
        max: parseInt(process.env.CACHE_ASSERTION_MAX_ITEMS || '2000', 10),
        ttl: parseInt(process.env.CACHE_ASSERTION_TTL || '1800', 10) // 30 minutes in seconds
      }
    },
    // Whether to enable caching
    enabled: process.env.CACHE_ENABLED !== 'false'
  },

  // API configuration
  api: {
    basePath: '/api',
    version: 'v1',
  },

  // Open Badges configuration
  openBadges: {
    version: '3.0',
    context: 'https://w3id.org/openbadges/v3',
    baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  }
};
