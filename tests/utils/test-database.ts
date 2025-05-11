/**
 * Test Database Configuration Utility
 *
 * This file provides utilities for configuring and checking database availability
 * for tests. It supports both SQLite and PostgreSQL databases.
 */

import { logger } from '@/utils/logging/logger.service';
import { config } from '@/config/config';
import postgres from 'postgres';
import { TestContainersPostgresConfig } from './test-containers';

// Database types
export type DatabaseType = 'sqlite' | 'postgresql';

/**
 * Database configuration for tests
 */
export interface TestDatabaseConfig {
  type: DatabaseType;
  connectionString: string;
  sqliteFile?: string;
  useTestContainers?: boolean;
}

/**
 * Get the database configuration for tests
 * @returns TestDatabaseConfig
 */
export function getTestDatabaseConfig(): TestDatabaseConfig {
  // Default to the configuration from config.ts
  const dbType = (process.env.DB_TYPE || config.database.type) as DatabaseType;

  return {
    type: dbType,
    connectionString: process.env.DATABASE_URL || config.database.connectionString,
    sqliteFile: process.env.SQLITE_FILE || './tests/e2e/test_database.sqlite',
    useTestContainers: process.env.USE_TEST_CONTAINERS === 'true'
  };
}

/**
 * Checks if PostgreSQL is available
 * @param config Optional test container configuration
 * @returns Promise<boolean> True if PostgreSQL is available, false otherwise
 */
export async function isPostgresAvailable(config?: TestContainersPostgresConfig): Promise<boolean> {
  const dbConfig = getTestDatabaseConfig();

  // If we're not using PostgreSQL, return false
  if (dbConfig.type !== 'postgresql') {
    logger.info('Not using PostgreSQL, skipping PostgreSQL availability check');
    return false;
  }

  // If test containers are enabled and config is provided, use the container
  if (dbConfig.useTestContainers && config) {
    try {
      logger.info('Using test containers for PostgreSQL');
      return true;
    } catch (error) {
      logger.warn('Failed to start PostgreSQL test container', {
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  // Get the connection string
  const connectionString = dbConfig.connectionString;

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
  const dbConfig = getTestDatabaseConfig();

  // If we're not using SQLite, return false
  if (dbConfig.type !== 'sqlite') {
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
  const dbConfig = getTestDatabaseConfig();

  if (dbConfig.type === 'postgresql') {
    return await isPostgresAvailable();
  } else if (dbConfig.type === 'sqlite') {
    return await isSqliteAvailable();
  } else {
    logger.warn(`Unknown database type: ${dbConfig.type}`);
    return false;
  }
}
