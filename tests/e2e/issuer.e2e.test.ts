/**
 * Issuer API E2E Tests
 *
 * This file contains end-to-end tests for the Issuer API endpoints.
 * It tests the complete CRUD lifecycle of issuers.
 */

import { describe, it, expect, afterAll, beforeAll, beforeEach } from 'bun:test';
import { logger } from '@/utils/logging/logger.service';
import { TestDataHelper } from './helpers/test-data.helper';
import { resetDatabase } from './helpers/database-reset.helper';
import { config } from '@/config/config';
import { setupTestApp, stopTestServer } from './setup-test-app';
// Import only the types we need
import { IssuerResponseDto } from '@/api/dtos';

// Use a random port for testing to avoid conflicts
const TEST_PORT = Math.floor(Math.random() * 10000) + 10000; // Random port between 10000-20000
process.env.TEST_PORT = TEST_PORT.toString();

// Use SQLite by default for tests, but allow overriding via environment variables
// This ensures tests can run in both SQLite and PostgreSQL environments
if (!process.env.DB_TYPE) {
  process.env.DB_TYPE = 'sqlite';
}
if (process.env.DB_TYPE === 'sqlite' && !process.env.SQLITE_DB_PATH) {
  process.env.SQLITE_DB_PATH = ':memory:';
}

// Base URL for the API
const API_URL = `http://${config.server.host || '0.0.0.0'}:${TEST_PORT}`;
const ISSUERS_ENDPOINT = `${API_URL}/v3/issuers`;

// Log the API URL for debugging
logger.info(`E2E Test: Using API URL: ${API_URL}`);

// API key for protected endpoints - use the one from environment variables
const API_KEY = process.env.AUTH_API_KEY_E2E?.split(':')[0] || 'verysecretkeye2e';

// Server instance for the test
// Define BunServer type based on what's used in stopTestServer
type BunServer = {
  stop: () => void;
};
let server: BunServer | null = null;

describe('Issuer API - E2E', () => {
  // Start the server before all tests
  beforeAll(async () => {
    // Set environment variables for the test server
    process.env['NODE_ENV'] = 'test';

    try {
      logger.info(`E2E Test: Starting server on port ${TEST_PORT}`);
      const result = await setupTestApp();
      server = result.server as BunServer;
      logger.info('E2E Test: Server started successfully');

      // Initialize test data helper
      TestDataHelper.initialize(API_URL, API_KEY);
      logger.info('Issuer E2E tests: Initialized test data helper', { apiUrl: API_URL, apiKey: API_KEY ? 'set' : 'not set' });

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

  // Reset database before each test to ensure isolation
  beforeEach(async () => {
    try {
      await resetDatabase();
      logger.info('Issuer E2E tests: Reset database');

      // Add a small delay to ensure the database reset is complete
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      logger.error('Failed to reset database', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  });

  // Stop the server and clean up test data after all tests
  afterAll(async () => {
    await TestDataHelper.cleanup();
    logger.info('Issuer E2E tests: Cleaned up test data');

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

  describe('Create Issuer', () => {
    it('should create an issuer with valid data', async () => {
      // Prepare test data - OB2 format
      const issuerData = {
        name: 'E2E Test Issuer',
        url: 'https://issuer.example.com',
        email: 'issuer@example.com',
        description: 'Issuer for E2E test.',
        type: 'Issuer' // OB2 format
      };

      // Execute test
      const res = await fetch(ISSUERS_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY
        },
        body: JSON.stringify(issuerData)
      });

      const responseBody = await res.clone().text();
      logger.debug('Create issuer response:', {
        status: res.status,
        statusText: res.statusText,
        body: responseBody,
        headers: Object.fromEntries(res.headers.entries()),
        requestUrl: ISSUERS_ENDPOINT,
        requestMethod: 'POST',
        requestHeaders: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY ? 'provided' : 'not provided'
        },
        requestBody: JSON.stringify(issuerData)
      });

      // Verify response
      expect(res.status).toBe(201);
      const body = await res.json() as IssuerResponseDto;
      expect(body).toBeDefined();
      expect(body.id).toBeDefined();
      expect(body.name).toBe(issuerData.name);
      expect(body.url.toString()).toBe(issuerData.url);
      expect(body.email).toBe(issuerData.email);
      expect(body.description).toBe(issuerData.description);
      expect(body.type).toBe('Issuer');
    });

    it('should fail to create issuer with invalid URL', async () => {
      // Prepare test data with invalid URL
      const invalidIssuerData = {
        type: 'Issuer', // OB3 format
        name: 'Bad URL Issuer',
        url: 'not-a-url',
        email: 'badurl@example.com'
      };

      // Execute test
      const res = await fetch(ISSUERS_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY
        },
        body: JSON.stringify(invalidIssuerData)
      });

      // Verify response
      expect(res.status).toBe(400);
      const body = await res.json() as { error: string };
      expect(body.error).toBeDefined();
    });

    it('should fail to create issuer without required fields', async () => {
      // Prepare test data with missing required fields
      const incompleteIssuerData = {
        type: 'Issuer', // OB3 format
        // Missing name, url, and email
        description: 'Incomplete issuer data'
      };

      // Execute test
      const res = await fetch(ISSUERS_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY
        },
        body: JSON.stringify(incompleteIssuerData)
      });

      // Verify response
      expect(res.status).toBe(400);
      const body = await res.json() as { error: string };
      expect(body.error).toBeDefined();
    });
  });

  describe('Read Issuer', () => {
    it('should retrieve an issuer by ID', async () => {
      // Create test issuer
      const { id: issuerId } = await TestDataHelper.createIssuer();

      // Execute test
      const res = await fetch(`${ISSUERS_ENDPOINT}/${issuerId}`, {
        method: 'GET',
        headers: { 'X-API-Key': API_KEY }
      });

      // Log the response for debugging
      const responseText = await res.clone().text();
      logger.debug('Get issuer response:', {
        status: res.status,
        statusText: res.statusText,
        responseText,
        headers: Object.fromEntries(res.headers.entries()),
        requestUrl: `${ISSUERS_ENDPOINT}/${issuerId}`,
        requestMethod: 'GET',
        requestHeaders: {
          'X-API-Key': API_KEY ? 'provided' : 'not provided'
        },
        issuerId
      });

      // Verify response
      expect(res.status).toBe(200);
      const body = await res.json() as IssuerResponseDto;
      expect(body).toBeDefined();
      expect(body.id.toString()).toBe(issuerId);
      expect(body.name).toBeDefined();
      expect(body.url).toBeDefined();
      expect(body.email).toBeDefined();
      expect(body.type).toBe('Issuer');
    });

    it('should return 404 for non-existent issuer', async () => {
      // Execute test with non-existent ID (using a valid UUID format)
      const nonexistentId = '00000000-0000-4000-a000-000000000002'; // A valid UUID that won't exist in the database
      const res = await fetch(`${ISSUERS_ENDPOINT}/${nonexistentId}`, {
        method: 'GET',
        headers: { 'X-API-Key': API_KEY }
      });

      // Verify response
      expect(res.status).toBe(404);
    });

    it('should list all issuers', async () => {
      // Reset database to ensure a clean state
      await resetDatabase();

      // Create a test issuer to ensure there's at least one in the database
      await TestDataHelper.createIssuer({
        name: `Test Issuer ${Date.now().toString()}`
      });

      // Add a small delay to ensure the issuer is fully created
      await new Promise(resolve => setTimeout(resolve, 100));

      // Execute test
      const res = await fetch(ISSUERS_ENDPOINT, {
        method: 'GET',
        headers: { 'X-API-Key': API_KEY }
      });

      // Verify response
      expect(res.status).toBe(200);
      const body = await res.json() as Record<string, unknown>[];

      // Log the response for debugging
      logger.debug('List issuers response:', {
        status: res.status,
        bodyLength: body.length,
        responseType: typeof body,
        isArray: Array.isArray(body)
      });

      // Verify the response is an array
      expect(Array.isArray(body)).toBe(true);

      // Verify the array contains at least one issuer
      expect(body.length).toBeGreaterThan(0);

      // Verify each issuer has the required properties
      body.forEach((issuer: Record<string, unknown>) => {
        expect(issuer.id).toBeDefined();
        expect(issuer.type).toBe('Issuer');
        expect(issuer.name).toBeDefined();
        expect(issuer.url).toBeDefined();
        // Check for JSON-LD context which should be present
        expect(issuer['@context']).toBeDefined();
      });
    });
  });

  describe('Update Issuer', () => {
    it('should update an existing issuer', async () => {
      try {
        // Reset database to ensure a clean state
        await resetDatabase();

        // Add a small delay after database reset
        await new Promise(resolve => setTimeout(resolve, 200));

        // Create a test issuer with a unique name
        const uniqueName = `Test Issuer ${Date.now().toString()}`;
        logger.info(`Creating test issuer with name: ${uniqueName}`);

        const issuerData = {
          name: uniqueName,
          type: 'Issuer', // Ensure type is set correctly
          url: 'https://issuer.example.com',
          email: 'issuer@example.com',
          description: 'Test issuer for E2E tests'
        };

        logger.debug('Creating issuer with data:', { issuerData });

        const { id: issuerId } = await TestDataHelper.createIssuer(issuerData);

        logger.info(`Created test issuer with ID: ${issuerId}`);

      // Verify the issuer exists before updating
      const checkRes = await fetch(`${ISSUERS_ENDPOINT}/${issuerId}`, {
        method: 'GET',
        headers: { 'X-API-Key': API_KEY }
      });

      const checkBody = await checkRes.clone().text();
      logger.info(`Verify issuer exists response: status=${checkRes.status}, body=${checkBody}`);

      // If the issuer doesn't exist, fail the test
      expect(checkRes.status).toBe(200);

      // Prepare update data with all required fields
      const updateData = {
        name: `Updated Issuer Name ${Date.now().toString()}`,
        url: 'https://updated.example.com',
        description: 'Updated description.',
        type: 'Issuer', // Include the type field which is required
        id: issuerId // Explicitly include the ID to ensure it's preserved
      };

      logger.info(`Updating issuer with ID: ${issuerId}, data: ${JSON.stringify(updateData)}`);

      // Execute test
      const res = await fetch(`${ISSUERS_ENDPOINT}/${issuerId}`, {
        method: 'PUT', // API uses PUT, not PATCH for updates
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY
        },
        body: JSON.stringify(updateData)
      });

      // Log the response for debugging
      const responseText = await res.text();
      logger.info(`Update issuer response: status=${res.status}, body=${responseText}`);

      logger.debug('Update issuer response details:', {
        status: res.status,
        statusText: res.statusText,
        responseText,
        headers: Object.fromEntries(res.headers.entries()),
        requestUrl: `${ISSUERS_ENDPOINT}/${issuerId}`,
        requestMethod: 'PUT',
        requestHeaders: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY ? 'provided' : 'not provided'
        },
        requestBody: JSON.stringify(updateData),
        issuerId
      });

      // Verify response status
      expect([200, 204]).toContain(res.status);

      // Add a small delay to ensure the update is processed
      await new Promise(resolve => setTimeout(resolve, 100));

      // Fetch again to confirm update
      const getRes = await fetch(`${ISSUERS_ENDPOINT}/${issuerId}`, {
        method: 'GET',
        headers: { 'X-API-Key': API_KEY }
      });

      const getBody = await getRes.clone().text();
      logger.info(`Get updated issuer response: status=${getRes.status}, body=${getBody}`);

      expect(getRes.status).toBe(200);
      const body = await getRes.json() as IssuerResponseDto;

      // Verify the updated fields
      expect(body.name).toBe(updateData.name);
      expect(body.url.toString()).toBe(updateData.url);
      expect(body.description).toBe(updateData.description);
      // Verify the ID hasn't changed
      expect(body.id.toString()).toBe(issuerId);
      } catch (error) {
        logger.error('Error in update issuer test', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        });
        throw error;
      }
    });

    it('should return 404 when updating non-existent issuer', async () => {
      // Prepare update data
      const updateData = {
        name: 'Updated Issuer Name',
        url: 'https://updated.example.com',
        type: 'Issuer' // Include the type field which is required
      };

      // Execute test with non-existent ID (using a valid UUID format)
      const nonexistentId = '00000000-0000-4000-a000-000000000000'; // A valid UUID that won't exist in the database
      const res = await fetch(`${ISSUERS_ENDPOINT}/${nonexistentId}`, {
        method: 'PUT', // API uses PUT, not PATCH for updates
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY
        },
        body: JSON.stringify(updateData)
      });

      // Verify response
      expect(res.status).toBe(404);
    });
  });

  describe('Delete Issuer', () => {
    it('should delete an existing issuer', async () => {
      // Create test issuer
      const { id: issuerId } = await TestDataHelper.createIssuer();

      // Execute delete
      const deleteRes = await fetch(`${ISSUERS_ENDPOINT}/${issuerId}`, {
        method: 'DELETE',
        headers: { 'X-API-Key': API_KEY }
      });

      // Verify delete response
      expect([200, 204]).toContain(deleteRes.status);

      // Verify issuer is deleted by trying to fetch it
      const getRes = await fetch(`${ISSUERS_ENDPOINT}/${issuerId}`, {
        method: 'GET',
        headers: { 'X-API-Key': API_KEY }
      });

      expect(getRes.status).toBe(404);
    });

    it('should return 404 when deleting non-existent issuer', async () => {
      // Execute test with non-existent ID (using a valid UUID format)
      const nonexistentId = '00000000-0000-4000-a000-000000000001'; // A valid UUID that won't exist in the database
      const res = await fetch(`${ISSUERS_ENDPOINT}/${nonexistentId}`, {
        method: 'DELETE',
        headers: { 'X-API-Key': API_KEY }
      });

      // Verify response
      expect(res.status).toBe(404);
    });
  });
});
