/**
 * Database Reset Helper for E2E Tests
 *
 * This helper provides methods for resetting the database between tests
 * to ensure a clean state for each test.
 */

import { DatabaseFactory } from '@/infrastructure/database/database.factory';
import { config } from '@/config/config';
import { logger } from '@/utils/logging/logger.service';

/**
 * Reset the database to a clean state
 */
export async function resetDatabase(): Promise<void> {
  const dbType = process.env.DB_TYPE || config.database.type;

  logger.info('Resetting database', {
    dbType,
    sqliteFile: process.env.SQLITE_DB_PATH || process.env.SQLITE_FILE,
    postgresUrl: process.env.DATABASE_URL ? process.env.DATABASE_URL.replace(/:[^:@]+@/, ':***@') : undefined
  });

  try {
    if (dbType === 'sqlite') {
      await resetSqliteDatabase();
    } else if (dbType === 'postgresql') {
      await resetPostgresDatabase();
    } else {
      throw new Error(`Unsupported database type: ${dbType}`);
    }
    logger.info('Database reset completed successfully');
  } catch (error) {
    logger.error('Failed to reset database', { // Changed from warn to error
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    // Re-throw the error to ensure test failures are visible
    throw error;
  }
}

/**
 * Reset a SQLite database by deleting all data
 *
 * This is a simplified version that doesn't try to access the internal client directly.
 * Instead, it uses the database interface methods to delete data from each table.
 */
async function resetSqliteDatabase(): Promise<void> {
  try {
    logger.info('Resetting SQLite database...');

    // Get database instance
    await DatabaseFactory.createDatabase('sqlite');

    // Tables to clean up (in order to avoid foreign key constraints)
    const tables = [
      'user_assertions',
      'user_roles',
      'platform_users',
      'assertions',
      'badge_classes',
      'issuers',
      'platforms',
      'roles',
      'api_keys',
      'users'
    ];

    logger.info('Resetting database tables', { tables });

    // Get direct access to the SQLite database
    const { Database } = require('bun:sqlite');
    const sqliteFile = process.env.SQLITE_DB_PATH || process.env.SQLITE_FILE || ':memory:';
    logger.debug(`Using SQLite database at: ${sqliteFile}`);
    const sqliteDb = new Database(sqliteFile);

    // Disable foreign key constraints temporarily
    sqliteDb.run('PRAGMA foreign_keys = OFF');

    // Delete all data from each table
    for (const table of tables) {
      try {
        // Use direct SQL to delete all data
        sqliteDb.run(`DELETE FROM ${table}`);

        // Verify the deletion by counting rows
        try {
          const count = sqliteDb.query(`SELECT COUNT(*) as count FROM ${table}`).get();
          logger.debug(`Deleted all data from ${table}, remaining rows: ${count?.count || 0}`);
        } catch (countError) {
          logger.debug(`Could not count rows in ${table}`, {
            error: countError instanceof Error ? countError.message : String(countError)
          });
        }
      } catch (error) {
        // Table might not exist, which is fine
        logger.debug(`Error deleting from ${table}`, {
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    // Re-enable foreign key constraints
    sqliteDb.run('PRAGMA foreign_keys = ON');

    // Add a small delay to ensure all operations are complete
    await new Promise(resolve => setTimeout(resolve, 100));

    logger.info('SQLite database reset successfully');
  } catch (error) {
    logger.error('Failed to reset SQLite database', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

/**
 * Reset a PostgreSQL database by truncating all tables
 *
 * This is a simplified version that doesn't try to access the internal client directly.
 * Instead, it uses the database interface methods to delete data from each table.
 */
async function resetPostgresDatabase(): Promise<void> {
  try {
    logger.info('Resetting PostgreSQL database...');

    // Get database instance - this line establishes connection and ensures DB is available
    await DatabaseFactory.createDatabase('postgresql');

    // Tables to clean up (in order to avoid foreign key constraints)
    const tables = [
      'user_assertions',
      'user_roles',
      'platform_users',
      'assertions',
      'badge_classes',
      'issuers',
      'platforms',
      'roles',
      'api_keys',
      'users'
    ];

    // Get direct access to the PostgreSQL database
    const postgres = await import('postgres');
    const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/openbadges_test';

    try {
      const pgClient = postgres.default(connectionString, {
        max: 1,
        connect_timeout: 10,
        idle_timeout: 10,
        max_lifetime: 60
      });

      try {
        // Disable triggers to avoid foreign key constraint issues
        await pgClient.unsafe(`SET session_replication_role = 'replica'`);

        // Delete all data from each table
        for (const table of tables) {
          try {
            // Use direct SQL to delete all data
            await pgClient.unsafe(`DELETE FROM ${table}`);
            logger.debug(`Deleted all data from ${table}`);
          } catch (error) {
            // Table might not exist, which is fine
            logger.debug(`Error deleting from ${table}`, {
              error: error instanceof Error ? error.message : String(error)
            });
          }
        }

        // Re-enable triggers
        await pgClient.unsafe(`SET session_replication_role = 'origin'`);
      } finally {
        // Always close the connection, even if there's an error
        try {
          await pgClient.end();
        } catch (closeError) {
          logger.warn('Error closing PostgreSQL connection', {
            error: closeError instanceof Error ? closeError.message : String(closeError)
          });
        }
      }
    } catch (error) {
      logger.error('Failed to connect to PostgreSQL database', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      // Re-throw the error to ensure test failures are visible
      throw error;
    }

    logger.info('PostgreSQL database reset successfully');
  } catch (error) {
    logger.error('Failed to reset PostgreSQL database', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}
