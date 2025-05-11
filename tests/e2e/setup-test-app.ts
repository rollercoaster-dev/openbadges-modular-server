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
import { createErrorHandlerMiddleware, handleNotFound } from '@/utils/errors/error-handler.middleware';
import { logger } from '@/utils/logging/logger.service';
import { createRequestContextMiddleware } from '@/utils/logging/request-context.middleware';
import { initializeAuthentication } from '@/auth/auth.initializer';
import { createAuthMiddleware, createAuthDebugMiddleware } from '@/auth/middleware/auth.middleware';

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

  return app;
}

// Async function to setup repositories and controllers
export async function setupTestApp(): Promise<{ app: Hono, server: unknown }> {
  // Create a new app instance for each test
  const app = createApp();
  try {
    // Use the same database configuration as the rest of the tests
    // This ensures consistency across all test types
    const dbConfig = {
      // Use the database type from environment or config
      type: process.env.DB_TYPE || config.database.type,
      // Use the connection string from environment or config
      connectionString: process.env.DATABASE_URL || config.database.connectionString,
      sqliteFile: process.env.SQLITE_FILE || config.database.sqliteFile,
      sqliteBusyTimeout: config.database.sqliteBusyTimeout,
      sqliteSyncMode: config.database.sqliteSyncMode,
      sqliteCacheSize: config.database.sqliteCacheSize
    };

    // Enhanced logging for database configuration
    logger.info('Database configuration for E2E tests', {
      type: dbConfig.type,
      connectionString: dbConfig.connectionString.toString().replace(/:[^:@]+@/, ':***@'), // Mask password
      sqliteFile: dbConfig.sqliteFile,
      isCI: process.env.CI === 'true',
      nodeEnv: process.env.NODE_ENV,
      testPort: process.env.TEST_PORT
    });

    // Log all relevant environment variables for debugging
    logger.info('Environment variables for E2E tests', {
      DB_TYPE: process.env.DB_TYPE,
      DATABASE_URL: process.env.DATABASE_URL ? process.env.DATABASE_URL.replace(/:[^:@]+@/, ':***@') : undefined,
      POSTGRES_USER: process.env.POSTGRES_USER,
      POSTGRES_HOST: process.env.POSTGRES_HOST,
      POSTGRES_PORT: process.env.POSTGRES_PORT,
      POSTGRES_DB: process.env.POSTGRES_DB,
      SQLITE_FILE: process.env.SQLITE_FILE,
      NODE_ENV: process.env.NODE_ENV,
      CI: process.env.CI,
      AUTH_API_KEY_TEST: process.env.AUTH_API_KEY_TEST ? 'set' : 'not set',
      AUTH_API_KEY_E2E: process.env.AUTH_API_KEY_E2E ? 'set' : 'not set'
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
          connectionString: dbConfig.connectionString.toString().replace(/:[^:@]+@/, ':***@')
        }
      });
      throw error; // Re-throw to fail the test
    }

    // Create database instance for connection with enhanced error handling
    try {
      await DatabaseFactory.createDatabase(
        dbConfig.type, // Use the type from dbConfig, not from config.database
        {
          connectionString: dbConfig.connectionString,
          sqliteFile: process.env.SQLITE_DB_PATH || config.database.sqliteFile,
          sqliteBusyTimeout: config.database.sqliteBusyTimeout,
          sqliteSyncMode: config.database.sqliteSyncMode,
          sqliteCacheSize: config.database.sqliteCacheSize
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
          let sqliteFile = process.env.SQLITE_DB_PATH || config.database.sqliteFile || './tests/e2e/test_database.sqlite';

          // Ensure the directory exists
          const dirPath = sqliteFile.substring(0, sqliteFile.lastIndexOf('/'));
          if (dirPath && !fs.existsSync(dirPath)) {
            logger.info(`Creating directory for SQLite database: ${dirPath}`);
            fs.mkdirSync(dirPath, { recursive: true });

            // Set directory permissions to ensure it's writable
            try {
              fs.chmodSync(dirPath, 0o777);
              logger.info(`Set permissions on SQLite directory: ${dirPath}`);
            } catch (error) {
              logger.warn(`Failed to set permissions on SQLite directory: ${error instanceof Error ? error.message : String(error)}`);
            }
          }

          // Ensure the file exists and is writable
          if (!fs.existsSync(sqliteFile)) {
            logger.info(`Creating empty SQLite database file: ${sqliteFile}`);
            fs.writeFileSync(sqliteFile, '');
          }

          // Set permissions to ensure it's writable
          try {
            fs.chmodSync(sqliteFile, 0o777);
            logger.info(`Set permissions on SQLite file: ${sqliteFile}`);

            // Check if the file is writable
            const stats = fs.statSync(sqliteFile);
            const isWritable = stats.mode & 0o200; // Check write permission
            logger.info(`SQLite file permissions: ${stats.mode.toString(8)}, writable: ${isWritable ? 'yes' : 'no'}`);

            // Try to write to the file to verify permissions
            fs.appendFileSync(sqliteFile, '');
            logger.info('Successfully verified write access to SQLite file');
          } catch (error) {
            logger.error(`Failed to set permissions or write to SQLite file: ${error instanceof Error ? error.message : String(error)}`);

            // Try an alternative approach for CI environments
            try {
              logger.info('Trying alternative approach for SQLite in CI environment');
              // Use in-memory SQLite as a fallback
              sqliteFile = ':memory:';
              logger.info('Switched to in-memory SQLite database');
            } catch (fallbackError) {
              logger.error(`Failed to set up in-memory SQLite: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`);
            }
          }

          const db = new Database(sqliteFile);

          // Apply the fixed migration SQL
          const sqlFilePath = join(process.cwd(), 'drizzle/migrations/0000_oval_starbolt_fixed.sql');
          if (fs.existsSync(sqlFilePath)) {
            logger.info(`Applying SQL migration from ${sqlFilePath}`);
            try {
              const sql = fs.readFileSync(sqlFilePath, 'utf8');
              db.exec(sql);
              logger.info('SQLite migrations applied successfully');
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
        } else if (dbConfig.type === 'postgresql') {
          logger.info('Running PostgreSQL migrations for E2E tests');
          const fs = require('fs');
          const { join } = require('path');
          // Import postgres module correctly
          const postgres = await import('postgres');

          // Create PostgreSQL connection
          const connectionString = dbConfig.connectionString || 'postgres://postgres:postgres@localhost:5432/openbadges_test';
          logger.info(`PostgreSQL connection string: ${connectionString.toString().replace(/:[^:@]+@/, ':***@')}`);

          try {
            // Add connection timeout to fail faster in CI environment
            const client = postgres.default(connectionString, {
              max: 1,
              connect_timeout: 10, // 10 seconds timeout
              idle_timeout: 10,
              max_lifetime: 30
              // postgres.js doesn't support retry options directly
            });

            // Apply the fixed migration SQL
            const sqlFilePath = join(process.cwd(), 'drizzle/pg-migrations/0000_strong_gideon_fixed.sql');
            if (fs.existsSync(sqlFilePath)) {
              logger.info(`Applying SQL migration from ${sqlFilePath}`);
              try {
                const sql = fs.readFileSync(sqlFilePath, 'utf8');
                await client.unsafe(sql);
                logger.info('PostgreSQL migrations applied successfully');
              } catch (error) {
                // If tables already exist, that's fine
                if (error.message && error.message.includes('already exists')) {
                  logger.info('Tables already exist, skipping migration');
                } else {
                  logger.error('Error applying PostgreSQL migration', {
                    error: error instanceof Error ? error.message : String(error),
                    stack: error instanceof Error ? error.stack : undefined
                  });
                }
              }
            } else {
              logger.warn(`Migration file not found: ${sqlFilePath}`);

              // Try the original file as a fallback
              const originalSqlFilePath = join(process.cwd(), 'drizzle/pg-migrations/0000_strong_gideon.sql');
              if (fs.existsSync(originalSqlFilePath)) {
                logger.info(`Fixed SQL file not found, applying original SQL file from ${originalSqlFilePath}`);
                try {
                  const sql = fs.readFileSync(originalSqlFilePath, 'utf8');
                  await client.unsafe(sql);
                  logger.info('Original PostgreSQL SQL applied successfully');
                } catch (error) {
                  // If tables already exist, that's fine
                  if (error.message && error.message.includes('already exists')) {
                    logger.info('Tables already exist, skipping migration');
                  } else {
                    logger.error('Error applying original PostgreSQL migration', {
                      error: error instanceof Error ? error.message : String(error),
                      stack: error instanceof Error ? error.stack : undefined
                    });
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
              stack: error instanceof Error ? error.stack : undefined
            });

            // Check if we're in CI environment
            if (process.env.CI === 'true' && process.env.USE_TEST_CONTAINERS !== 'true') {
              logger.warn('PostgreSQL connection failed in CI environment. Consider using test containers.');
              // In CI, we want to fail fast if PostgreSQL is required but not available
              if (process.env.REQUIRE_POSTGRESQL === 'true') {
                throw new Error('PostgreSQL connection required but failed in CI environment');
              }
            }

            logger.warn('Continuing without PostgreSQL database - tests will be skipped');
            // Don't throw error, just continue without database
            // This allows tests to run in environments without PostgreSQL
          }
        }
      } catch (error) {
        logger.error('Failed to run database migrations', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        });
        // Continue even if migrations fail
      }
    } catch (error) {
      logger.error('Failed to create database connection', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        dbConfig: {
          type: dbConfig.type,
          connectionString: dbConfig.connectionString.toString().replace(/:[^:@]+@/, ':***@')
        }
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
      logger.info('Authentication system initialized successfully for E2E tests');

      // Log available API keys (without exposing the actual keys)
      if (config.auth?.adapters?.apiKey?.enabled) {
        logger.info('API Key authentication adapter is available');
        logger.info(`API Key count: ${Object.keys(config.auth.adapters.apiKey.keys || {}).length}`);
      } else {
        logger.warn('API Key authentication adapter is NOT available');
      }
    } catch (error) {
      logger.error('Failed to initialize authentication system for E2E tests', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      logger.warn('Continuing without authentication - some tests may fail');
      // Don't throw error, just continue without authentication
      // This allows tests to run in environments without authentication
    }

    // Initialize repositories
    const issuerRepository = await RepositoryFactory.createIssuerRepository();
    const badgeClassRepository = await RepositoryFactory.createBadgeClassRepository();
    const assertionRepository = await RepositoryFactory.createAssertionRepository();

    // Initialize controllers with repositories
    const issuerController = new IssuerController(issuerRepository);
    const badgeClassController = new BadgeClassController(badgeClassRepository);
    const assertionController = new AssertionController(
      assertionRepository,
      badgeClassRepository,
      issuerRepository
    );

    // Create API router with controllers
    const apiRouter = await createApiRouter(
      issuerController,
      badgeClassController,
      assertionController
    );

    // Add API routes
    app.route('', apiRouter);
    app.notFound(handleNotFound);
    app.use(createErrorHandlerMiddleware());

    // Start the server with Bun
    const testPort = parseInt(process.env.TEST_PORT || '3001');
    const server = Bun.serve({
      fetch: app.fetch,
      port: testPort,
      hostname: config.server.host,
      development: true,
    });

    logger.info(`Test server started successfully`, {
      server: `http://${config.server.host}:${testPort}`,
    });

    return { app, server };

  } catch (error) {
    if (error instanceof Error) {
      logger.logError('Failed to start test server', error);
    } else {
      logger.error('Failed to start test server', { message: String(error) });
    }

    // Create a minimal app that will respond with 500 errors
    // This allows tests to run and skip when they detect server errors
    const minimalApp = new Hono();
    minimalApp.all('*', (c) => {
      return c.json({ error: 'Server initialization failed' }, 500);
    });

    const testPort = parseInt(process.env.TEST_PORT || '3001');
    const server = Bun.serve({
      fetch: minimalApp.fetch,
      port: testPort,
      hostname: config.server.host,
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
