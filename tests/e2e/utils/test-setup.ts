/**
 * E2E Test Setup Utility
 *
 * This file provides utilities for setting up E2E tests, including
 * database configuration, server setup, and test skipping logic.
 */

import { describe as bunDescribe } from 'bun:test';
import { logger } from '@/utils/logging/logger.service';
import { isDatabaseAvailable, getTestDatabaseConfig } from '../../utils/test-database';
import { createPostgresContainer, PostgresContainer } from '../../utils/test-containers';

// Global container reference for cleanup
let postgresContainer: PostgresContainer | null = null;

/**
 * Initialize test database
 * Sets up the database for tests, including starting a container if needed
 * @returns Promise<boolean> True if database is available, false otherwise
 */
export async function initializeTestDatabase(): Promise<boolean> {
  const dbConfig = getTestDatabaseConfig();

  // If using test containers for PostgreSQL, start the container
  if (dbConfig.type === 'postgresql' && dbConfig.useTestContainers) {
    try {
      logger.info('Starting PostgreSQL test container');
      postgresContainer = await createPostgresContainer();
      await postgresContainer.start();

      // Set environment variables for the container
      process.env.DATABASE_URL = postgresContainer.getConnectionUri();
      process.env.POSTGRES_USER = postgresContainer.getUsername();
      process.env.POSTGRES_PASSWORD = postgresContainer.getPassword();
      process.env.POSTGRES_HOST = postgresContainer.getHost();
      process.env.POSTGRES_PORT = postgresContainer.getPort().toString();
      process.env.POSTGRES_DB = postgresContainer.getDatabase();

      logger.info('PostgreSQL test container started', {
        connectionString: postgresContainer.getConnectionUri().replace(/:[^:@]+@/, ':***@')
      });

      return true;
    } catch (error) {
      logger.error('Failed to start PostgreSQL test container', {
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  // Otherwise, check if the configured database is available
  return await isDatabaseAvailable();
}

/**
 * Cleanup test database
 * Stops any running containers and cleans up resources
 */
export async function cleanupTestDatabase(): Promise<void> {
  if (postgresContainer) {
    try {
      logger.info('Stopping PostgreSQL test container');
      await postgresContainer.stop();
      postgresContainer = null;
    } catch (error) {
      logger.error('Failed to stop PostgreSQL test container', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
}

/**
 * Create a describe function that skips tests if the database is not available
 * @param dbAvailable Whether the database is available
 * @returns A describe function that skips tests if the database is not available
 */
export function createDatabaseAwareDescribe(dbAvailable: boolean): typeof bunDescribe | typeof bunDescribe.skip {
  // Use the appropriate describe function based on database availability
  const describeTest = dbAvailable ? bunDescribe : bunDescribe.skip;

  // Log a message if tests are being skipped
  if (!dbAvailable) {
    const dbConfig = getTestDatabaseConfig();
    logger.warn(`Skipping tests because ${dbConfig.type} database is not available`);
    logger.info(`To run these tests with SQLite, use: DB_TYPE=sqlite bun test`);

    if (dbConfig.type === 'postgresql') {
      logger.info(`To run these tests with PostgreSQL test containers, use: DB_TYPE=postgresql USE_TEST_CONTAINERS=true bun test`);
    }
  }

  return describeTest;
}

/**
 * Create a test suite that is database-aware
 * @param title Test suite title
 * @param fn Test suite function
 * @returns Promise that resolves when the test suite is complete
 */
export async function databaseAwareDescribe(
  _title: string, // Title is used in the function passed to describeTest
  fn: (describeTest: typeof bunDescribe | typeof bunDescribe.skip) => void
): Promise<void> {
  // Initialize the database
  const dbAvailable = await initializeTestDatabase();

  // Create a describe function that skips tests if the database is not available
  const describeTest = createDatabaseAwareDescribe(dbAvailable);

  // Run the test suite
  fn(describeTest);

  // Register cleanup handler
  if (dbAvailable) {
    process.on('exit', () => {
      cleanupTestDatabase().catch(error => {
        logger.error('Failed to clean up test database', {
          error: error instanceof Error ? error.message : String(error)
        });
      });
    });
  }
}
