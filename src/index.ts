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
import { errorHandlerMiddleware, notFoundHandlerMiddleware } from './utils/errors/error-handler.middleware';

// Create the main application
const app = new Elysia({ aot: false }) // Set aot: false to address potential Elysia helmet issues
  // Add security middleware (rate limiting & security headers)
  .use(securityMiddleware)
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
let database: any = null;

// Initialize the database and start the server
async function bootstrap() {
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

    console.log(`Connected to ${config.database.type} database`);

    // Initialize repositories
    const issuerRepository = RepositoryFactory.createIssuerRepository();
    const badgeClassRepository = RepositoryFactory.createBadgeClassRepository();
    const assertionRepository = RepositoryFactory.createAssertionRepository();

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
    app.use(apiRouter);
    // Add 404 and error handling middleware
    app.use(notFoundHandlerMiddleware);
    app.use(errorHandlerMiddleware);

    // Start the server
    const server = app.listen({
      port: config.server.port,
      hostname: config.server.host
    }, () => {
      console.log(`Server running at http://${config.server.host}:${config.server.port}`);
      console.log(`API documentation available at:`);
      console.log(`  - Swagger UI: http://${config.server.host}:${config.server.port}/docs`);
      console.log(`  - OpenAPI JSON: http://${config.server.host}:${config.server.port}/swagger`);
    });

    // Setup graceful shutdown
    setupGracefulShutdown(server);

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

/**
 * Sets up graceful shutdown handlers for the server
 * @param server The HTTP server instance
 */
function setupGracefulShutdown(server: any) {
  // Initialize the shutdown service
  ShutdownService.init(server);

  // Register custom shutdown hooks if needed
  ShutdownService.registerHook(async () => {
    // Custom shutdown logic can be added here
    console.log('Executing custom shutdown hook...');

    // For example, you might want to save application state
    // or perform other cleanup operations

    return Promise.resolve();
  });
}

// Start the application
bootstrap();
