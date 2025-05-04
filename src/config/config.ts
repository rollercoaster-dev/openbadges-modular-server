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

  // Authentication configuration
  auth: {
    // Whether authentication is enabled
    enabled: process.env.AUTH_ENABLED !== 'false',
    // JWT configuration
    jwtSecret: process.env.JWT_SECRET || 'temp_secret_replace_in_production',
    tokenExpirySeconds: parseInt(process.env.JWT_TOKEN_EXPIRY_SECONDS || '3600', 10), // 1 hour default
    issuer: process.env.JWT_ISSUER || process.env.BASE_URL || 'http://localhost:3000',
    // Public paths (no authentication required)
    publicPaths: (process.env.AUTH_PUBLIC_PATHS || '/docs,/swagger,/health,/public').split(','),
    // Authentication adapters configuration
    adapters: {
      apiKey: {
        enabled: process.env.AUTH_API_KEY_ENABLED !== 'false',
        // API keys are loaded from environment variables in the format:
        // AUTH_API_KEY_<KEY_NAME>=<API_KEY>:<USER_ID>:<DESCRIPTION>
        // Example: AUTH_API_KEY_SYSTEM=abc123:system-user:System integration
        keys: (() => {
          const apiKeyConfig: Record<string, { userId: string; description?: string; claims?: Record<string, unknown> }> = {};
          
          // Parse environment variables for API keys
          Object.keys(process.env).forEach(key => {
            if (key.startsWith('AUTH_API_KEY_')) {
              const value = process.env[key];
              if (value) {
                const [apiKey, userId, description] = value.split(':');
                if (apiKey && userId) {
                  const keyName = key.replace('AUTH_API_KEY_', '').toLowerCase();
                  apiKeyConfig[apiKey] = {
                    userId,
                    description: description || `API key for ${keyName}`,
                    claims: { role: keyName }
                  };
                }
              }
            }
          });
          
          return apiKeyConfig;
        })()
      },
      basicAuth: {
        enabled: process.env.AUTH_BASIC_AUTH_ENABLED !== 'false',
        // Basic auth credentials are loaded from environment variables in the format:
        // AUTH_BASIC_AUTH_<USERNAME>=<PASSWORD>:<USER_ID>:<ROLE>
        // Example: AUTH_BASIC_AUTH_ADMIN=securepass:admin-user:admin
        credentials: (() => {
          const basicAuthConfig: Record<string, { password: string; userId: string; claims?: Record<string, unknown> }> = {};
          
          // Parse environment variables for basic auth credentials
          Object.keys(process.env).forEach(key => {
            if (key.startsWith('AUTH_BASIC_AUTH_')) {
              const value = process.env[key];
              if (value) {
                const [password, userId, role] = value.split(':');
                if (password && userId) {
                  const username = key.replace('AUTH_BASIC_AUTH_', '').toLowerCase();
                  basicAuthConfig[username] = {
                    password,
                    userId,
                    claims: { role: role || 'user' }
                  };
                }
              }
            }
          });
          
          return basicAuthConfig;
        })()
      },
      oauth2: {
        enabled: process.env.AUTH_OAUTH2_ENABLED === 'true',
        jwksUri: process.env.AUTH_OAUTH2_JWKS_URI,
        introspectionEndpoint: process.env.AUTH_OAUTH2_INTROSPECTION_ENDPOINT,
        clientId: process.env.AUTH_OAUTH2_CLIENT_ID,
        clientSecret: process.env.AUTH_OAUTH2_CLIENT_SECRET,
        userIdClaim: process.env.AUTH_OAUTH2_USER_ID_CLAIM || 'sub',
        audience: process.env.AUTH_OAUTH2_AUDIENCE,
        issuer: process.env.AUTH_OAUTH2_ISSUER
      }
    }
  },

  // Open Badges configuration
  openBadges: {
    version: '3.0',
    context: 'https://w3id.org/openbadges/v3',
    baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  },

  // Logging configuration
  logging: {
    // Log level: 'debug', 'info', 'warn', 'error', 'fatal'
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
    // Whether to include timestamps in logs
    includeTimestamp: process.env.LOG_INCLUDE_TIMESTAMP !== 'false',
    // Whether to enable pretty printing (useful for development)
    prettyPrint: process.env.LOG_PRETTY_PRINT === 'true' || process.env.NODE_ENV !== 'production',
    // Whether to log database queries at debug level (in addition to slow queries)
    logDebugQueries: process.env.LOG_DEBUG_QUERIES === 'true',
    // Whether to include request IDs in logs
    includeRequestId: process.env.LOG_INCLUDE_REQUEST_ID !== 'false',
    // Whether to include stack traces in error logs
    includeStackTrace: process.env.LOG_INCLUDE_STACK_TRACE !== 'false',
    // Whether to log to a file
    logToFile: process.env.LOG_TO_FILE === 'true',
    // Log file path
    logFilePath: process.env.LOG_FILE_PATH || './logs/app.log',
    // Whether to use 24-hour time format (vs 12-hour with AM/PM)
    use24HourFormat: process.env.LOG_USE_24_HOUR_FORMAT !== 'false',
    // Whether to use relative time for recent events (e.g., "just now", "2 minutes ago")
    useRelativeTime: process.env.LOG_USE_RELATIVE_TIME !== 'false',
    // Whether to colorize logs
    colorize: process.env.LOG_COLORIZE !== 'false',
  }
};
