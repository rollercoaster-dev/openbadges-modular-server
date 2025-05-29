/**
 * Database Conditional E2E Tests
 *
 * This file demonstrates how to use conditional testing based on database availability.
 * It shows how to skip PostgreSQL tests when PostgreSQL is not available,
 * while still allowing SQLite tests to run.
 */

import {
  describe,
  it,
  expect,
  afterAll,
  beforeAll,
  beforeEach,
} from 'bun:test';
import { logger } from '@/utils/logging/logger.service';
import { TestDataHelper } from './helpers/test-data.helper';
import { resetDatabase } from './helpers/database-reset.helper';
import { setupTestApp, stopTestServer } from './setup-test-app';
import { getAvailablePort, releasePort } from './helpers/port-manager.helper';
import {
  describePostgreSQL,
  describeSQLite,
  describeAnyDatabase,
  itPostgreSQL,
  itSQLite,
  getCurrentDatabaseType,
  isPostgresqlAvailable,
  isSqliteInUse,
} from './helpers/database-conditional.helper';

// Use getPort to reliably get an available port to avoid conflicts
let TEST_PORT: number;
let API_URL: string;
let ISSUERS_ENDPOINT: string;

// Ensure DB-related env-vars are set **before** any module import that may read them
if (!process.env.DB_TYPE) {
  process.env.DB_TYPE = 'sqlite';
}
if (process.env.DB_TYPE === 'sqlite' && !process.env.SQLITE_DB_PATH) {
  process.env.SQLITE_DB_PATH = ':memory:';
}

// Tests must run in "test" mode *before* config is imported
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'test';
}

import { config } from '@/config/config'; // safe to import after env is prepared

// API key for protected endpoints
const API_KEY =
  process.env.AUTH_API_KEY_E2E?.split(':')[0] || 'verysecretkeye2e';

// Server instance for the test
type BunServer = {
  stop: () => void;
};
let server: BunServer | null = null;

// This describe block will run for any available database
describeAnyDatabase('Database Conditional E2E Tests', () => {
  // Start the server before all tests
  beforeAll(async () => {
    // Get an available port to avoid conflicts
    TEST_PORT = await getAvailablePort();

    // Set up API URLs after getting the port
    const host = config.server.host ?? '127.0.0.1';
    API_URL = `http://${host}:${TEST_PORT}`;
    ISSUERS_ENDPOINT = `${API_URL}/v3/issuers`;

    // Log the current database configuration
    logger.info('Database Conditional E2E Tests - Configuration', {
      dbType: getCurrentDatabaseType(),
      postgresAvailable: isPostgresqlAvailable(),
      sqliteInUse: isSqliteInUse(),
      apiUrl: API_URL,
    });

    try {
      logger.info(`E2E Test: Starting server on port ${TEST_PORT}`);
      const result = await setupTestApp(TEST_PORT);
      server = result.server as BunServer;
      logger.info('E2E Test: Server started successfully');

      // Initialize test data helper
      TestDataHelper.initialize(API_URL, API_KEY);

      // Wait for the server to be fully ready
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      logger.error('E2E Test: Failed to start server', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  });

  // Reset database before each test to ensure isolation
  beforeEach(async () => {
    try {
      await resetDatabase();
      logger.info('Database Conditional E2E tests: Reset database');
    } catch (error) {
      logger.error('Failed to reset database', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  });

  // Stop the server and clean up test data after all tests
  afterAll(async () => {
    await TestDataHelper.cleanup();
    logger.info('Database Conditional E2E tests: Cleaned up test data');

    if (server) {
      try {
        logger.info('E2E Test: Stopping server');
        stopTestServer(server);
        logger.info('E2E Test: Server stopped successfully');
      } catch (error) {
        logger.error('E2E Test: Error stopping server', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
      }
    }

    // Release the allocated port
    if (TEST_PORT) {
      releasePort(TEST_PORT);
    }
  });

  // Database-agnostic tests that run for any available database
  describe('Database-Agnostic Tests', () => {
    it('should work with any database type', async () => {
      const dbType = getCurrentDatabaseType();
      logger.info(`Running database-agnostic test with ${dbType}`);

      // Create a test issuer
      const { id: issuerId } = await TestDataHelper.createIssuer();
      expect(issuerId).toBeDefined();

      // Verify we can retrieve it
      const res = await fetch(`${ISSUERS_ENDPOINT}/${issuerId}`, {
        method: 'GET',
        headers: { 'X-API-Key': API_KEY },
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as { id: string };
      expect(body.id).toBe(issuerId);
    });

    it('should handle basic CRUD operations', async () => {
      // This test runs regardless of database type
      const issuerData = {
        name: 'Database Agnostic Test Issuer',
        url: 'https://example.com',
        email: 'test@example.com',
        type: 'Issuer',
      };

      // Create
      const createRes = await fetch(ISSUERS_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY,
        },
        body: JSON.stringify(issuerData),
      });

      expect(createRes.status).toBe(201);
      const created = (await createRes.json()) as { id: string };
      expect(created.id).toBeDefined();

      // Read
      const readRes = await fetch(`${ISSUERS_ENDPOINT}/${created.id}`, {
        method: 'GET',
        headers: { 'X-API-Key': API_KEY },
      });

      expect(readRes.status).toBe(200);
      const read = (await readRes.json()) as { name: string };
      expect(read.name).toBe(issuerData.name);
    });
  });
});

// PostgreSQL-specific tests - these will be skipped if PostgreSQL is not available
describePostgreSQL('PostgreSQL-Specific E2E Tests', () => {
  it('should run only when PostgreSQL is available', () => {
    expect(getCurrentDatabaseType()).toBe('postgresql');
    expect(isPostgresqlAvailable()).toBe(true);
    logger.info('PostgreSQL-specific test is running');
  });

  itPostgreSQL('should test PostgreSQL-specific functionality', async () => {
    // This test only runs when PostgreSQL is available
    logger.info('Testing PostgreSQL-specific functionality');

    // Add PostgreSQL-specific tests here
    // For example, testing PostgreSQL-specific features like JSON columns, arrays, etc.
    expect(true).toBe(true);
  });
});

// SQLite-specific tests - these will be skipped if SQLite is not in use
describeSQLite('SQLite-Specific E2E Tests', () => {
  it('should run only when SQLite is in use', () => {
    expect(getCurrentDatabaseType()).toBe('sqlite');
    expect(isSqliteInUse()).toBe(true);
    logger.info('SQLite-specific test is running');
  });

  itSQLite('should test SQLite-specific functionality', async () => {
    // This test only runs when SQLite is in use
    logger.info('Testing SQLite-specific functionality');

    // Add SQLite-specific tests here
    // For example, testing SQLite-specific features like WAL mode, pragmas, etc.
    expect(true).toBe(true);
  });
});

// Mixed tests with individual conditional test cases
describe('Mixed Database Tests', () => {
  it('should always run regardless of database type', () => {
    const dbType = getCurrentDatabaseType();
    logger.info(`Mixed test running with ${dbType} database`);
    expect(['sqlite', 'postgresql']).toContain(dbType);
  });

  // This test only runs for PostgreSQL
  itPostgreSQL('should run only for PostgreSQL', () => {
    expect(getCurrentDatabaseType()).toBe('postgresql');
    expect(isPostgresqlAvailable()).toBe(true);
  });

  // This test only runs for SQLite
  itSQLite('should run only for SQLite', () => {
    expect(getCurrentDatabaseType()).toBe('sqlite');
    expect(isSqliteInUse()).toBe(true);
  });
});
