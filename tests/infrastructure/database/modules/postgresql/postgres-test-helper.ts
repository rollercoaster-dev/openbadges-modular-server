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
import {
  convertUuid,
  isValidUuid,
} from '@infrastructure/database/utils/type-conversion';
import crypto from 'crypto';

// Environment variable names for PostgreSQL test configuration
const ENV_VARS = {
  TEST_DATABASE_URL: 'TEST_DATABASE_URL',
  PG_TEST_HOST: 'PG_TEST_HOST',
  PG_TEST_PORT: 'PG_TEST_PORT',
  PG_TEST_USER: 'PG_TEST_USER',
  PG_TEST_PASSWORD: 'PG_TEST_PASSWORD',
  PG_TEST_DATABASE: 'PG_TEST_DATABASE',
} as const;

// Determine if running in CI environment
const isCI = process.env.CI === 'true';

/**
 * Builds a PostgreSQL connection string from environment variables or defaults
 * @returns PostgreSQL connection string
 */
function buildConnectionString(): string {
  // Check if a complete connection string is provided
  if (process.env[ENV_VARS.TEST_DATABASE_URL]) {
    return process.env[ENV_VARS.TEST_DATABASE_URL];
  }

  // Build connection string from individual components
  const host =
    process.env[ENV_VARS.PG_TEST_HOST] || (isCI ? 'localhost' : 'localhost');
  const port = process.env[ENV_VARS.PG_TEST_PORT] || (isCI ? '5432' : '5433');
  const user =
    process.env[ENV_VARS.PG_TEST_USER] || (isCI ? 'postgres' : 'testuser');
  const password =
    process.env[ENV_VARS.PG_TEST_PASSWORD] ||
    (isCI ? 'postgres' : 'testpassword');
  const database = process.env[ENV_VARS.PG_TEST_DATABASE] || 'openbadges_test';

  return `postgres://${encodeURIComponent(user)}:${encodeURIComponent(
    password
  )}@${host}:${port}/${database}`;
}

// Default connection string based on environment
export function getDefaultTestConnectionString(): string {
  return buildConnectionString();
}

// Add debug logging for connection attempts
const DEBUG_CONNECTION = true;

/**
 * Validates database name format to prevent SQL injection
 * @param dbName The database name to validate
 * @throws Error if the database name format is invalid
 */
export function validateDatabaseName(dbName: string): void {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(dbName)) {
    throw new Error(
      `Invalid database name format: ${dbName}. Database names must start with a letter or underscore and contain only letters, numbers, and underscores.`
    );
  }
}

/**
 * Generates a valid UUID v4 for testing
 * @returns A valid UUID v4 string
 */
export function generateTestUuid(): string {
  return crypto.randomUUID();
}

/**
 * Generates test data with proper UUID formats for PostgreSQL
 * @param overrides Optional overrides for specific fields
 * @returns Test data object with valid UUIDs
 */
export function generateTestData(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  const baseData = {
    id: generateTestUuid(),
    name: `Test Entity ${Date.now()}`,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };

  // Convert any URN format IDs to plain UUIDs for PostgreSQL
  Object.keys(baseData).forEach((key) => {
    if (
      (key === 'id' || key.endsWith('Id') || key.endsWith('_id')) &&
      typeof baseData[key] === 'string'
    ) {
      const value = baseData[key] as string;
      if (value.startsWith('urn:uuid:')) {
        const convertedValue = convertUuid(value, 'postgresql', 'to');
        // Check if convertUuid returned a valid string, otherwise generate a new UUID
        if (typeof convertedValue === 'string' && convertedValue.length > 0) {
          baseData[key] = convertedValue;
        } else {
          baseData[key] = generateTestUuid();
        }
      } else if (!isValidUuid(value)) {
        // If it's not a valid UUID, generate a new one
        baseData[key] = generateTestUuid();
      }
    }
  });

  return baseData;
}

/**
 * Generates test issuer data with proper UUID format
 * @param overrides Optional overrides for specific fields
 * @returns Test issuer data
 */
export function generateTestIssuerData(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return generateTestData({
    name: `Test Issuer ${Date.now()}`,
    url: 'https://test-issuer.example.com',
    email: `issuer-${Date.now()}@example.com`,
    description: 'Test issuer for PostgreSQL tests',
    image: 'https://test-issuer.example.com/logo.png',
    ...overrides,
  });
}

/**
 * Generates test badge class data with proper UUID format
 * @param issuerId The issuer ID (will be converted to proper format)
 * @param overrides Optional overrides for specific fields
 * @returns Test badge class data
 */
export function generateTestBadgeClassData(
  issuerId: string,
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  // Safely convert issuerId, fallback to new UUID if conversion fails
  const convertedIssuerId = convertUuid(issuerId, 'postgresql', 'to');
  const safeIssuerId =
    typeof convertedIssuerId === 'string' && convertedIssuerId.length > 0
      ? convertedIssuerId
      : generateTestUuid();

  return generateTestData({
    issuerId: safeIssuerId,
    name: `Test Badge Class ${Date.now()}`,
    description: 'Test badge class for PostgreSQL tests',
    image: 'https://test-issuer.example.com/badge.png',
    criteria: JSON.stringify({ narrative: 'Complete the test requirements' }),
    ...overrides,
  });
}

/**
 * Generates test assertion data with proper UUID format
 * @param badgeClassId The badge class ID (will be converted to proper format)
 * @param overrides Optional overrides for specific fields
 * @returns Test assertion data
 */
export function generateTestAssertionData(
  badgeClassId: string,
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  const convertedBadgeClassId = convertUuid(badgeClassId, 'postgresql', 'to');
  const safeBadgeClassId =
    typeof convertedBadgeClassId === 'string' &&
    convertedBadgeClassId.length > 0
      ? convertedBadgeClassId
      : generateTestUuid();

  return generateTestData({
    badgeClassId: safeBadgeClassId,
    recipient: JSON.stringify({
      type: 'email',
      identity: `test-${Date.now()}@example.com`,
      hashed: false,
    }),
    issuedOn: new Date(),
    verification: JSON.stringify({ type: 'hosted' }),
    ...overrides,
  });
}

/**
 * Creates a PostgreSQL client for testing with improved error handling
 * @param connectionString Optional connection string (defaults to environment variable or default test connection)
 * @returns A PostgreSQL client
 */
export function createPostgresClient(connectionString?: string): postgres.Sql {
  // Use provided connection string, or environment variable, or default test connection
  const connString =
    connectionString ||
    process.env.TEST_DATABASE_URL ||
    getDefaultTestConnectionString();

  if (DEBUG_CONNECTION) {
    logger.info('Creating PostgreSQL client', {
      connectionString: SensitiveValue.from(connString),
      isCI: isCI,
      timestamp: new Date().toISOString(),
    });
  }

  // First create a basic client instance to ensure proper cleanup on failure
  let client: postgres.Sql | null = null;

  try {
    // Create the client with optimized settings for tests
    client = postgres(connString, {
      max: 10, // Use a smaller connection pool for tests
      idle_timeout: 10, // Close idle connections faster in tests
      connect_timeout: 10, // Increased timeout for better reliability
      transform: {
        undefined: null, // Transform undefined to null for PostgreSQL compatibility
      },
      onnotice: (notice) => {
        // Log PostgreSQL notices for debugging
        if (DEBUG_CONNECTION) {
          logger.debug('PostgreSQL notice', { notice: notice.message });
        }
      },
    });

    return client;
  } catch (error) {
    // Ensure proper cleanup of any partially opened connections
    if (client) {
      try {
        // Call end() and handle the promise without await since this is not an async function
        client.end().catch((cleanupError) => {
          logger.warn(
            'Failed to cleanup PostgreSQL client during error handling',
            {
              cleanupError:
                cleanupError instanceof Error
                  ? cleanupError.message
                  : String(cleanupError),
            }
          );
        });
      } catch (cleanupError) {
        logger.warn(
          'Failed to initiate cleanup of PostgreSQL client during error handling',
          {
            cleanupError:
              cleanupError instanceof Error
                ? cleanupError.message
                : String(cleanupError),
          }
        );
      }
    }

    logger.error('Failed to create PostgreSQL client', {
      error: error instanceof Error ? error.message : String(error),
      connectionString: SensitiveValue.from(connString),
      isCI: isCI,
    });
    throw error;
  }
}

/**
 * Creates a Drizzle ORM instance for the PostgreSQL client
 * @param client The PostgreSQL client
 * @returns A Drizzle ORM instance
 */
export function createDrizzleInstance(
  client: postgres.Sql
): ReturnType<typeof drizzle> {
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
      error: error instanceof Error ? error.message : String(error),
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
    // Check if user has superuser privileges before setting session_replication_role
    let hasSuperuserPrivileges = false;
    try {
      const [{ rolsuper }] =
        await client`SELECT rolsuper FROM pg_roles WHERE rolname = current_user`;
      hasSuperuserPrivileges = rolsuper;
    } catch (checkError) {
      logger.debug('Could not check superuser privileges', {
        error:
          checkError instanceof Error ? checkError.message : String(checkError),
      });
    }

    // Disable triggers to avoid foreign key constraint issues (if superuser)
    if (hasSuperuserPrivileges) {
      await client`SET session_replication_role = 'replica';`;
    }

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

    // Re-enable triggers (if superuser)
    if (hasSuperuserPrivileges) {
      await client`SET session_replication_role = 'origin';`;
    }

    logger.info('Dropped test tables from PostgreSQL database');
  } catch (error) {
    // Re-enable triggers even if there was an error (if we have superuser privileges)
    try {
      const [{ rolsuper }] =
        await client`SELECT rolsuper FROM pg_roles WHERE rolname = current_user`;
      if (rolsuper) {
        await client`SET session_replication_role = 'origin';`;
      }
    } catch (triggerError) {
      logger.error('Error re-enabling triggers', {
        error:
          triggerError instanceof Error
            ? triggerError.message
            : String(triggerError),
      });
    }

    logger.error('Error dropping test tables from PostgreSQL database', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Cleans up test data from the PostgreSQL database with improved error handling
 * @param client The PostgreSQL client
 */
export async function cleanupTestData(client: postgres.Sql): Promise<void> {
  try {
    logger.info('Starting cleanup of PostgreSQL test data');

    // Wrap the cleanup in a transaction for safety
    await client.begin(async (trx) => {
      // Check if user has superuser privileges before setting session_replication_role
      let hasSuperuserPrivileges = false;
      try {
        const [{ rolsuper }] =
          await trx`SELECT rolsuper FROM pg_roles WHERE rolname = current_user`;
        hasSuperuserPrivileges = rolsuper;
      } catch (checkError) {
        logger.debug('Could not check superuser privileges', {
          error:
            checkError instanceof Error
              ? checkError.message
              : String(checkError),
        });
      }

      // Disable triggers to avoid foreign key constraint issues during cleanup (if superuser)
      if (hasSuperuserPrivileges) {
        await trx`SET session_replication_role = 'replica';`;
      }

      // Delete all data from tables in reverse order to handle foreign key constraints
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
        'users',
      ];

      for (const table of tables) {
        try {
          await trx`DELETE FROM ${trx.unsafe(table)};`;
          if (DEBUG_CONNECTION) {
            logger.debug(`Cleaned data from table: ${table}`);
          }
        } catch (tableError) {
          // Log but don't fail if table doesn't exist
          logger.warn(`Failed to clean data from table ${table}`, {
            error:
              tableError instanceof Error
                ? tableError.message
                : String(tableError),
          });
        }
      }

      // Re-enable triggers (if superuser)
      if (hasSuperuserPrivileges) {
        await trx`SET session_replication_role = 'origin';`;
      }
    });

    logger.info('Successfully cleaned up test data from PostgreSQL database');
  } catch (error) {
    // Re-enable triggers even if there was an error
    try {
      await client`SET session_replication_role = 'origin';`;
    } catch (triggerError) {
      logger.error('Error re-enabling triggers', {
        error:
          triggerError instanceof Error
            ? triggerError.message
            : String(triggerError),
      });
    }

    logger.error('Error cleaning up test data from PostgreSQL database', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

/**
 * Inserts test data with proper UUID conversion
 * @param client The PostgreSQL client
 * @param tableName The table name
 * @param data The data to insert (will be converted for PostgreSQL compatibility)
 * @returns The inserted record with converted IDs
 */
export async function insertTestData(
  client: postgres.Sql,
  tableName: string,
  data: Record<string, unknown>
): Promise<Record<string, unknown>> {
  try {
    // Validate table name to prevent SQL injection
    validateDatabaseName(tableName);

    // Convert the data for PostgreSQL compatibility (clone to avoid mutating input)
    // Use structuredClone if available, fallback to JSON parse/stringify for older environments
    const convertedData =
      typeof globalThis.structuredClone === 'function'
        ? globalThis.structuredClone(data)
        : require('node:util').structuredClone; // Node ≥ 17

    // Convert any URN format IDs to plain UUIDs
    Object.keys(convertedData).forEach((key) => {
      if (
        (key === 'id' || key.endsWith('Id') || key.endsWith('_id')) &&
        typeof convertedData[key] === 'string'
      ) {
        const value = convertedData[key] as string;
        if (value.startsWith('urn:uuid:')) {
          const convertedValue = convertUuid(value, 'postgresql', 'to');
          // Check if convertUuid returned a valid string, otherwise generate a new UUID
          if (typeof convertedValue === 'string' && convertedValue.length > 0) {
            convertedData[key] = convertedValue;
          } else {
            convertedData[key] = generateTestUuid();
          }
        } else if (!isValidUuid(value)) {
          // If it's not a valid UUID, generate a new one
          convertedData[key] = generateTestUuid();
        }
      }
    });

    // Build the insert query dynamically using postgres-js helper
    // Use unsafe() for table name since it's controlled in tests, not user input
    const result = await client`
      INSERT INTO ${client.unsafe(tableName)} ${client(convertedData)}
      RETURNING *
    `;

    if (result.length === 0) {
      throw new Error(`Failed to insert data into ${tableName}`);
    }

    const insertedRecord = result[0] as Record<string, unknown>;

    if (DEBUG_CONNECTION) {
      logger.debug(`Inserted test data into ${tableName}`, {
        tableName,
        recordId: insertedRecord.id,
      });
    }

    return insertedRecord;
  } catch (error) {
    logger.error(`Failed to insert test data into ${tableName}`, {
      error: error instanceof Error ? error.message : String(error),
      tableName,
      data: Object.keys(data),
    });
    throw error;
  }
}

/**
 * Checks if the PostgreSQL database is available
 * @param connectionString Optional connection string
 * @returns True if the database is available, false otherwise
 */
export async function isDatabaseAvailable(
  connectionString?: string
): Promise<boolean> {
  let client: postgres.Sql | null = null;

  try {
    const connString =
      connectionString ||
      process.env.TEST_DATABASE_URL ||
      getDefaultTestConnectionString();

    if (DEBUG_CONNECTION) {
      logger.info('Attempting to connect to PostgreSQL', {
        connectionString: SensitiveValue.from(connString),
        isCI: isCI,
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
            logger.warn(
              'Failed to parse connection string as URL, using fallback method',
              { error: String(urlError) }
            );
            dbName = connString.split('/').pop();
          }

          // Connect to default postgres database to create the test database
          // Use URL object for safer connection string manipulation
          let pgConnString: string;
          try {
            const url = new URL(connString);
            url.pathname = '/postgres';
            pgConnString = url.toString();
          } catch (urlError) {
            // Fallback to string replacement if URL parsing fails
            logger.warn(
              'URL parsing failed, using string replacement fallback',
              { error: String(urlError) }
            );
            pgConnString = connString.replace(dbName || '', 'postgres');
          }

          const pgClient = postgres(pgConnString);

          // Validate database name format to prevent SQL injection
          const finalDbName = dbName || 'openbadges_test';
          validateDatabaseName(finalDbName);

          logger.info(`Attempting to create database ${finalDbName}`);
          try {
            await pgClient`CREATE DATABASE ${pgClient.unsafe(finalDbName)};`;
          } catch (e) {
            if (!String(e).includes('duplicate_database')) throw e;
            logger.debug(`Database ${finalDbName} already exists`);
          }
          await pgClient.end();

          // Close the previous failed client and open a fresh one
          await client.end();
          client = createPostgresClient(connString);
          await client`SELECT 1;`;
          logger.info(
            `Successfully created and connected to database ${dbName}`
          );
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
    let helpMessage =
      'Run "bun run test:pg:setup" to start a PostgreSQL container for testing';

    if (errorMessage.includes('ECONNREFUSED')) {
      detailedMessage =
        'PostgreSQL server is not running. Please start the PostgreSQL server using "bun run test:pg:setup" or Docker directly.';
    } else if (errorMessage.includes('does not exist')) {
      detailedMessage =
        'PostgreSQL database does not exist. Please create the database using "bun run test:pg:setup".';
    } else if (errorMessage.includes('password authentication failed')) {
      detailedMessage =
        'PostgreSQL authentication failed. Please check your credentials in TEST_DATABASE_URL environment variable.';
    } else if (errorMessage.includes('Failed to create database')) {
      detailedMessage =
        'Failed to automatically create the test database. You may need to create it manually or use "bun run test:pg:setup".';
    }

    // Add CI-specific help message
    if (isCI) {
      helpMessage =
        'Check the GitHub Actions workflow configuration for PostgreSQL service setup.';
    }

    logger.warn('PostgreSQL database is not available for testing', {
      error: errorMessage,
      details: detailedMessage || 'See error message for details',
      help: helpMessage,
      environment: isCI ? 'CI' : 'local',
    });
    return false;
  } finally {
    if (client) {
      await client.end();
    }
  }
}
