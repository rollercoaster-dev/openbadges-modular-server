/**
 * Database availability check for integration tests
 *
 * This file provides utility functions to check if the database is available
 * and to skip tests if it's not.
 */

import { logger } from '@/utils/logging/logger.service';
import { config } from '@/config/config';
import postgres from 'postgres';
import { describe as bunDescribe } from 'bun:test';

/**
 * Checks if PostgreSQL is available
 * @returns Promise<boolean> True if PostgreSQL is available, false otherwise
 */
export async function isPostgresAvailable(): Promise<boolean> {
  // If we're not using PostgreSQL, return false
  if (process.env.DB_TYPE !== 'postgresql' && config.database.type !== 'postgresql') {
    logger.info('Not using PostgreSQL, skipping PostgreSQL availability check');
    return false;
  }

  // Get the connection string
  const connectionString = process.env.DATABASE_URL || config.database.connectionString;

  // Create a PostgreSQL client with a short timeout
  let client: postgres.Sql | null = null;

  try {
    logger.info('Checking PostgreSQL availability');

    // Create a client with a short timeout
    client = postgres(connectionString, {
      max: 1,
      connect_timeout: 3, // 3 seconds timeout
      idle_timeout: 3,
      max_lifetime: 10
    });

    // Try to connect
    await client`SELECT 1`;

    logger.info('PostgreSQL is available');
    return true;
  } catch (error) {
    logger.warn('PostgreSQL is not available', {
      error: error instanceof Error ? error.message : String(error),
      connectionString: connectionString.toString().replace(/:[^:@]+@/, ':***@')
    });
    return false;
  } finally {
    // Close the client
    if (client) {
      await client.end();
    }
  }
}

/**
 * Checks if SQLite is available
 * @returns Promise<boolean> True if SQLite is available, false otherwise
 */
export async function isSqliteAvailable(): Promise<boolean> {
  // If we're not using SQLite, return false
  if (process.env.DB_TYPE !== 'sqlite' && config.database.type !== 'sqlite') {
    logger.info('Not using SQLite, skipping SQLite availability check');
    return false;
  }

  try {
    // Try to import bun:sqlite and create a DB
    const { Database } = await import('bun:sqlite');
    const db = new Database(':memory:');
    db.close();

    logger.info('SQLite is available');
    return true;
  } catch (error) {
    logger.warn('SQLite is not available', {
      error: error instanceof Error ? error.message : String(error)
    });
    return false;
  }
}

/**
 * Checks if the configured database is available
 * @returns Promise<boolean> True if the database is available, false otherwise
 */
export async function isDatabaseAvailable(): Promise<boolean> {
  const dbType = process.env.DB_TYPE || config.database.type;

  if (dbType === 'postgresql') {
    return await isPostgresAvailable();
  } else if (dbType === 'sqlite') {
    return await isSqliteAvailable();
  } else {
    logger.warn(`Unknown database type: ${dbType}`);
    return false;
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
    const dbType = process.env.DB_TYPE || config.database.type;
    logger.warn(`Skipping tests because ${dbType} database is not available`);
    logger.info(`To run these tests with SQLite, use: DB_TYPE=sqlite bun test`);

    if (dbType === 'postgresql') {
      logger.info(`To run these tests with PostgreSQL, use: DB_TYPE=postgresql DATABASE_URL=postgresql://user:password@localhost:5432/db bun test`);
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
  _title: string, // Prefix with underscore to indicate it's intentionally unused
  fn: (describeTest: typeof bunDescribe | typeof bunDescribe.skip) => void
): Promise<void> {
  // Check if the database is available
  const dbAvailable = await isDatabaseAvailable();

  // Create a describe function that skips tests if the database is not available
  const describeTest = createDatabaseAwareDescribe(dbAvailable);

  // Run the test suite
  fn(describeTest);
}
