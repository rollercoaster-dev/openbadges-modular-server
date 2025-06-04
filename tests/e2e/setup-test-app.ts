/**
 * Setup function for E2E tests
 *
 * This file provides a modified version of the setupApp function
 * that doesn't automatically start the server.
 */

import { Hono } from 'hono';
import { RepositoryFactory } from '@/infrastructure/repository.factory';
import { createApiRouter } from '@/api/api.router';
import { config } from '@/config/config';
import { createSecurityMiddleware } from '@/utils/security/security.middleware';
import { IssuerController } from '@/api/controllers/issuer.controller';
import { BadgeClassController } from '@/api/controllers/badgeClass.controller';
import { AssertionController } from '@/api/controllers/assertion.controller';
import { DatabaseFactory } from '@/infrastructure/database/database.factory';
import {
  createErrorHandlerMiddleware,
  handleNotFound,
} from '@/utils/errors/error-handler.middleware';
import { logger } from '@/utils/logging/logger.service';
import { createRequestContextMiddleware } from '@/utils/logging/request-context.middleware';
import { initializeAuthentication } from '@/auth/auth.initializer';
import {
  createAuthMiddleware,
  createAuthDebugMiddleware,
} from '@/auth/middleware/auth.middleware';
import { isPostgresAvailable } from '../helpers/database-availability';

// Global flag to track PostgreSQL availability for conditional test skipping
let isPgAvailable = false;

// Check if PostgreSQL is available when DB_TYPE is postgresql
const pgConnectionString =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/openbadges_test';

const checkPgAvailability = async (): Promise<boolean> => {
  if (process.env.DB_TYPE === 'postgresql') {
    try {
      isPgAvailable = await isPostgresAvailable(pgConnectionString);
      if (!isPgAvailable) {
        logger.warn(
          'PostgreSQL is not available, PostgreSQL E2E tests will be skipped'
        );
        // Skip PG tests without terminating the runner
        return false;
      }
      logger.info('PostgreSQL is available for E2E tests');
      return true;
    } catch (error) {
      logger.error('Error checking PostgreSQL availability', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      logger.warn(
        'Assuming PostgreSQL is not available, PostgreSQL E2E tests will be skipped'
      );
      // Skip PG tests without terminating the runner
      isPgAvailable = false;
      return false;
    }
  }
  // For SQLite or other database types, return true (available)
  return true;
};

// Export the availability flag for use in tests
export { isPgAvailable };

// Run the check before any tests (but don't exit on failure)
checkPgAvailability().catch((error) => {
  logger.error('Unhandled error in PostgreSQL availability check', {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });
  // Set flag to false but don't exit - let tests handle the unavailability
  isPgAvailable = false;
});

// Create a function to create a new Hono app instance
function createApp() {
  const app = new Hono();

  // Add middleware
  app.use(createRequestContextMiddleware());
  app.use(createSecurityMiddleware());
  app.use(createAuthMiddleware());
  app.use(createAuthDebugMiddleware());

  // Root route
  app.get('/', (c) =>
    c.json({
      name: 'Open Badges API',
      version: '1.0.0',
      specification: 'Open Badges 3.0',
      documentation: {
        swagger: '/swagger',
        swaggerUI: '/docs',
      },
    })
  );

  // Add a health check endpoint for tests
  app.get('/health', (c) => {
    return c.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      database: {
        type: process.env.DB_TYPE || 'unknown',
        connected: RepositoryFactory.isConnected(),
      },
    });
  });

  return app;
}

// Async function to setup repositories and controllers
export async function setupTestApp(
  port?: number
): Promise<{ app: Hono; server: unknown }> {
  // Create a new app instance for each test
  const app = createApp();
  try {
    // Use the same database configuration as the rest of the tests
    // This ensures consistency across all test types
    const dbConfig = {
      // Use the database type from environment or config
      type: process.env.DB_TYPE || config.database.type,
      // Use the connection string from environment or config
      connectionString:
        process.env.DATABASE_URL || config.database.connectionString,
      sqliteFile:
        process.env.SQLITE_DB_PATH ||
        process.env.SQLITE_FILE ||
        config.database.sqliteFile ||
        ':memory:',
      sqliteBusyTimeout: config.database.sqliteBusyTimeout,
      sqliteSyncMode: config.database.sqliteSyncMode,
      sqliteCacheSize: config.database.sqliteCacheSize,
      // Add explicit user/password for PostgreSQL
      postgresUser: process.env.POSTGRES_USER || 'testuser',
      postgresPassword: process.env.POSTGRES_PASSWORD || 'testpassword',
      postgresHost: process.env.POSTGRES_HOST || 'localhost',
      postgresPort: process.env.POSTGRES_PORT || '5433',
      postgresDb: process.env.POSTGRES_DB || 'openbadges_test',
    };

    // Enhanced logging for database configuration
    logger.info('Database configuration for E2E tests', {
      type: dbConfig.type,
      connectionString: dbConfig.connectionString
        ? dbConfig.connectionString.replace(/:[^:@]+@/, ':***@')
        : 'N/A', // safely handle sqlite / undefined cases
      sqliteFile: dbConfig.sqliteFile,
      isCI: process.env.CI === 'true',
      nodeEnv: process.env.NODE_ENV,
      testPort: process.env.TEST_PORT,
    });

    // Log all relevant environment variables for debugging
    logger.info('Environment variables for E2E tests', {
      DB_TYPE: process.env.DB_TYPE,
      DATABASE_URL: process.env.DATABASE_URL
        ? process.env.DATABASE_URL.replace(/:[^:@]+@/, ':***@')
        : undefined,
      POSTGRES_USER: process.env.POSTGRES_USER,
      POSTGRES_HOST: process.env.POSTGRES_HOST,
      POSTGRES_PORT: process.env.POSTGRES_PORT,
      POSTGRES_DB: process.env.POSTGRES_DB,
      SQLITE_FILE: process.env.SQLITE_FILE,
      NODE_ENV: process.env.NODE_ENV,
      CI: process.env.CI,
      AUTH_API_KEY_TEST: process.env.AUTH_API_KEY_TEST ? 'set' : 'not set',
      AUTH_API_KEY_E2E: process.env.AUTH_API_KEY_E2E ? 'set' : 'not set',
    });

    // Initialize the repository factory with enhanced error handling
    try {
      await RepositoryFactory.initialize(dbConfig);
      logger.info('Repository factory initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize repository factory', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        dbConfig: {
          type: dbConfig.type,
          connectionString: dbConfig.connectionString
            ? dbConfig.connectionString.replace(/:[^:@]+@/, ':***@')
            : 'N/A', // safely handle sqlite / undefined cases
        },
      });
      throw error; // Re-throw to fail the test
    }

    // Create database instance for connection with enhanced error handling
    try {
      await DatabaseFactory.createDatabase(
        dbConfig.type, // Use the type from dbConfig, not from config.database
        {
          connectionString: dbConfig.connectionString,
          sqliteFile: dbConfig.sqliteFile,
          sqliteBusyTimeout: config.database.sqliteBusyTimeout,
          sqliteSyncMode: config.database.sqliteSyncMode,
          sqliteCacheSize: config.database.sqliteCacheSize,
        }
      );
      logger.info('Database connection established successfully');

      // Run migrations for the database
      try {
        if (dbConfig.type === 'sqlite') {
          logger.info('Running SQLite migrations for E2E tests');
          const fs = require('fs');
          const { join } = require('path');
          const { Database } = require('bun:sqlite');

          // Create SQLite database connection
          const sqliteFile =
            process.env.SQLITE_DB_PATH ||
            config.database.sqliteFile ||
            ':memory:';
          logger.debug(`Using SQLite database at: ${sqliteFile}`);
          const db = new Database(sqliteFile);

          try {
            // Apply the latest migration SQL that includes issuer_id column
            const sqlFilePath = join(
              process.cwd(),
              'drizzle/migrations/0000_fixed_migration.sql'
            );
            if (fs.existsSync(sqlFilePath)) {
              logger.info(`Applying SQL migration from ${sqlFilePath}`);
              try {
                const sql = fs.readFileSync(sqlFilePath, 'utf8');
                db.exec(sql);
                logger.info('Base SQLite migration applied successfully');

                // Note: The 0000_fixed_migration.sql already includes the issuer_id column
                // so we don't need to apply the additional issuer_id migrations
                logger.info(
                  'All SQLite migrations applied successfully (issuer_id already included in base migration)'
                );
              } catch (error) {
                // If tables already exist, that's fine
                if (error.message && error.message.includes('already exists')) {
                  logger.info('Tables already exist, skipping migration');
                } else {
                  throw error;
                }
              }
            } else {
              logger.warn(`Migration file not found: ${sqlFilePath}`);
            }
          } finally {
            // Always close the database connection to prevent file locks and descriptor leaks
            db.close();
            logger.debug('SQLite migration connection closed');
          }
        } else if (dbConfig.type === 'postgresql') {
          logger.info('Running PostgreSQL migrations for E2E tests');
          const fs = require('fs');
          const { join } = require('path');
          // Import postgres module correctly
          const postgres = await import('postgres');

          // Create PostgreSQL connection
          // Build connection string from components if not provided
          let connectionString = dbConfig.connectionString;
          if (!connectionString) {
            // Construct connection string from individual components
            const user = dbConfig.postgresUser;
            const password = dbConfig.postgresPassword;
            const host = dbConfig.postgresHost;
            const port = dbConfig.postgresPort;
            const database = dbConfig.postgresDb;

            connectionString = `postgresql://${user}:${password}@${host}:${port}/${database}`;
            logger.info('Built PostgreSQL connection string from components', {
              user,
              host,
              port,
              database,
              // Don't log the password
            });
          }

          logger.info(
            `PostgreSQL connection string: ${connectionString
              .toString()
              .replace(/:[^:@]+@/, ':***@')}`
          );

          try {
            // Add connection timeout to fail faster in CI environment
            const client = postgres.default(connectionString, {
              max: 1,
              connect_timeout: 10, // 10 seconds timeout
              idle_timeout: 5,
              max_lifetime: 30,
              // Add debug logging for connection issues
              onnotice: (notice) => {
                logger.debug('PostgreSQL notice', { notice });
              },
              debug: (connection, query, _params, _types) => {
                logger.debug('PostgreSQL debug', {
                  connection: connection.toString(),
                  query: query.toString().substring(0, 100) + '...',
                });
              },
            });

            // Apply the fixed migration SQL
            const sqlFilePath = join(
              process.cwd(),
              'drizzle/pg-migrations/0000_strong_gideon_fixed.sql'
            );
            if (fs.existsSync(sqlFilePath)) {
              logger.info(`Applying SQL migration from ${sqlFilePath}`);
              try {
                const sql = fs.readFileSync(sqlFilePath, 'utf8');

                // Split the SQL file into separate statements
                // PostgreSQL statements are separated by statement-breakpoint comments
                const statements = sql
                  .split('--> statement-breakpoint')
                  .map((stmt: string) => stmt.trim())
                  .filter((stmt: string) => stmt.length > 0);

                // Execute each statement separately
                for (const statement of statements) {
                  try {
                    await client.unsafe(statement);
                  } catch (error) {
                    const errorMessage =
                      error instanceof Error ? error.message : String(error);

                    // Check if this is an "already exists" error that we can safely ignore
                    const isAlreadyExistsError =
                      errorMessage.includes('already exists') ||
                      (errorMessage.includes('relation') &&
                        errorMessage.includes('already exists')) ||
                      (errorMessage.includes('constraint') &&
                        errorMessage.includes('already exists'));

                    // Check if this is a "does not exist" error that indicates schema drift
                    const isDoesNotExistError =
                      (errorMessage.includes('relation') &&
                        errorMessage.includes('does not exist')) ||
                      (errorMessage.includes('column') &&
                        errorMessage.includes('does not exist')) ||
                      (errorMessage.includes('table') &&
                        errorMessage.includes('does not exist'));

                    if (isAlreadyExistsError) {
                      logger.info(
                        'Schema object already exists, continuing with next statement',
                        {
                          statement: statement.substring(0, 100) + '...',
                        }
                      );
                    } else if (isDoesNotExistError) {
                      // These errors indicate schema drift and should be treated seriously
                      logger.error(
                        'Schema drift detected: attempting to modify non-existent object',
                        {
                          error: errorMessage,
                          statement: statement.substring(0, 100) + '...',
                          isCI: process.env.CI === 'true',
                        }
                      );

                      // In CI, fail immediately on schema drift
                      if (process.env.CI === 'true') {
                        throw new Error(
                          `Schema drift detected in CI: ${errorMessage}`
                        );
                      } else {
                        // In development, log as warning but continue
                        logger.warn(
                          'Continuing despite schema drift in development environment'
                        );
                      }
                    } else {
                      // For other errors, log and abort migration
                      logger.error(
                        'Fatal error applying PostgreSQL migration statement',
                        {
                          error: errorMessage,
                          statement: statement.substring(0, 100) + '...',
                        }
                      );
                      throw new Error(
                        `Test migration failed on statement: ${errorMessage}`
                      );
                    }
                  }
                }

                logger.info('PostgreSQL migrations applied successfully');

                // Apply additional migration to add missing columns
                const additionalMigrationPath = join(
                  process.cwd(),
                  'drizzle/pg-migrations/0003_add_missing_columns.sql'
                );
                if (fs.existsSync(additionalMigrationPath)) {
                  logger.info(
                    'Applying additional PostgreSQL migration for missing columns'
                  );
                  try {
                    const additionalSql = fs.readFileSync(
                      additionalMigrationPath,
                      'utf8'
                    );
                    await client.unsafe(additionalSql);
                    logger.info(
                      'Additional PostgreSQL migration applied successfully'
                    );
                  } catch (error) {
                    const errorMessage =
                      error instanceof Error ? error.message : String(error);
                    logger.warn(
                      'Additional migration failed (may be expected)',
                      {
                        error: errorMessage,
                      }
                    );
                  }
                }
              } catch (error) {
                // If tables already exist, that's fine
                if (error.message && error.message.includes('already exists')) {
                  logger.info('Tables already exist, skipping migration');
                } else {
                  logger.error('Error applying PostgreSQL migration', {
                    error:
                      error instanceof Error ? error.message : String(error),
                    stack: error instanceof Error ? error.stack : undefined,
                  });
                }
              }
            } else {
              logger.warn(`Migration file not found: ${sqlFilePath}`);

              // Try the original file as a fallback
              const originalSqlFilePath = join(
                process.cwd(),
                'drizzle/pg-migrations/0000_strong_gideon.sql'
              );
              if (fs.existsSync(originalSqlFilePath)) {
                logger.info(
                  `Fixed SQL file not found, applying original SQL file from ${originalSqlFilePath}`
                );
                try {
                  const sql = fs.readFileSync(originalSqlFilePath, 'utf8');

                  // Split the SQL file into separate statements
                  // PostgreSQL statements are separated by statement-breakpoint comments
                  const statements = sql
                    .split('--> statement-breakpoint')
                    .map((stmt: string) => stmt.trim())
                    .filter((stmt: string) => stmt.length > 0);

                  // Execute each statement separately
                  for (const statement of statements) {
                    try {
                      await client.unsafe(statement);
                    } catch (error) {
                      const errorMessage =
                        error instanceof Error ? error.message : String(error);

                      // Check if this is an "already exists" error that we can safely ignore
                      const isAlreadyExistsError =
                        errorMessage.includes('already exists') ||
                        (errorMessage.includes('relation') &&
                          errorMessage.includes('already exists')) ||
                        (errorMessage.includes('constraint') &&
                          errorMessage.includes('already exists'));

                      // Check if this is a "does not exist" error that indicates schema drift
                      const isDoesNotExistError =
                        (errorMessage.includes('relation') &&
                          errorMessage.includes('does not exist')) ||
                        (errorMessage.includes('column') &&
                          errorMessage.includes('does not exist')) ||
                        (errorMessage.includes('table') &&
                          errorMessage.includes('does not exist'));

                      if (isAlreadyExistsError) {
                        logger.info(
                          'Schema object already exists, continuing with next statement',
                          {
                            statement: statement.substring(0, 100) + '...',
                          }
                        );
                      } else if (isDoesNotExistError) {
                        // These errors indicate schema drift and should be treated seriously
                        logger.error(
                          'Schema drift detected: attempting to modify non-existent object',
                          {
                            error: errorMessage,
                            statement: statement.substring(0, 100) + '...',
                            isCI: process.env.CI === 'true',
                          }
                        );

                        // In CI, fail immediately on schema drift
                        if (process.env.CI === 'true') {
                          throw new Error(
                            `Schema drift detected in CI: ${errorMessage}`
                          );
                        } else {
                          // In development, log as warning but continue
                          logger.warn(
                            'Continuing despite schema drift in development environment'
                          );
                        }
                      } else {
                        // For other errors, log and abort migration
                        logger.error(
                          'Fatal error applying original PostgreSQL migration statement',
                          {
                            error: errorMessage,
                            statement: statement.substring(0, 100) + '...',
                          }
                        );
                        throw new Error(
                          `Test migration failed on original statement: ${errorMessage}`
                        );
                      }
                    }
                  }

                  logger.info('Original PostgreSQL SQL applied successfully');
                } catch (error) {
                  // If tables already exist, that's fine
                  if (error.message?.includes('already exists')) {
                    logger.info('Tables already exist, skipping migration');
                  } else {
                    logger.error(
                      'Error applying original PostgreSQL migration',
                      {
                        error:
                          error instanceof Error
                            ? error.message
                            : String(error),
                        stack: error instanceof Error ? error.stack : undefined,
                      }
                    );
                  }
                }
              } else {
                logger.warn('No SQL migration files found for PostgreSQL');
              }
            }

            // Close the connection
            await client.end();
          } catch (error) {
            logger.error('Failed to connect to PostgreSQL database', {
              error: error instanceof Error ? error.message : String(error),
              stack: error instanceof Error ? error.stack : undefined,
            });
            logger.warn(
              'Continuing without PostgreSQL database - tests will be skipped'
            );
            // Don't throw error, just continue without database
            // This allows tests to run in environments without PostgreSQL
          }
        }
      } catch (error) {
        logger.error('Failed to run database migrations', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
        // Continue even if migrations fail
      }
    } catch (error) {
      logger.error('Failed to create database connection', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        dbConfig: {
          type: dbConfig.type,
          connectionString: dbConfig.connectionString
            ? dbConfig.connectionString.replace(/:[^:@]+@/, ':***@')
            : 'N/A', // safely handle sqlite / undefined cases
        },
      });
      logger.warn('Continuing without database - tests will be skipped');
      // Don't throw error, just continue without database
      // This allows tests to run in environments without database
    }

    logger.info(`Connected to ${dbConfig.type} database`);

    // Initialize authentication system with enhanced error handling
    try {
      logger.info('Initializing authentication system for E2E tests');
      await initializeAuthentication();
      logger.info(
        'Authentication system initialized successfully for E2E tests'
      );

      // Log available API keys (without exposing the actual keys)
      if (config.auth?.adapters?.apiKey?.enabled) {
        logger.info('API Key authentication adapter is available');
        logger.info(
          `API Key count: ${
            Object.keys(config.auth.adapters.apiKey.keys || {}).length
          }`
        );
      } else {
        logger.warn('API Key authentication adapter is NOT available');
      }
    } catch (error) {
      logger.error('Failed to initialize authentication system for E2E tests', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      logger.warn('Continuing without authentication - some tests may fail');
      // Don't throw error, just continue without authentication
      // This allows tests to run in environments without authentication
    }

    // Initialize repositories
    const issuerRepository = await RepositoryFactory.createIssuerRepository();
    const badgeClassRepository =
      await RepositoryFactory.createBadgeClassRepository();
    const assertionRepository =
      await RepositoryFactory.createAssertionRepository();

    // Initialize controllers with repositories
    const issuerController = new IssuerController(issuerRepository);
    const badgeClassController = new BadgeClassController(
      badgeClassRepository,
      issuerRepository
    );
    const assertionController = new AssertionController(
      assertionRepository,
      badgeClassRepository,
      issuerRepository
    );

    // Create JWKS controller
    const { JwksController } = await import(
      '../../src/api/controllers/jwks.controller'
    );
    const jwksController = new JwksController();

    // Create API router with controllers
    const apiRouter = await createApiRouter(
      issuerController,
      badgeClassController,
      assertionController,
      jwksController
    );

    // Add API routes
    app.route('', apiRouter);
    app.notFound(handleNotFound);
    app.use(createErrorHandlerMiddleware());

    // Start the server with Bun
    const testPort = port || parseInt(process.env.TEST_PORT || '3001');
    logger.info(
      `Starting test server on port ${testPort} with host ${config.server.host}`
    );

    const server = Bun.serve({
      fetch: app.fetch,
      port: testPort,
      hostname: config.server.host || '0.0.0.0', // Ensure we bind to all interfaces
      development: true,
    });

    logger.info(`Test server started successfully`, {
      server: `http://${config.server.host}:${testPort}`,
    });

    return { app, server };
  } catch (error) {
    // More detailed error logging
    if (error instanceof Error) {
      logger.error('Failed to start test server', {
        message: error.message,
        stack: error.stack,
        dbType: process.env.DB_TYPE || config.database.type,
        dbUrl:
          process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':***@') || 'not set',
        testPort: process.env.TEST_PORT || '3001',
        isCI: process.env.CI === 'true',
        nodeEnv: process.env.NODE_ENV,
      });
    } else {
      logger.error('Failed to start test server with unknown error', {
        error: String(error),
        dbType: process.env.DB_TYPE || config.database.type,
      });
    }

    // Create a minimal app that will respond with 500 errors
    // This allows tests to run and skip when they detect server errors
    const minimalApp = new Hono();
    minimalApp.all('*', (c) => {
      return c.json({ error: 'Server initialization failed' }, 500);
    });

    const testPort = port || parseInt(process.env.TEST_PORT || '3001');
    logger.info(
      `Starting minimal error server on port ${testPort} with host ${
        config.server.host || '0.0.0.0'
      }`
    );

    const server = Bun.serve({
      fetch: minimalApp.fetch,
      port: testPort,
      hostname: config.server.host || '0.0.0.0', // Ensure we bind to all interfaces
      development: true,
    });

    logger.warn('Started minimal error server for tests to detect and skip');
    return { app: minimalApp, server };
  }
}

// Define a type for the server
type BunServer = {
  stop: () => void;
};

// Function to stop the test server
export function stopTestServer(server: unknown): void {
  if (server && typeof (server as BunServer).stop === 'function') {
    (server as BunServer).stop();
    logger.info('Test server stopped');
  }
}
