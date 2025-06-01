/**
 * Database Migration Runner
 *
 * This script runs database migrations using Drizzle ORM.
 * It supports both SQLite and PostgreSQL databases.
 */

import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import { migrate as pgMigrate } from 'drizzle-orm/postgres-js/migrator';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { drizzle as pgDrizzle } from 'drizzle-orm/postgres-js';
import { Database } from 'bun:sqlite';
import postgres from 'postgres';
import { config } from '../../../config/config';
import { join, dirname } from 'path';
import fs from 'fs';
import { logger } from '@/utils/logging/logger.service';
import { SensitiveValue } from '@rollercoaster-dev/rd-logger';

/**
 * Runs SQLite migrations
 */
async function runSqliteMigrations(): Promise<void> {
  logger.info('Running SQLite migrations...');

  // Get SQLite file path
  const sqliteFile = config.database.sqliteFile || 'sqlite.db';
  logger.info(`SQLite file: ${sqliteFile}`);

  // Ensure the directory for the SQLite file exists
  const dir = dirname(sqliteFile);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    logger.info(`Created directory for SQLite file: ${dir}`);
  }

  // Create SQLite database connection
  const sqlite = new Database(sqliteFile);
  try {
    // Verify database connection
    try {
      // Simple query to verify the database is accessible
      sqlite.query('SELECT 1');
      logger.info('SQLite database connection verified');
    } catch (error) {
      logger.error('Failed to verify SQLite database connection', error);
      throw new Error('SQLite database verification failed');
    }

    // Apply WAL mode for better concurrency
    sqlite.exec('PRAGMA journal_mode = WAL;');

    // Initialize Drizzle ORM
    const db = drizzle(sqlite);

    // Get migrations directory
    const migrationsFolder = join(process.cwd(), 'drizzle', 'migrations');
    logger.info(`Migrations folder: ${migrationsFolder}`);

    // Run migrations
    logger.info('Applying migrations...');
    // Note: migrate() for SQLite may not return a Promise in some versions of drizzle-orm
    // We use Promise.resolve to ensure it's handled properly either way
    await Promise.resolve(migrate(db, { migrationsFolder }));

    // Apply SQL directly to handle circular references
    try {
      // Get the SQL file path - try the new fixed migration first
      const fixedMigrationPath = join(
        migrationsFolder,
        '0000_fixed_migration.sql'
      );

      // Check if the new fixed file exists
      if (fs.existsSync(fixedMigrationPath)) {
        logger.info('Applying fixed migration SQL directly...');

        // Read the file line by line to avoid issues with SQLite's statement parsing
        const sql = fs.readFileSync(fixedMigrationPath, 'utf8');

        try {
          // Try to execute the entire file at once
          sqlite.exec(sql);
          logger.info('Successfully executed the entire migration file');
        } catch (error) {
          logger.error(
            'Failed to execute migration file as a whole, trying statement by statement',
            error
          );

          // Split by semicolons and filter out empty statements
          const statements = sql
            .split(';')
            .map((stmt) => stmt.trim())
            .filter((stmt) => stmt.length > 0);

          // Execute each statement individually
          for (const statement of statements) {
            try {
              // Skip comments and empty lines
              if (statement.startsWith('--') || statement.trim() === '') {
                continue;
              }

              // Execute the statement
              logger.info(
                `Executing statement: ${statement.substring(0, 50)}...`
              );
              sqlite.exec(statement + ';');
            } catch (stmtError) {
              // Check if this is an "already exists" error that we can safely ignore
              const errorMessage =
                stmtError instanceof Error
                  ? stmtError.message
                  : String(stmtError);
              const isAlreadyExistsError =
                errorMessage.includes('already exists') ||
                errorMessage.includes('SQLITE_CONSTRAINT');

              if (isAlreadyExistsError) {
                logger.info(
                  `Table/index already exists, continuing: ${statement.substring(
                    0,
                    50
                  )}...`
                );
              } else {
                // For non-"already exists" errors, log and abort migration
                logger.error(
                  `Fatal error executing SQL statement: ${statement.substring(
                    0,
                    100
                  )}...`,
                  {
                    error: errorMessage,
                    statement: statement.substring(0, 200),
                  }
                );
                throw new Error(
                  `Migration failed on statement: ${errorMessage}`
                );
              }
            }
          }
        }

        logger.info('Fixed migration SQL applied successfully.');
      } else {
        // Fall back to the original fixed file if the new one doesn't exist
        const originalFixedPath = join(
          migrationsFolder,
          '0000_oval_starbolt_fixed.sql'
        );

        if (fs.existsSync(originalFixedPath)) {
          logger.info(
            'New fixed migration not found, applying original fixed SQL...'
          );
          const sql = fs.readFileSync(originalFixedPath, 'utf8');

          try {
            // Try to execute the entire file at once
            sqlite.exec(sql);
            logger.info('Successfully executed the original migration file');
          } catch (error) {
            logger.error(
              'Failed to execute original migration file as a whole, trying statement by statement',
              error
            );

            // Split by semicolons and filter out empty statements
            const statements = sql
              .split(';')
              .map((stmt) => stmt.trim())
              .filter((stmt) => stmt.length > 0);

            // Execute each statement individually
            for (const statement of statements) {
              try {
                // Skip comments and empty lines
                if (statement.startsWith('--') || statement.trim() === '') {
                  continue;
                }

                // Execute the statement
                logger.info(
                  `Executing statement: ${statement.substring(0, 50)}...`
                );
                sqlite.exec(statement + ';');
              } catch (stmtError) {
                // Check if this is an "already exists" error that we can safely ignore
                const errorMessage =
                  stmtError instanceof Error
                    ? stmtError.message
                    : String(stmtError);
                const isAlreadyExistsError =
                  errorMessage.includes('already exists') ||
                  errorMessage.includes('SQLITE_CONSTRAINT');

                if (isAlreadyExistsError) {
                  logger.info(
                    `Table/index already exists, continuing: ${statement.substring(
                      0,
                      50
                    )}...`
                  );
                } else {
                  // For non-"already exists" errors, log and abort migration
                  logger.error(
                    `Fatal error executing SQL statement: ${statement.substring(
                      0,
                      100
                    )}...`,
                    {
                      error: errorMessage,
                      statement: statement.substring(0, 200),
                    }
                  );
                  throw new Error(
                    `Migration failed on statement: ${errorMessage}`
                  );
                }
              }
            }
          }

          logger.info('Original fixed SQL applied successfully.');
        } else {
          logger.warn('No fixed migration files found');
        }
      }
    } catch (error) {
      logger.error('SQLite migration failed:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      // Re-throw to prevent application from starting with a broken database state
      throw error;
    }

    // Create custom indexes after migrations are complete
    try {
      logger.info('Creating custom indexes after migrations...');
      const { SqliteModule } = await import('../modules/sqlite/sqlite.module');
      const sqliteModule = new SqliteModule();
      sqliteModule.createIndexesAfterMigrations(sqlite);
      logger.info('Custom indexes created successfully after migrations.');
    } catch (error) {
      logger.warn('Failed to create custom indexes after migrations', {
        error: error instanceof Error ? error.message : String(error),
      });
      // Non-critical - continue
    }

    logger.info('SQLite migrations completed.');
  } catch (error) {
    logger.error('SQLite migration error', error);
    throw error;
  } finally {
    // Safeguard – even if already closed, `close()` is idempotent
    sqlite.close();
  }
}

/**
 * Runs PostgreSQL migrations
 */
async function runPostgresMigrations(): Promise<void> {
  logger.info('Running PostgreSQL migrations...');

  // Get PostgreSQL connection string
  const connectionString =
    config.database.connectionString ||
    'postgres://postgres:postgres@localhost:5432/openbadges';
  // Log connection string with SensitiveValue to automatically mask the password
  logger.info('PostgreSQL connection', {
    connectionString: SensitiveValue.from(connectionString),
  });

  const client = postgres(connectionString, { max: 1 });
  try {
    // Verify database connection
    try {
      // Simple query to verify the database is accessible
      await client`SELECT 1`;
      logger.info('PostgreSQL database connection verified');
    } catch (error) {
      logger.error('Failed to verify PostgreSQL database connection', error);
      await client.end();
      throw new Error('PostgreSQL database verification failed');
    }

    // Initialize Drizzle ORM
    const db = pgDrizzle(client);

    // Get migrations directory
    const migrationsFolder = join(process.cwd(), 'drizzle', 'pg-migrations');
    logger.info(`Migrations folder: ${migrationsFolder}`);

    // Run migrations
    logger.info('Applying migrations...');
    await pgMigrate(db, { migrationsFolder });

    // Apply SQL directly to handle circular references
    try {
      // Get the SQL file path - try the new fixed migration first
      const fixedMigrationPath = join(
        migrationsFolder,
        '0000_fixed_migration.sql'
      );

      // Check if the new fixed file exists
      if (fs.existsSync(fixedMigrationPath)) {
        logger.info('Applying fixed migration SQL directly...');
        const sql = fs.readFileSync(fixedMigrationPath, 'utf8');

        // Execute each statement separately to avoid issues with statement parsing
        const statements = sql
          .split(';')
          .map((stmt) => stmt.trim())
          .filter((stmt) => stmt.length > 0);

        for (const statement of statements) {
          try {
            // Execute the statement directly
            await client.unsafe(statement + ';');
          } catch (stmtError) {
            const errorMessage =
              stmtError instanceof Error
                ? stmtError.message
                : String(stmtError);

            // Check if this is an "already exists" error that we can safely ignore
            const isAlreadyExistsError =
              errorMessage.includes('already exists') ||
              (errorMessage.includes('relation') &&
                errorMessage.includes('already exists')) ||
              (errorMessage.includes('constraint') &&
                errorMessage.includes('already exists'));

            // Check if this is a "does not exist" error that indicates schema drift
            const isDoesNotExistError =
              (errorMessage.includes('relation') &&
                errorMessage.includes('does not exist')) ||
              (errorMessage.includes('column') &&
                errorMessage.includes('does not exist')) ||
              (errorMessage.includes('table') &&
                errorMessage.includes('does not exist'));

            if (isAlreadyExistsError) {
              logger.info(
                `Schema object already exists, continuing with next statement`,
                {
                  statement: statement.substring(0, 50) + '...',
                }
              );
            } else if (isDoesNotExistError) {
              // These errors indicate schema drift and should be treated seriously
              logger.error(
                `Schema drift detected: attempting to modify non-existent object`,
                {
                  error: errorMessage,
                  statement: statement.substring(0, 100) + '...',
                  isCI: process.env.CI === 'true',
                }
              );

              // In CI, fail immediately on schema drift
              if (process.env.CI === 'true') {
                throw new Error(`Schema drift detected in CI: ${errorMessage}`);
              } else {
                // In development, log as warning but continue
                logger.warn(
                  'Continuing despite schema drift in development environment'
                );
              }
            } else {
              // For other errors, log and abort migration
              logger.error(
                `Fatal error executing PostgreSQL statement: ${statement.substring(
                  0,
                  100
                )}...`,
                {
                  error: errorMessage,
                  statement: statement.substring(0, 200),
                }
              );
              throw new Error(
                `PostgreSQL migration failed on statement: ${errorMessage}`
              );
            }
          }
        }

        logger.info('Fixed migration SQL applied successfully.');
      } else {
        // Try the original fixed file
        const sqlFilePath = join(
          migrationsFolder,
          '0000_strong_gideon_fixed.sql'
        );

        // Check if the file exists
        if (fs.existsSync(sqlFilePath)) {
          logger.info('Applying fixed SQL directly...');
          const sql = fs.readFileSync(sqlFilePath, 'utf8');
          await client.unsafe(sql);
          logger.info('Fixed SQL applied successfully.');
        } else {
          // Try the original file as a fallback
          const originalSqlFilePath = join(
            migrationsFolder,
            '0000_strong_gideon.sql'
          );
          if (fs.existsSync(originalSqlFilePath)) {
            logger.info(
              'Fixed SQL file not found, applying original SQL file...'
            );
            const sql = fs.readFileSync(originalSqlFilePath, 'utf8');
            await client.unsafe(sql);
            logger.info('Original SQL applied successfully.');
          } else {
            logger.warn('No SQL migration files found for PostgreSQL');
          }
        }
      }
    } catch (error) {
      logger.error('PostgreSQL migration failed:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      // Re-throw to prevent application from starting with a broken database state
      throw error;
    }

    logger.info('PostgreSQL migrations completed.');
  } catch (error) {
    logger.error('PostgreSQL migration error', error);
    throw error;
  } finally {
    // Safeguard – even if already closed, `end()` is idempotent
    await client.end();
  }
}

/**
 * Runs database migrations
 */
async function runMigrations() {
  // DEBUG: Log the raw environment variable
  // console.log('DEBUG process.env.DB_TYPE:', process.env.DB_TYPE); // Removed debug line
  logger.info('Running database migrations...');
  logger.info(`Database type: ${config.database.type}`);

  try {
    if (config.database.type === 'sqlite') {
      await runSqliteMigrations();
    } else if (config.database.type === 'postgresql') {
      await runPostgresMigrations();
    } else {
      throw new Error(`Unsupported database type: ${config.database.type}`);
    }

    logger.info('Migrations completed successfully.');
  } catch (error) {
    logger.error('Error running migrations:', error);
    process.exit(1);
  }
}

// Run migrations
runMigrations();
