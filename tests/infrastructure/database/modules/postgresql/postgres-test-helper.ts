/**
 * PostgreSQL test helper
 *
 * This file provides utilities for setting up and tearing down PostgreSQL
 * test databases. It uses the postgres-js library to connect to PostgreSQL.
 */

import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { logger } from '@utils/logging/logger.service';
import { SensitiveValue } from '@rollercoaster-dev/rd-logger';

// Default connection strings for tests with passwords wrapped in SensitiveValue
const DEFAULT_LOCAL_TEST_CONNECTION_STRING = `postgres://testuser:testpassword@localhost:5433/openbadges_test`;
const DEFAULT_CI_TEST_CONNECTION_STRING = `postgres://postgres:${SensitiveValue.from('postgres')}@localhost:5432/openbadges_test`;

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
      connectionString: SensitiveValue.from(connString),
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
    // Create users table
    await client`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        email TEXT UNIQUE,
        password_hash TEXT,
        name TEXT,
        avatar TEXT,
        bio TEXT,
        verified BOOLEAN DEFAULT FALSE,
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP WITH TIME ZONE,
        metadata JSONB
      );
    `;

    // Create roles table
    await client`
      CREATE TABLE IF NOT EXISTS roles (
        id UUID PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        permissions JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Create user_roles table
    await client`
      CREATE TABLE IF NOT EXISTS user_roles (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Create platforms table
    await client`
      CREATE TABLE IF NOT EXISTS platforms (
        id UUID PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        client_id TEXT NOT NULL,
        public_key TEXT NOT NULL,
        webhook_url TEXT,
        status TEXT DEFAULT 'active' NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Create platform_users table
    await client`
      CREATE TABLE IF NOT EXISTS platform_users (
        id UUID PRIMARY KEY,
        platform_id UUID NOT NULL REFERENCES platforms(id) ON DELETE CASCADE,
        external_user_id TEXT NOT NULL,
        display_name TEXT,
        email TEXT,
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Create api_keys table
    await client`
      CREATE TABLE IF NOT EXISTS api_keys (
        id UUID PRIMARY KEY,
        key TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        description TEXT,
        permissions JSONB NOT NULL,
        revoked BOOLEAN DEFAULT FALSE NOT NULL,
        revoked_at TIMESTAMP WITH TIME ZONE,
        last_used TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

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

    // Create user_assertions table
    await client`
      CREATE TABLE IF NOT EXISTS user_assertions (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES platform_users(id) ON DELETE CASCADE,
        assertion_id UUID NOT NULL REFERENCES assertions(id) ON DELETE CASCADE,
        added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        status TEXT DEFAULT 'active' NOT NULL,
        metadata JSONB
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
    // First, disable triggers to avoid foreign key constraint issues
    await client`SET session_replication_role = 'replica';`;

    // Drop all tables that might have dependencies
    await client`DROP TABLE IF EXISTS user_assertions CASCADE;`;
    await client`DROP TABLE IF EXISTS user_roles CASCADE;`;
    await client`DROP TABLE IF EXISTS platform_users CASCADE;`;
    await client`DROP TABLE IF EXISTS assertions CASCADE;`;
    await client`DROP TABLE IF EXISTS badge_classes CASCADE;`;
    await client`DROP TABLE IF EXISTS issuers CASCADE;`;
    await client`DROP TABLE IF EXISTS platforms CASCADE;`;
    await client`DROP TABLE IF EXISTS roles CASCADE;`;
    await client`DROP TABLE IF EXISTS api_keys CASCADE;`;
    await client`DROP TABLE IF EXISTS users CASCADE;`;

    // Re-enable triggers
    await client`SET session_replication_role = 'origin';`;

    logger.info('Dropped test tables from PostgreSQL database');
  } catch (error) {
    // Re-enable triggers even if there was an error
    try {
      await client`SET session_replication_role = 'origin';`;
    } catch (triggerError) {
      logger.error('Error re-enabling triggers', {
        error: triggerError instanceof Error ? triggerError.message : String(triggerError)
      });
    }

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
    // Disable triggers to avoid foreign key constraint issues during cleanup
    await client`SET session_replication_role = 'replica';`;

    // Delete all data from tables in reverse order to handle foreign key constraints
    await client`DELETE FROM user_assertions;`;
    await client`DELETE FROM user_roles;`;
    await client`DELETE FROM platform_users;`;
    await client`DELETE FROM assertions;`;
    await client`DELETE FROM badge_classes;`;
    await client`DELETE FROM issuers;`;
    await client`DELETE FROM platforms;`;
    await client`DELETE FROM roles;`;
    await client`DELETE FROM api_keys;`;
    await client`DELETE FROM users;`;

    // Re-enable triggers
    await client`SET session_replication_role = 'origin';`;

    logger.info('Cleaned up test data from PostgreSQL database');
  } catch (error) {
    // Re-enable triggers even if there was an error
    try {
      await client`SET session_replication_role = 'origin';`;
    } catch (triggerError) {
      logger.error('Error re-enabling triggers', {
        error: triggerError instanceof Error ? triggerError.message : String(triggerError)
      });
    }

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
        connectionString: SensitiveValue.from(connString),
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
          // Extract database name from connection string using URL parser for robustness
          let dbName: string | undefined;
          try {
            dbName = new URL(connString).pathname.split('/').pop();
          } catch (urlError) {
            // Fallback to simple splitting if URL parsing fails
            logger.warn('Failed to parse connection string as URL, using fallback method', { error: String(urlError) });
            dbName = connString.split('/').pop();
          }

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
