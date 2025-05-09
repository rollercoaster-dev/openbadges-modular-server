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
import { logger } from '../../../utils/logging/logger.service';
import { SensitiveValue } from '@rollercoaster-dev/rd-logger';

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

/**
 * Runs SQLite migrations
 */
async function runSqliteMigrations() {
  logger.info('Running SQLite migrations...');

  // Get SQLite file path
  const sqliteFile = config.database.sqliteFile || 'sqlite.db';
  logger.info(`SQLite file: ${sqliteFile}`);

  try {
    // Ensure the directory for the SQLite file exists
    const dir = dirname(sqliteFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      logger.info(`Created directory for SQLite file: ${dir}`);
    }

    // Create SQLite database connection
    const sqlite = new Database(sqliteFile);

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
      // Get the SQL file path
      const sqlFilePath = join(migrationsFolder, '0000_oval_starbolt_fixed.sql');

      // Check if the file exists
      if (fs.existsSync(sqlFilePath)) {
        logger.info('Applying SQL directly to handle circular references...');
        const sql = fs.readFileSync(sqlFilePath, 'utf8');
        await db.run(sql);
        logger.info('SQL applied successfully.');
      }
    } catch (error) {
      logger.warn('Error applying SQL directly:', error);
      // Continue execution even if this fails
    }

    // Close database connection
    sqlite.close();

    logger.info('SQLite migrations completed.');
  } catch (error) {
    logger.error('SQLite migration error', error);
    throw error;
  }
}

/**
 * Runs PostgreSQL migrations
 */
async function runPostgresMigrations() {
  logger.info('Running PostgreSQL migrations...');

  // Get PostgreSQL connection string
  const connectionString = config.database.connectionString || 'postgres://postgres:postgres@localhost:5432/openbadges';
  // Log connection string with SensitiveValue to automatically mask the password
  logger.info('PostgreSQL connection', { connectionString: SensitiveValue.from(connectionString) });

  try {
    // Create PostgreSQL connection
    const client = postgres(connectionString, { max: 1 });

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
      // Get the SQL file path
      const sqlFilePath = join(migrationsFolder, '0000_strong_gideon.sql');

      // Check if the file exists
      if (fs.existsSync(sqlFilePath)) {
        logger.info('Applying SQL directly to handle circular references...');
        const sql = fs.readFileSync(sqlFilePath, 'utf8');
        await client.unsafe(sql);
        logger.info('SQL applied successfully.');
      }
    } catch (error) {
      logger.warn('Error applying SQL directly:', error);
      // Continue execution even if this fails
    }

    // Close database connection
    await client.end();

    logger.info('PostgreSQL migrations completed.');
  } catch (error) {
    logger.error('PostgreSQL migration error', error);
    throw error;
  }
}

// Run migrations
runMigrations();
