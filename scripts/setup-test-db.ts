/**
 * Test Database Setup Script
 * 
 * This script sets up the test database for running tests:
 * 1. Ensures the test database exists
 * 2. Applies all migrations
 * 3. Cleans up any existing test data
 */

import postgres from 'postgres';
import { join } from 'path';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { drizzle } from 'drizzle-orm/postgres-js';
import { logger } from '../src/utils/logging/logger.service';
import { SensitiveValue } from '@rollercoaster-dev/rd-logger';

// Default connection string for tests
const DEFAULT_CONNECTION_STRING = process.env.DATABASE_URL || 
  `postgres://testuser:testpassword@localhost:5433/openbadges_test`;

async function setupTestDatabase() {
  logger.info('Setting up test database...');
  logger.info('Connection string:', { connectionString: SensitiveValue.from(DEFAULT_CONNECTION_STRING) });

  try {
    // Create PostgreSQL connection
    const client = postgres(DEFAULT_CONNECTION_STRING, { max: 1 });

    try {
      // Verify database connection
      await client`SELECT 1`;
      logger.info('PostgreSQL test database connection verified');
    } catch (error) {
      logger.error('Failed to connect to PostgreSQL test database', error);
      await client.end();
      process.exit(1);
    }

    // Initialize Drizzle ORM
    const db = drizzle(client);

    // Get migrations directory
    const migrationsFolder = join(process.cwd(), 'drizzle', 'pg-migrations');
    logger.info(`Migrations folder: ${migrationsFolder}`);

    // Apply migrations
    logger.info('Applying migrations to test database...');
    await migrate(db, { migrationsFolder });
    logger.info('Migrations applied successfully');

    // Clean up any existing test data
    logger.info('Cleaning up existing test data...');
    
    // Disable triggers to avoid foreign key constraint issues
    await client`SET session_replication_role = 'replica'`;
    
    // Delete all data from tables in reverse order to handle foreign key constraints
    await client`DELETE FROM user_assertions`;
    await client`DELETE FROM user_roles`;
    await client`DELETE FROM platform_users`;
    await client`DELETE FROM assertions`;
    await client`DELETE FROM badge_classes`;
    await client`DELETE FROM issuers`;
    await client`DELETE FROM platforms`;
    await client`DELETE FROM roles`;
    await client`DELETE FROM api_keys`;
    await client`DELETE FROM users`;
    
    // Re-enable triggers
    await client`SET session_replication_role = 'origin'`;
    
    logger.info('Test data cleanup completed');

    // Close database connection
    await client.end();
    logger.info('Test database setup completed successfully');
  } catch (error) {
    logger.error('Error setting up test database', error);
    process.exit(1);
  }
}

// Run the setup
setupTestDatabase();
