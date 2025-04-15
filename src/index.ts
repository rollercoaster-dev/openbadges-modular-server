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

// Initialize the database and start the server
async function bootstrap() {
  try {
    // Initialize the repository factory
    await RepositoryFactory.initialize({
      type: config.database.type,
      connectionString: config.database.connectionString
    });
    
    console.log('Connected to database');
    
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
    app.listen({
      port: config.server.port,
      hostname: config.server.host
    }, () => {
      console.log(`Server running at http://${config.server.host}:${config.server.port}`);
      console.log(`API documentation available at http://${config.server.host}:${config.server.port}/swagger`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the application
bootstrap();
