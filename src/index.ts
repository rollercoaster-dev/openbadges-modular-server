/**
 * Main application entry point for the Open Badges API
 * 
 * This file initializes the application, connects to the database,
 * and starts the server.
 */

import { Elysia } from 'elysia';
import { RepositoryFactory } from './infrastructure/repository.factory';
import { apiRouter } from './api/api.router';
import { config } from './config/config';

// Create the main application
const app = new Elysia()
  .use(apiRouter)
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
    
    // Start the server
    app.listen(config.server.port, config.server.host, () => {
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
