// test/e2e/badgeClass.e2e.test.ts
import { describe, it, expect, afterAll, beforeAll } from 'bun:test';
import { config } from '../../src/config/config';
import { logger } from '../../src/utils/logging/logger.service';
import { setupTestApp, stopTestServer } from './setup-test-app';

// Base URL for the API

// Use a random port for testing to avoid conflicts
const TEST_PORT = Math.floor(Math.random() * 10000) + 10000; // Random port between 10000-20000
process.env.TEST_PORT = TEST_PORT.toString();

// Base URL for the API
const API_URL = `http://${config.server.host}:${TEST_PORT}`;
// const ISSUERS_ENDPOINT = `${API_URL}/v3/issuers`; // Not used in this simplified test
const BADGE_CLASSES_ENDPOINT = `${API_URL}/v3/badge-classes`;

// API key for protected endpoints
const API_KEY = 'verysecretkeye2e';


// Server instance for the test
let server: unknown = null;

describe('Badge Class API - E2E', () => {
  // Start the server before all tests
  beforeAll(async () => {
    // Set environment variables for the test server
    process.env['NODE_ENV'] = 'test';

    try {
      logger.info(`E2E Test: Starting server on port ${TEST_PORT}`);
      const result = await setupTestApp();
      server = result.server;
      logger.info('E2E Test: Server started successfully');
      // Wait for the server to be fully ready
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      logger.error('E2E Test: Failed to start server', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
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
          stack: error instanceof Error ? error.stack : undefined
        });
      }
    }
  });

  // No resources to clean up in this simplified test

  it.skip('should verify badge class API endpoints', async () => {
    // Test the badge classes endpoint
    let badgeClassesResponse: Response;
    try {
      badgeClassesResponse = await fetch(BADGE_CLASSES_ENDPOINT, {
        method: 'GET',
        headers: {
          'X-API-Key': API_KEY
        }
      });
    } catch (error) {
      logger.error('Failed to fetch badge classes', { error });
      throw error;
    }

    // Verify the response status code
    if (badgeClassesResponse.status !== 200) {
  const body = await badgeClassesResponse.text();
  logger.error(`GET /v3/badge-classes failed`, { status: badgeClassesResponse.status, body });
}
expect(badgeClassesResponse.status).toBe(200);
    logger.info(`Badge classes endpoint responded with status ${badgeClassesResponse.status}`);

    // Test the badge class POST endpoint
    let badgeClassPostResponse: Response;
    try {
      badgeClassPostResponse = await fetch(BADGE_CLASSES_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY
        },
        body: JSON.stringify({
          '@context': OPENBADGES_V3_CONTEXT_EXAMPLE,
          type: 'BadgeClass',
          name: 'Test Badge Class',
          description: 'A test badge class',
          issuer: 'test-issuer-id',
          criteria: {
            narrative: 'Complete the test'
          }
        })
      });
    } catch (error) {
      logger.error('Failed to test badge class POST endpoint', { error });
      throw error;
    }

    // Verify the response status code
    if (badgeClassPostResponse.status !== 400) {
  const body = await badgeClassPostResponse.text();
  logger.error(`POST /v3/badge-classes failed (should be 400)`, { status: badgeClassPostResponse.status, body });
}
expect(badgeClassPostResponse.status).toBe(400);
    logger.info(`Badge class POST endpoint responded with status ${badgeClassPostResponse.status}`);
  });

  // No cleanup needed in this simplified test
});
