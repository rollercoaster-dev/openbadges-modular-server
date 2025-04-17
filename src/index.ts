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

// Create the main application
const app = new Elysia({ aot: false }) // Set aot: false to address potential Elysia helmet issues
  // Add security middleware (rate limiting & security headers)
  .use(securityMiddleware)
  .get('/', () => ({
    name: 'Open Badges API',
    version: '1.0.0',
    specification: 'Open Badges 3.0',
    documentation: '/swagger'
  }));

// Database instance for graceful shutdown
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

    // Start the server
    const server = app.listen({
      port: config.server.port,
      hostname: config.server.host
    }, () => {
      console.log(`Server running at http://${config.server.host}:${config.server.port}`);
      console.log(`API documentation available at http://${config.server.host}:${config.server.port}/swagger`);
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
  // Handle process termination signals
  const signals = ['SIGINT', 'SIGTERM', 'SIGQUIT'];

  for (const signal of signals) {
    process.on(signal, async () => {
      console.log(`\nReceived ${signal}, gracefully shutting down...`);

      // First close the server to stop accepting new connections
      if (server) {
        console.log('Closing HTTP server...');
        server.close(() => {
          console.log('HTTP server closed.');
        });
      }

      // Then close the database connection
      if (database && database.isConnected()) {
        console.log('Closing database connection...');
        try {
          await database.disconnect();
          console.log('Database connection closed.');
        } catch (err) {
          console.error('Error closing database connection:', err);
        }
      }

      // Exit with success code
      console.log('Shutdown complete.');
      process.exit(0);
    });
  }
}

// Start the application
bootstrap();
