/**
 * PostgreSQL test helper
 *
 * This file provides utilities for setting up and tearing down PostgreSQL
 * test databases. It uses the postgres-js library to connect to PostgreSQL.
 */

import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { logger } from '@utils/logging/logger.service';

// Default connection string for tests
const DEFAULT_TEST_CONNECTION_STRING = 'postgres://postgres:postgres@localhost:5433/openbadges_test';

// Add debug logging for connection attempts
const DEBUG_CONNECTION = true;

/**
 * Creates a PostgreSQL client for testing
 * @param connectionString Optional connection string (defaults to environment variable or default test connection)
 * @returns A PostgreSQL client
 */
export function createPostgresClient(connectionString?: string): postgres.Sql {
  // Use provided connection string, or environment variable, or default test connection
  const connString = connectionString ||
    process.env.TEST_DATABASE_URL ||
    DEFAULT_TEST_CONNECTION_STRING;

  // Create and return the client
  return postgres(connString, {
    max: 10, // Use a smaller connection pool for tests
    idle_timeout: 10, // Close idle connections faster in tests
    connect_timeout: 5, // Shorter connection timeout for tests
  });
}

/**
 * Creates a Drizzle ORM instance for the PostgreSQL client
 * @param client The PostgreSQL client
 * @returns A Drizzle ORM instance
 */
export function createDrizzleInstance(client: postgres.Sql) {
  return drizzle(client);
}

/**
 * Creates test tables in the PostgreSQL database
 * @param client The PostgreSQL client
 */
export async function createTestTables(client: postgres.Sql): Promise<void> {
  try {
    // Create issuers table
    await client`
      CREATE TABLE IF NOT EXISTS issuers (
        id UUID PRIMARY KEY,
        name TEXT NOT NULL,
        url TEXT NOT NULL,
        email TEXT,
        description TEXT,
        image TEXT,
        public_key JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        additional_fields JSONB
      );
    `;

    // Create badge_classes table
    await client`
      CREATE TABLE IF NOT EXISTS badge_classes (
        id UUID PRIMARY KEY,
        issuer_id UUID NOT NULL REFERENCES issuers(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT,
        image TEXT,
        criteria JSONB,
        alignment JSONB,
        tags JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        additional_fields JSONB
      );
    `;

    // Create assertions table
    await client`
      CREATE TABLE IF NOT EXISTS assertions (
        id UUID PRIMARY KEY,
        badge_class_id UUID NOT NULL REFERENCES badge_classes(id) ON DELETE CASCADE,
        recipient JSONB NOT NULL,
        issued_on TIMESTAMP WITH TIME ZONE NOT NULL,
        expires TIMESTAMP WITH TIME ZONE,
        evidence JSONB,
        verification JSONB,
        revoked JSONB,
        revocation_reason TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        additional_fields JSONB
      );
    `;

    logger.info('Created test tables in PostgreSQL database');
  } catch (error) {
    logger.error('Error creating test tables in PostgreSQL database', {
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

/**
 * Drops test tables from the PostgreSQL database
 * @param client The PostgreSQL client
 */
export async function dropTestTables(client: postgres.Sql): Promise<void> {
  try {
    // Drop tables in reverse order to handle foreign key constraints
    await client`DROP TABLE IF EXISTS assertions;`;
    await client`DROP TABLE IF EXISTS badge_classes;`;
    await client`DROP TABLE IF EXISTS issuers;`;

    logger.info('Dropped test tables from PostgreSQL database');
  } catch (error) {
    logger.error('Error dropping test tables from PostgreSQL database', {
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

/**
 * Cleans up test data from the PostgreSQL database
 * @param client The PostgreSQL client
 */
export async function cleanupTestData(client: postgres.Sql): Promise<void> {
  try {
    // Delete all data from tables in reverse order to handle foreign key constraints
    await client`DELETE FROM assertions;`;
    await client`DELETE FROM badge_classes;`;
    await client`DELETE FROM issuers;`;

    logger.info('Cleaned up test data from PostgreSQL database');
  } catch (error) {
    logger.error('Error cleaning up test data from PostgreSQL database', {
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

/**
 * Checks if the PostgreSQL database is available
 * @param connectionString Optional connection string
 * @returns True if the database is available, false otherwise
 */
export async function isDatabaseAvailable(connectionString?: string): Promise<boolean> {
  let client: postgres.Sql | null = null;

  try {
    const connString = connectionString ||
      process.env.TEST_DATABASE_URL ||
      DEFAULT_TEST_CONNECTION_STRING;

    if (DEBUG_CONNECTION) {
      logger.info('Attempting to connect to PostgreSQL', {
        connectionString: connString
      });
    }

    client = createPostgresClient(connectionString);
    await client`SELECT 1;`;

    if (DEBUG_CONNECTION) {
      logger.info('Successfully connected to PostgreSQL');
    }

    return true;
  } catch (error) {
    logger.warn('PostgreSQL database is not available for testing', {
      error: error instanceof Error ? error.message : String(error)
    });
    return false;
  } finally {
    if (client) {
      await client.end();
    }
  }
}
