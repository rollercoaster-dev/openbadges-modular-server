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
    const sql = postgres.default(connectionString, {
      max: 1,
      timeout: 3000,
      connect_timeout: 5,
      idle_timeout: 5
    });

    try {
      await sql`SELECT 1`;
      logger.info('PostgreSQL is available');
      return true;
    } catch (error) {
      logger.warn('PostgreSQL is not available', {
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    } finally {
      // Always try to close the connection
      try {
        await sql.end();
      } catch (closeError) {
        logger.debug('Error closing PostgreSQL connection', {
          error: closeError instanceof Error ? closeError.message : String(closeError)
        });
      }
    }
  } catch (error) {
    logger.warn('Failed to import postgres module', {
      error: error instanceof Error ? error.message : String(error)
    });
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

    // Try to execute a simple query to verify it's working
    try {
      db.query('PRAGMA integrity_check').get();
      logger.info('SQLite is available');
      return true;
    } catch (queryError) {
      logger.warn('SQLite query failed', {
        error: queryError instanceof Error ? queryError.message : String(queryError)
      });
      return false;
    } finally {
      // Always try to close the database
      try {
        db.close();
      } catch (closeError) {
        logger.debug('Error closing SQLite database', {
          error: closeError instanceof Error ? closeError.message : String(closeError)
        });
      }
    }
  } catch (error) {
    logger.warn('SQLite is not available', {
      error: error instanceof Error ? error.message : String(error)
    });
    return false;
  }
}
