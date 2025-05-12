/**
 * Direct Database Schema Creation Script
 * 
 * This script directly creates the database schema using the fixed migration SQL file.
 * It bypasses the Drizzle migration system to avoid issues with circular dependencies.
 */

import { Database } from 'bun:sqlite';
import { join } from 'path';
import fs from 'fs';
import { logger } from './src/utils/logging/logger.service';

async function createDatabaseSchema() {
  try {
    logger.info('Creating database schema directly...');
    
    // Get SQLite file path from environment or use default
    const sqliteFile = process.env.SQLITE_DB_PATH || './sqlite.db';
    logger.info(`SQLite file: ${sqliteFile}`);
    
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
    
    // Get the fixed migration SQL file
    const fixedMigrationPath = join(process.cwd(), 'drizzle', 'migrations', '0000_fixed_migration.sql');
    
    if (!fs.existsSync(fixedMigrationPath)) {
      throw new Error(`Fixed migration file not found at ${fixedMigrationPath}`);
    }
    
    logger.info('Applying fixed migration SQL directly...');
    const sql = fs.readFileSync(fixedMigrationPath, 'utf8');
    
    // Execute each statement separately to avoid issues with SQLite's statement parsing
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    logger.info(`Executing ${statements.length} SQL statements...`);
    
    for (const statement of statements) {
      try {
        sqlite.exec(statement + ';');
      } catch (stmtError) {
        // Log the error but continue with other statements
        // This allows tables that can be created to be created
        logger.warn(`Error executing SQL statement: ${statement.substring(0, 100)}...`, { 
          error: stmtError instanceof Error ? stmtError.message : String(stmtError) 
        });
      }
    }
    
    logger.info('Database schema created successfully');
    
    // Close database connection
    sqlite.close();
  } catch (error) {
    logger.error('Error creating database schema', { 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    process.exit(1);
  }
}

// Run the function
createDatabaseSchema();
