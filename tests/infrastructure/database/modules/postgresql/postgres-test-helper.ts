/**
 * PostgreSQL test helper
 *
 * This file provides utilities for setting up and tearing down PostgreSQL
 * test databases. It uses the postgres-js library to connect to PostgreSQL.
 */

import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { logger } from '@utils/logging/logger.service';

// Default connection strings for tests
const DEFAULT_LOCAL_TEST_CONNECTION_STRING = 'postgres://postgres:postgres@localhost:5433/openbadges_test';
const DEFAULT_CI_TEST_CONNECTION_STRING = 'postgres://postgres:postgres@localhost:5432/openbadges_test';

// Determine if running in CI environment
const isCI = process.env.CI === 'true';

// Default connection string based on environment
export const DEFAULT_TEST_CONNECTION_STRING = isCI ? DEFAULT_CI_TEST_CONNECTION_STRING : DEFAULT_LOCAL_TEST_CONNECTION_STRING;

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

  if (DEBUG_CONNECTION) {
    logger.info('Creating PostgreSQL client', {
      connectionString: connString,
      isCI: isCI
    });
  }

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
export function createDrizzleInstance(client: postgres.Sql): ReturnType<typeof drizzle> {
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
        connectionString: connString,
        isCI: isCI
      });
    }

    client = createPostgresClient(connString);

    // First try to connect to the server
    try {
      await client`SELECT 1;`;
    } catch (connectError) {
      // If the database doesn't exist, try to create it
      if (String(connectError).includes('does not exist')) {
        try {
          // Extract database name from connection string
          const dbName = connString.split('/').pop();

          // Connect to default postgres database to create the test database
          const pgClient = postgres(connString.replace(dbName || '', 'postgres'));

          logger.info(`Attempting to create database ${dbName}`);
          await pgClient`CREATE DATABASE ${pgClient(dbName || 'openbadges_test')};`;
          await pgClient.end();

          // Try connecting again
          await client`SELECT 1;`;
          logger.info(`Successfully created and connected to database ${dbName}`);
        } catch (createError) {
          throw new Error(`Failed to create database: ${createError}`);
        }
      } else {
        throw connectError;
      }
    }

    if (DEBUG_CONNECTION) {
      logger.info('Successfully connected to PostgreSQL');
    }

    return true;
  } catch (error) {
    // Provide more detailed error message based on the error type
    let errorMessage = error instanceof Error ? error.message : String(error);
    let detailedMessage = '';
    let helpMessage = 'Run "bun run test:pg:setup" to start a PostgreSQL container for testing';

    if (errorMessage.includes('ECONNREFUSED')) {
      detailedMessage = 'PostgreSQL server is not running. Please start the PostgreSQL server using "bun run test:pg:setup" or Docker directly.';
    } else if (errorMessage.includes('does not exist')) {
      detailedMessage = 'PostgreSQL database does not exist. Please create the database using "bun run test:pg:setup".';
    } else if (errorMessage.includes('password authentication failed')) {
      detailedMessage = 'PostgreSQL authentication failed. Please check your credentials in TEST_DATABASE_URL environment variable.';
    } else if (errorMessage.includes('Failed to create database')) {
      detailedMessage = 'Failed to automatically create the test database. You may need to create it manually or use "bun run test:pg:setup".';
    }

    // Add CI-specific help message
    if (isCI) {
      helpMessage = 'Check the GitHub Actions workflow configuration for PostgreSQL service setup.';
    }

    logger.warn('PostgreSQL database is not available for testing', {
      error: errorMessage,
      details: detailedMessage || 'See error message for details',
      help: helpMessage,
      environment: isCI ? 'CI' : 'local'
    });
    return false;
  } finally {
    if (client) {
      await client.end();
    }
  }
}
