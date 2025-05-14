/**
 * Database Test Filter
 *
 * This helper provides functions to conditionally run tests based on the connected database.
 * It ensures that tests only run for the database that is currently connected.
 */

import { describe, it } from 'bun:test';
import { logger } from '@/utils/logging/logger.service';
import { isPostgresAvailable, isSqliteAvailable } from './database-availability';
import { config } from '@/config/config';

// Cache for database availability to avoid repeated checks
const availabilityCache: Record<string, boolean> = {};

/**
 * Check if a specific database type is available
 * @param dbType The database type to check ('sqlite' or 'postgresql')
 * @returns Promise<boolean> True if the database is available
 */
export async function isDatabaseAvailable(dbType: string): Promise<boolean> {
  // Return from cache if available
  if (availabilityCache[dbType] !== undefined) {
    return availabilityCache[dbType];
  }

  // Check if the database is available
  let isAvailable = false;

  try {
    if (dbType === 'sqlite') {
      isAvailable = await isSqliteAvailable();
    } else if (dbType === 'postgresql') {
      const connectionString = process.env.DATABASE_URL ||
        `postgresql://${process.env.POSTGRES_USER || 'postgres'}:${process.env.POSTGRES_PASSWORD || 'postgres'}@${process.env.POSTGRES_HOST || 'localhost'}:${process.env.POSTGRES_PORT || '5432'}/${process.env.POSTGRES_DB || 'openbadges_test'}`;
      isAvailable = await isPostgresAvailable(connectionString);
    } else {
      logger.warn(`Unknown database type: ${dbType}`);
      isAvailable = false;
    }
  } catch (error) {
    // If there's an error checking availability, assume the database is not available
    logger.warn(`Error checking ${dbType} database availability: ${error instanceof Error ? error.message : String(error)}`);
    isAvailable = false;
  }

  // Cache the result
  availabilityCache[dbType] = isAvailable;
  return isAvailable;
}

/**
 * Check if the current database type matches the specified type
 * @param dbType The database type to check ('sqlite' or 'postgresql')
 * @returns Promise<boolean> True if the current database type matches and is available
 */
export async function isCurrentDatabaseType(dbType: string): Promise<boolean> {
  const currentDbType = process.env.DB_TYPE || config.database.type;

  // If the database type doesn't match, return false immediately
  if (currentDbType !== dbType) {
    return false;
  }

  // Check if the database is available
  const isAvailable = await isDatabaseAvailable(dbType);

  // If the database is not available, log a warning
  if (!isAvailable) {
    logger.warn(`Database type ${dbType} is configured but not available. Tests for this database will be skipped.`);
  }

  return isAvailable;
}

/**
 * Get a describe function that only runs if the specified database is connected
 * @param dbType The database type to check ('sqlite' or 'postgresql')
 * @returns A describe function that only runs if the specified database is connected
 */
export async function getDescribeForDatabase(dbType: string): Promise<any> {
  const isAvailable = await isCurrentDatabaseType(dbType);

  if (isAvailable) {
    logger.info(`Running tests for ${dbType} database`);
    return describe;
  } else {
    logger.info(`Skipping tests for ${dbType} database`);
    return describe.skip;
  }
}

/**
 * Get an it function that only runs if the specified database is connected
 * @param dbType The database type to check ('sqlite' or 'postgresql')
 * @returns An it function that only runs if the specified database is connected
 */
export async function getItForDatabase(dbType: string): Promise<any> {
  const isAvailable = await isCurrentDatabaseType(dbType);

  if (isAvailable) {
    logger.debug(`Running test for ${dbType} database`);
    return it;
  } else {
    logger.debug(`Skipping test for ${dbType} database`);
    return it.skip;
  }
}

/**
 * Get a describe function that only runs for SQLite
 * @returns A describe function that only runs if SQLite is connected
 */
export async function describeSqlite(): Promise<typeof describe> {
  return getDescribeForDatabase('sqlite');
}

/**
 * Get a describe function that only runs for PostgreSQL
 * @returns A describe function that only runs if PostgreSQL is connected
 */
export async function describePostgres(): Promise<typeof describe> {
  return getDescribeForDatabase('postgresql');
}

/**
 * Get an it function that only runs for SQLite
 * @returns An it function that only runs if SQLite is connected
 */
export async function itSqlite(): Promise<typeof it> {
  return getItForDatabase('sqlite');
}

/**
 * Get an it function that only runs for PostgreSQL
 * @returns An it function that only runs if PostgreSQL is connected
 */
export async function itPostgres(): Promise<typeof it> {
  return getItForDatabase('postgresql');
}
