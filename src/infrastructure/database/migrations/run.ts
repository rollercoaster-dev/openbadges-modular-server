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
import { join } from 'path';
import { logger } from '../../../utils/logging/logger.service';

/**
 * Runs database migrations
 */
async function runMigrations() {
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

/**
 * Runs SQLite migrations
 */
async function runSqliteMigrations() {
  logger.info('Running SQLite migrations...');

  // Get SQLite file path
  const sqliteFile = config.database.sqliteFile || 'sqlite.db';
  logger.info(`SQLite file: ${sqliteFile}`);

  // Create SQLite database connection
  const sqlite = new Database(sqliteFile);

  // Apply WAL mode for better concurrency
  sqlite.exec('PRAGMA journal_mode = WAL;');

  // Initialize Drizzle ORM
  const db = drizzle(sqlite);

  // Get migrations directory
  const migrationsFolder = join(process.cwd(), 'drizzle', 'migrations');
  logger.info(`Migrations folder: ${migrationsFolder}`);

  // Run migrations
  logger.info('Applying migrations...');
  await migrate(db, { migrationsFolder });

  // Close database connection
  sqlite.close();

  logger.info('SQLite migrations completed.');
}

/**
 * Runs PostgreSQL migrations
 */
async function runPostgresMigrations() {
  logger.info('Running PostgreSQL migrations...');

  // Get PostgreSQL connection string
  const connectionString = config.database.connectionString || 'postgres://postgres:postgres@localhost:5432/openbadges';
  logger.info(`PostgreSQL connection: ${connectionString.replace(/:[^:]*@/, ':***@')}`); // Hide password

  // Create PostgreSQL connection
  const client = postgres(connectionString, { max: 1 });

  // Initialize Drizzle ORM
  const db = pgDrizzle(client);

  // Get migrations directory
  const migrationsFolder = join(process.cwd(), 'drizzle', 'pg-migrations');
  logger.info(`Migrations folder: ${migrationsFolder}`);

  // Run migrations
  logger.info('Applying migrations...');
  await pgMigrate(db, { migrationsFolder });

  // Close database connection
  await client.end();

  logger.info('PostgreSQL migrations completed.');
}

// Run migrations
runMigrations();
