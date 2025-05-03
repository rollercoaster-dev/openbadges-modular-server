/**
 * Main application entry point for the Open Badges API
 *
 * This file initializes the application, connects to the database,
 * and starts the server.
 */

import { Elysia } from 'elysia';
import { RepositoryFactory } from './infrastructure/repository.factory';
import { createApiRouter } from './api/api.router';
import { config } from './config/config';
import { securityMiddleware } from './utils/security/security.middleware';
import { IssuerController } from './api/controllers/issuer.controller';
import { BadgeClassController } from './api/controllers/badgeClass.controller';
import { AssertionController } from './api/controllers/assertion.controller';
import { DatabaseFactory } from './infrastructure/database/database.factory';
import { ShutdownService } from './utils/shutdown/shutdown.service';
import { BackpackController } from './domains/backpack/backpack.controller';
import { BackpackService } from './domains/backpack/backpack.service';
import { errorHandlerMiddleware, notFoundHandlerMiddleware } from './utils/errors/error-handler.middleware';
import { logger } from './utils/logging/logger.service';

import { requestContextMiddleware } from './utils/logging/request-context.middleware';
import { initializeAuthentication } from './auth/auth.initializer';
import { authMiddleware } from './auth/middleware/auth.middleware';

// Create the main application
const app = new Elysia({ aot: false }) // Set aot: false to address potential Elysia helmet issues
  // Add request context middleware for logging and request tracking
  .use(requestContextMiddleware)
  // Add security middleware (rate limiting & security headers)
  .use(securityMiddleware)
  // Add authentication middleware
  .use(authMiddleware)
  .get('/', () => ({
    name: 'Open Badges API',
    version: '1.0.0',
    specification: 'Open Badges 3.0',
    documentation: {
      swagger: '/swagger',
      swaggerUI: '/docs'
    }
  }));

// Database instance for graceful shutdown
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let database: unknown = null;

// Async function to setup repositories and controllers
async function setupApp() {
  try {
    // Initialize the repository factory
    await RepositoryFactory.initialize({
      type: config.database.type,
      connectionString: config.database.connectionString,
      sqliteFile: config.database.sqliteFile,
      sqliteBusyTimeout: config.database.sqliteBusyTimeout,
      sqliteSyncMode: config.database.sqliteSyncMode,
      sqliteCacheSize: config.database.sqliteCacheSize
    });

    // Store database instance for graceful shutdown
    database = await DatabaseFactory.createDatabase(
      config.database.type,
      {
        connectionString: config.database.connectionString,
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

    // Initialize backpack repositories
    const platformRepository = await RepositoryFactory.createPlatformRepository();
    const platformUserRepository = await RepositoryFactory.createPlatformUserRepository();
    const userAssertionRepository = await RepositoryFactory.createUserAssertionRepository();

    // Initialize controllers with repositories
    const issuerController = new IssuerController(issuerRepository);
    const badgeClassController = new BadgeClassController(badgeClassRepository);
    const assertionController = new AssertionController(
      assertionRepository,
      badgeClassRepository,
      issuerRepository
    );

    // Initialize backpack service and controller
    const backpackService = new BackpackService(
      platformRepository,
      platformUserRepository,
      userAssertionRepository,
      assertionRepository
    );
    const backpackController = new BackpackController(backpackService);

    // Create API router with controllers
    const apiRouter = createApiRouter(
      issuerController,
      badgeClassController,
      assertionController,
      backpackController,
      platformRepository
    );

    // Add API routes
    app.use(apiRouter);
    // Add 404 and error handling middleware
    app.use(notFoundHandlerMiddleware);
    app.use(errorHandlerMiddleware);

    // Start the server
    const server = app.listen({
      port: config.server.port,
      hostname: config.server.host
    }, () => {
      logger.info(`Server started successfully`, {
        server: `http://${config.server.host}:${config.server.port}`,
        'swagger docs': `http://${config.server.host}:${config.server.port}/docs`,
        'openapi json': `http://${config.server.host}:${config.server.port}/swagger`
      });

      if (config.auth?.enabled) {
        logger.info('Authentication is enabled');
      } else {
        logger.warn('Authentication is disabled - all endpoints are publicly accessible');
      }
    });

    // Setup graceful shutdown
    setupGracefulShutdown(server);

    return app; // Return the configured app instance

  } catch (error) {
    if (error instanceof Error) {
      logger.logError('Failed to start server', error);
    } else {
      logger.error('Failed to start server', { message: String(error) });
    }
    process.exit(1);
  }
}

// Keep track of setup promise to avoid multiple initializations
let setupPromise: Promise<Elysia> | null = null;

// Start the application
async function bootstrap() {
  // Initialize setup only once
  if (!setupPromise) {
    setupPromise = setupApp();
  }
  // Wait for setup to complete and get the app instance
  await setupPromise;
}

bootstrap();

/**
 * Sets up graceful shutdown handlers for the server
 * @param server The HTTP server instance
 */
function setupGracefulShutdown(server: unknown) {
  // Initialize the shutdown service
  ShutdownService.init(server);

  // Register custom shutdown hooks if needed
  ShutdownService.registerHook(async () => {
    // Custom shutdown logic can be added here
    logger.info('Executing custom shutdown hook...');

    // For example, you might want to save application state
    // or perform other cleanup operations

    return Promise.resolve();
  });
}
