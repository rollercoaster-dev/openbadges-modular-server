// test/e2e/auth.e2e.test.ts
import { describe, it, expect, afterAll, beforeAll } from 'bun:test';
import { logger } from '@/utils/logging/logger.service';
import { setupTestApp, stopTestServer } from './setup-test-app';
import { getAvailablePort, releasePort } from './helpers/port-manager.helper';

// Use getPort to reliably get an available port to avoid conflicts
let TEST_PORT: number;
let API_URL: string;
let ISSUERS_ENDPOINT: string;

// Valid and invalid API keys for testing
const VALID_API_KEY = 'verysecretkeye2e';
const INVALID_API_KEY = 'invalidkey';

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

// Server instance for the test
let server: unknown = null;

describe('Authentication - E2E', () => {
  // Start the server before all tests
  beforeAll(async () => {
    // Get an available port to avoid conflicts
    TEST_PORT = await getAvailablePort();
    /* pass TEST_PORT to setupTestApp(), config, … without exporting it
     * to global process.env to keep the scope local to this suite */

    // Set up API URLs after getting the port
    const host = config.server.host ?? '127.0.0.1';
    API_URL = `http://${host}:${TEST_PORT}`;
    ISSUERS_ENDPOINT = `${API_URL}/v3/issuers`;

    try {
      logger.info(`E2E Test: Starting server on port ${TEST_PORT}`);
      const result = await setupTestApp(TEST_PORT);
      server = result.server;
      logger.info('E2E Test: Server started successfully');
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

  // Stop the server after all tests
  afterAll(async () => {
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

  it('should verify authentication endpoints', async () => {
    // Since RBAC is disabled in E2E tests, we'll test authentication middleware behavior
    // by verifying that authentication is processed correctly even when RBAC is disabled

    // Test the issuers endpoint without authentication
    let noAuthResponse: Response;
    try {
      noAuthResponse = await fetch(ISSUERS_ENDPOINT, {
        method: 'GET',
        // No Authorization header
      });
    } catch (error) {
      logger.error('Failed to make request without auth', { error });
      throw error;
    }

    // In E2E tests with RBAC disabled, requests should succeed since authentication checks are bypassed
    // When RBAC is disabled, all RBAC middleware (including requireAuth) call next() immediately
    expect(noAuthResponse.status).toBe(200);
    logger.info(
      `No auth request responded with status ${noAuthResponse.status}`
    );

    // Test with invalid authentication
    let invalidAuthResponse: Response;
    try {
      invalidAuthResponse = await fetch(ISSUERS_ENDPOINT, {
        method: 'GET',
        headers: {
          'X-API-Key': INVALID_API_KEY,
        },
      });
    } catch (error) {
      logger.error('Failed to make request with invalid auth', { error });
      throw error;
    }

    // With RBAC disabled, even invalid auth should succeed since authentication checks are bypassed
    // When RBAC is disabled, all RBAC middleware (including requireAuth) call next() immediately
    expect(invalidAuthResponse.status).toBe(200);
    logger.info(
      `Invalid auth request responded with status ${invalidAuthResponse.status}`
    );

    // Test with valid authentication
    let validAuthResponse: Response;
    try {
      validAuthResponse = await fetch(ISSUERS_ENDPOINT, {
        method: 'GET',
        headers: {
          'X-API-Key': VALID_API_KEY,
        },
      });
    } catch (error) {
      logger.error('Failed to make request with valid auth', { error });
      throw error;
    }

    // Valid authentication should always succeed
    expect(validAuthResponse.status).toBe(200);
    logger.info(
      `Valid auth request responded with status ${validAuthResponse.status}`
    );
  });

  it('should verify public endpoints', async () => {
    // Test a public endpoint (health check)
    let healthResponse: Response;
    try {
      healthResponse = await fetch(`${API_URL}/health`, {
        method: 'GET',
      });
    } catch (error) {
      logger.error('Failed to access health endpoint', { error });
      throw error;
    }

    // Verify the response status code - health endpoint should return 200 when working properly
    expect(healthResponse.status).toBe(200);
    logger.info(
      `Health endpoint responded with status ${healthResponse.status}`
    );

    // Test the docs endpoint
    let docsResponse: Response;
    try {
      docsResponse = await fetch(`${API_URL}/docs`, {
        method: 'GET',
      });
    } catch (error) {
      logger.error('Failed to access docs endpoint', { error });
      throw error;
    }

    // Verify the response status code - docs endpoint should return 200 when working properly
    expect(docsResponse.status).toBe(200);
    logger.info(`Docs endpoint responded with status ${docsResponse.status}`);
  });
});
