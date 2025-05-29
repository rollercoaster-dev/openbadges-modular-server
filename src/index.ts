/**
 * Main application entry point for the Open Badges API
 *
 * This file initializes the application, connects to the database,
 * and starts the server.
 */

import { Hono } from 'hono';
import { RepositoryFactory } from './infrastructure/repository.factory';
import { createApiRouter } from './api/api.router';
import { config } from './config/config';
import { createSecurityMiddleware } from './utils/security/security.middleware';
import { IssuerController } from './api/controllers/issuer.controller';
import { BadgeClassController } from './api/controllers/badgeClass.controller';
import { AssertionController } from './api/controllers/assertion.controller';
import { DatabaseFactory } from './infrastructure/database/database.factory';
import { ShutdownService } from './utils/shutdown/shutdown.service';
import { BackpackController } from './domains/backpack/backpack.controller';
import { UserController } from './domains/user/user.controller';
import { UserService } from './domains/user/user.service';
import { BackpackService } from './domains/backpack/backpack.service';
import {
  createErrorHandlerMiddleware,
  handleNotFound,
} from './utils/errors/error-handler.middleware';
import { logger } from './utils/logging/logger.service';

import { createRequestContextMiddleware } from './utils/logging/request-context.middleware';
import { initializeAuthentication } from './auth/auth.initializer';
import {
  createAuthMiddleware,
  createAuthDebugMiddleware,
} from './auth/middleware/auth.middleware';
import { AuthController } from './auth/auth.controller';

// Create the main application
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

// Database instance for graceful shutdown
// We create the database but don't need to store the reference

// Async function to setup repositories and controllers
export async function setupApp(): Promise<Hono> {
  try {
    // Initialize the repository factory
    await RepositoryFactory.initialize({
      type: config.database.type,
      connectionString: config.database.connectionString,
      sqliteFile: config.database.sqliteFile,
      sqliteBusyTimeout: config.database.sqliteBusyTimeout,
      sqliteSyncMode: config.database.sqliteSyncMode,
      sqliteCacheSize: config.database.sqliteCacheSize,
    });

    // Create database instance for connection
    await DatabaseFactory.createDatabase(config.database.type, {
      connectionString: config.database.connectionString,
      sqliteFile: config.database.sqliteFile,
      sqliteBusyTimeout: config.database.sqliteBusyTimeout,
      sqliteSyncMode: config.database.sqliteSyncMode,
      sqliteCacheSize: config.database.sqliteCacheSize,
    });

    logger.info(`Connected to ${config.database.type} database`);

    // Initialize authentication system
    await initializeAuthentication();

    // Initialize repositories
    const issuerRepository = await RepositoryFactory.createIssuerRepository();
    const badgeClassRepository =
      await RepositoryFactory.createBadgeClassRepository();
    const assertionRepository =
      await RepositoryFactory.createAssertionRepository();
    const userRepository = await RepositoryFactory.createUserRepository();

    // Initialize backpack repositories
    const platformRepository =
      await RepositoryFactory.createPlatformRepository();
    const platformUserRepository =
      await RepositoryFactory.createPlatformUserRepository();
    const userAssertionRepository =
      await RepositoryFactory.createUserAssertionRepository();

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

    // Initialize backpack service and controller
    const backpackService = new BackpackService(
      platformRepository,
      platformUserRepository,
      userAssertionRepository,
      assertionRepository
    );
    // Initialize user service
    const userService = new UserService(userRepository);

    // Create backpack, user, and auth controllers
    const backpackController = new BackpackController(backpackService);
    const userController = new UserController(userService);
    const authController = new AuthController(userService);

    // Create API router with controllers
    const apiRouter = await createApiRouter(
      issuerController,
      badgeClassController,
      assertionController,
      backpackController,
      userController,
      authController
    );

    // Add API routes
    app.route('', apiRouter);
    app.notFound(handleNotFound);
    app.use(createErrorHandlerMiddleware());

    // Start the server with Bun
    const server = Bun.serve({
      fetch: app.fetch,
      port: config.server.port,
      hostname: config.server.host,
      development: process.env.NODE_ENV !== 'production',
    });

    logger.info(`Server started successfully`, {
      server: `http://${config.server.host}:${config.server.port}`,
      'swagger docs': `http://${config.server.host}:${config.server.port}/docs`,
      'openapi json': `http://${config.server.host}:${config.server.port}/swagger`,
    });

    if (config.auth?.enabled) {
      logger.info('Authentication is enabled');
    } else {
      logger.warn(
        'Authentication is disabled - all endpoints are publicly accessible'
      );
    }

    setupGracefulShutdown(server);
    return app;
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
let setupPromise: Promise<Hono> | null = null;

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
