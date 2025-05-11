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

  if (dbType === 'sqlite') {
    await resetSqliteDatabase();
  } else if (dbType === 'postgresql') {
    await resetPostgresDatabase();
  } else {
    throw new Error(`Unsupported database type: ${dbType}`);
  }
}

/**
 * Reset a SQLite database by deleting all data
 */
async function resetSqliteDatabase(): Promise<void> {
  try {
    logger.info('Resetting SQLite database...');

    // Get database instance
    const db = await DatabaseFactory.createDatabase('sqlite');

    // Tables to clean up (in order to avoid foreign key constraints)
    const tables = ['assertions', 'badge_classes', 'issuers', 'users'];

    // Use the query method instead of execute
    // Disable foreign key constraints temporarily
    await db.query('PRAGMA foreign_keys = OFF;');

    // Delete all data from each table
    for (const table of tables) {
      try {
        await db.query(`DELETE FROM ${table};`);
        logger.debug(`Deleted all data from ${table}`);
      } catch (error) {
        // Table might not exist, which is fine
        logger.debug(`Error deleting from ${table}`, {
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    // Re-enable foreign key constraints
    await db.query('PRAGMA foreign_keys = ON;');

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
 */
async function resetPostgresDatabase(): Promise<void> {
  try {
    logger.info('Resetting PostgreSQL database...');

    // Get database instance
    const db = await DatabaseFactory.createDatabase('postgresql');

    // Use a transaction to ensure atomicity
    try {
      // Disable triggers temporarily and truncate all tables
      await db.query(`
        DO $$
        BEGIN
          -- Disable triggers temporarily
          SET session_replication_role = 'replica';

          -- Truncate all tables in the public schema
          -- This handles tables with foreign key constraints correctly
          TRUNCATE TABLE
            assertions,
            badge_classes,
            issuers,
            users
          CASCADE;

          -- Re-enable triggers
          SET session_replication_role = 'origin';
        END $$;
      `);

      logger.info('PostgreSQL database reset successfully');
    } catch (error) {
      // Some tables might not exist, try individual truncates
      logger.warn('Failed to truncate all tables at once, trying individually', {
        error: error instanceof Error ? error.message : String(error)
      });

      // Disable triggers
      await db.query('SET session_replication_role = \'replica\';');

      // Tables to clean up (in order to avoid foreign key constraints)
      const tables = ['assertions', 'badge_classes', 'issuers', 'users'];

      // Truncate each table individually
      for (const table of tables) {
        try {
          await db.query(`TRUNCATE TABLE ${table} CASCADE;`);
          logger.debug(`Truncated table ${table}`);
        } catch (error) {
          // Table might not exist, which is fine
          logger.debug(`Error truncating ${table}`, {
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }

      // Re-enable triggers
      await db.query('SET session_replication_role = \'origin\';');

      logger.info('PostgreSQL database reset successfully (individual tables)');
    }
  } catch (error) {
    logger.error('Failed to reset PostgreSQL database', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}
