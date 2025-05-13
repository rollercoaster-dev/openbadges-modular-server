/**
 * Database Availability Helper
 * 
 * This helper provides functions to check if PostgreSQL and SQLite are available.
 * It's used to conditionally run tests that require specific database backends.
 */

import { logger } from '@/utils/logging/logger.service';

/**
 * Check if PostgreSQL is available
 * @param connectionString PostgreSQL connection string
 * @returns Promise<boolean> True if PostgreSQL is available
 */
export async function isPostgresAvailable(connectionString: string): Promise<boolean> {
  try {
    const postgres = await import('postgres');
    const sql = postgres.default(connectionString, { max: 1, timeout: 3000 });
    
    try {
      await sql`SELECT 1`;
      await sql.end();
      logger.info('PostgreSQL is available');
      return true;
    } catch (error) {
      logger.warn('PostgreSQL is not available', { error });
      await sql.end();
      return false;
    }
  } catch (error) {
    logger.warn('Failed to import postgres module', { error });
    return false;
  }
}

/**
 * Check if SQLite is available
 * @returns Promise<boolean> True if SQLite is available
 */
export async function isSqliteAvailable(): Promise<boolean> {
  try {
    // Try to import bun:sqlite and create a DB
    const { Database } = await import('bun:sqlite');
    const db = new Database(':memory:');
    db.close();
    logger.info('SQLite is available');
    return true;
  } catch (error) {
    logger.warn('SQLite is not available', { error });
    return false;
  }
}
