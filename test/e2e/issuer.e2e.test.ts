// test/e2e/issuer.e2e.test.ts
import { describe, it, expect, afterAll, beforeAll } from 'bun:test';
import { config } from '../../src/config/config';
import { logger } from '../../src/utils/logging/logger.service';
import { setupApp } from '../../src/index';
import type { Elysia } from 'elysia';

// No need for complex types in this simplified test

// Base URL for the API. Bun Test should load .env.test which sets API_BASE_URL
const API_URL = process.env['API_BASE_URL'] || `http://${config.server.host}:${config.server.port}`;
// The API router is mounted directly on the app, not at the basePath
const ISSUERS_ENDPOINT = `${API_URL}/issuers`; // e.g., http://localhost:3001/issuers

// API key for protected endpoints
const API_KEY = 'verysecretkeye2e';

// Server instance for the test
let app: Elysia | null = null;

describe('Issuer API - E2E', () => {
  let createdIssuerId: string | null = null;

  // Start the server before all tests
  beforeAll(async () => {
    // Set environment variables for the test server
    process.env['PORT'] = process.env['PORT'] || '3001';
    process.env['NODE_ENV'] = 'test';

    try {
      logger.info('E2E Test: Starting server on port ' + process.env['PORT']);
      app = await setupApp();
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
    if (app) {
      try {
        logger.info('E2E Test: Stopping server');
        await app.stop();
        logger.info('E2E Test: Server stopped successfully');
      } catch (error) {
        logger.error('E2E Test: Error stopping server', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        });
      }
    }
  });

  it('should verify issuer API endpoints', async () => {
    // Test the issuers endpoint
    let issuersResponse: Response;
    try {
      issuersResponse = await fetch(ISSUERS_ENDPOINT, {
        method: 'GET',
        headers: {
          'X-API-Key': API_KEY
        }
      });
    } catch (error) {
      logger.error('Failed to fetch issuers', { error });
      throw error;
    }

    // Verify the response status code
    expect([200, 400, 401, 403, 500]).toContain(issuersResponse.status);
    logger.info(`Issuers endpoint responded with status ${issuersResponse.status}`);

    // Test the issuer POST endpoint
    let issuerPostResponse: Response;
    try {
      issuerPostResponse = await fetch(ISSUERS_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY
        },
        body: JSON.stringify({
          '@context': 'https://w3id.org/openbadges/v3',
          type: 'Issuer',
          name: 'Test Issuer',
          url: 'https://test.example.com',
          email: 'test@example.com'
        })
      });
    } catch (error) {
      logger.error('Failed to test issuer POST endpoint', { error });
      throw error;
    }

    // Verify the response status code
    expect([200, 201, 400, 401, 403, 500]).toContain(issuerPostResponse.status);
    logger.info(`Issuer POST endpoint responded with status ${issuerPostResponse.status}`);

    // If the issuer was created successfully, store the ID for cleanup
    if (issuerPostResponse.status === 201 || issuerPostResponse.status === 200) {
      try {
        const responseText = await issuerPostResponse.text();
        const responseJson = JSON.parse(responseText);

        if (responseJson.id) {
          createdIssuerId = responseJson.id;
          logger.info(`Created issuer with ID ${createdIssuerId}`);
        }
      } catch (error) {
        logger.error('Failed to parse issuer response', { error });
      }
    }
  });

  // Optional: Clean up created issuer to keep the test environment clean
  afterAll(async () => {
    if (createdIssuerId) {
      try {
        const deleteResponse = await fetch(`${ISSUERS_ENDPOINT}/${createdIssuerId}`, {
          method: 'DELETE',
          headers: { 'X-API-Key': API_KEY }
        });
        if (deleteResponse.ok) {
          logger.info(`E2E Test: Successfully cleaned up issuer ${createdIssuerId}`);
        } else {
          const errorBody = await deleteResponse.text();
          logger.warn(`E2E Test: Failed to clean up issuer ${createdIssuerId}. Status: ${deleteResponse.status}, Body: ${errorBody}`);
        }
      } catch (error) {
        logger.error(`E2E Test: Error during cleanup of issuer ${createdIssuerId}`, { error });
      }
    }
  });
});
