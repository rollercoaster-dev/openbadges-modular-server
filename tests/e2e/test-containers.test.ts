/**
 * Test for E2E tests with test containers
 */
import { it, expect, afterAll, beforeAll, describe } from 'bun:test';
import { logger } from '@/utils/logging/logger.service';
import { createPostgresContainer, PostgresContainer } from '../utils/test-containers';
import { databaseAwareDescribe } from './utils/test-setup';
import { setupTestApp, stopTestServer } from './setup-test-app';

// Container instance for tests
let container: PostgresContainer | null = null;
let server: unknown = null;

// Use a random port for testing to avoid conflicts
const TEST_PORT = Math.floor(Math.random() * 10000) + 10000; // Random port between 10000-20000
process.env.TEST_PORT = TEST_PORT.toString();

// API endpoints
const API_URL = `http://localhost:${TEST_PORT}`;
const HEALTH_ENDPOINT = `${API_URL}/health`;

// Skip tests if test containers are not enabled
const useTestContainers = process.env.USE_TEST_CONTAINERS === 'true';

// Use database-aware describe to handle database availability
databaseAwareDescribe('E2E Tests with Test Containers', (describeTest) => {
  // Only run these tests if test containers are enabled
  const testFn = useTestContainers ? describeTest : (name: string, fn: () => void) => {
    logger.info(`Skipping test containers tests: ${name}`);
    describe.skip(name, fn);
  };

  testFn('Test Containers', () => {
    beforeAll(async () => {
      try {
        // Create and start PostgreSQL container
        container = await createPostgresContainer();
        await container.start();

        // Set environment variables for the container
        process.env.DATABASE_URL = container.getConnectionUri();
        process.env.POSTGRES_USER = container.getUsername();
        process.env.POSTGRES_PASSWORD = container.getPassword();
        process.env.POSTGRES_HOST = container.getHost();
        process.env.POSTGRES_PORT = container.getPort().toString();
        process.env.POSTGRES_DB = container.getDatabase();
        process.env.DB_TYPE = 'postgresql';

        logger.info('PostgreSQL test container started', {
          connectionString: container.getConnectionUri().replace(/:[^:@]+@/, ':***@')
        });

        // Start the server
        const result = await setupTestApp();
        server = result.server;

        logger.info('Test server started successfully');
      } catch (error) {
        logger.error('Error setting up test containers', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        });
        throw error;
      }
    });

    afterAll(async () => {
      try {
        // Stop the server
        if (server) {
          await stopTestServer(server);
        }

        // Stop the container
        if (container) {
          await container.stop();
        }

        logger.info('Test containers stopped successfully');
      } catch (error) {
        logger.error('Error stopping test containers', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        });
      }
    });

    it('should connect to PostgreSQL database', async () => {
      expect(container).not.toBeNull();
      expect(process.env.DATABASE_URL).toBe(container?.getConnectionUri());
    });

    it('should start the server and respond to health check', async () => {
      // Check if the server is running
      const response = await fetch(HEALTH_ENDPOINT);
      expect(response.status).toBe(200);

      // Check the response body
      const body = await response.json() as { status: string; database: { type: string } };
      expect(body).toHaveProperty('status');
      expect(body.status).toBe('ok');
      expect(body).toHaveProperty('database');
      expect(body.database).toHaveProperty('type');
      expect(body.database.type).toBe('postgresql');
    });
  });
});
