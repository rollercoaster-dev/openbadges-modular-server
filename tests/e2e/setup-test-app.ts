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
    // Override database connection for CI environment
    const dbConfig = {
      // For E2E tests, we always use PostgreSQL
      type: process.env.CI === 'true' ? 'postgresql' : config.database.type,
      connectionString: process.env.CI === 'true'
        ? process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/openbadges_test'
        : config.database.connectionString,
      sqliteFile: config.database.sqliteFile,
      sqliteBusyTimeout: config.database.sqliteBusyTimeout,
      sqliteSyncMode: config.database.sqliteSyncMode,
      sqliteCacheSize: config.database.sqliteCacheSize
    };

    logger.info('Database configuration', {
      type: dbConfig.type,
      connectionString: dbConfig.connectionString.toString().replace(/:[^:@]+@/, ':***@'), // Mask password
      isCI: process.env.CI === 'true'
    });

    // Initialize the repository factory
    await RepositoryFactory.initialize(dbConfig);

    // Create database instance for connection
    await DatabaseFactory.createDatabase(
      config.database.type,
      {
        connectionString: dbConfig.connectionString,
        sqliteFile: config.database.sqliteFile,
        sqliteBusyTimeout: config.database.sqliteBusyTimeout,
        sqliteSyncMode: config.database.sqliteSyncMode,
        sqliteCacheSize: config.database.sqliteCacheSize
      }
    );

    logger.info(`Connected to ${config.database.type} database`);

    // Initialize authentication system
    await initializeAuthentication();

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
    const apiRouter = createApiRouter(
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
    throw error;
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
