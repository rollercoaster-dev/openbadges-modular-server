/**
 * Badge Class API E2E Tests
 *
 * This file contains end-to-end tests for the Badge Class API endpoints.
 * It tests the complete CRUD lifecycle of badge classes.
 */

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
// Import only the types we need
import { BadgeClassResponseDto } from '@/api/dtos';
import { getAvailablePort, releasePort } from './helpers/port-manager.helper';
import { config } from '@/config/config'; // safe to import after env is prepared
import { RepositoryFactory } from '@/infrastructure/repository.factory';
import { headersToObject } from '../test-utils/headers.helper';

// Use getPort to reliably get an available port to avoid conflicts
let TEST_PORT: number;
let API_URL: string;
let BADGE_CLASSES_ENDPOINT: string;

// API key for protected endpoints - use the one from environment variables
const API_KEY =
  process.env.AUTH_API_KEY_E2E?.split(':')[0] || 'verysecretkeye2e';

// Server instance for the test
// Define BunServer type based on what's used in stopTestServer
type BunServer = {
  stop: () => void;
};
let server: BunServer | null = null;

describe('Badge Class API - E2E', () => {
  // Start the server before all tests
  beforeAll(async () => {
    // Get an available port to avoid conflicts
    TEST_PORT = await getAvailablePort();
    /* pass TEST_PORT to setupTestApp(), config, … without exporting it
     * to global process.env to keep the scope local to this suite */

    // Set up API URLs after getting the port
    const host = config.server.host ?? '127.0.0.1';
    API_URL = `http://${host}:${TEST_PORT}`;
    BADGE_CLASSES_ENDPOINT = `${API_URL}/v3/badge-classes`;

    // Log the API URL for debugging
    logger.info(`E2E Test: Using API URL: ${API_URL}`);

    try {
      logger.info(`E2E Test: Starting server on port ${TEST_PORT}`);
      const result = await setupTestApp(TEST_PORT);
      server = result.server as BunServer;
      logger.info('E2E Test: Server started successfully');

      // Initialize test data helper
      TestDataHelper.initialize(API_URL, API_KEY);
      logger.info('Badge Class E2E tests: Initialized test data helper', {
        apiUrl: API_URL,
        apiKey: API_KEY ? 'set' : 'not set',
      });

      // Wait for server to be ready with health check
      let retries = 50; // 5 seconds max
      while (retries > 0) {
        try {
          const healthRes = await fetch(`${API_URL}/health`, { method: 'GET' });
          if (healthRes.status === 200) break;
        } catch {
          // Server not ready yet
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
        retries--;
      }
      if (retries === 0) throw new Error('Server failed to become ready');
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
      logger.info('Badge Class E2E tests: Reset database');
    } catch (error) {
      logger.error('Failed to reset database', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error; // Rethrow to fail test setup and prevent tests from running on unreset database
    }
  });

  // Stop the server and clean up test data after all tests
  afterAll(async () => {
    await TestDataHelper.cleanup();
    logger.info('Badge Class E2E tests: Cleaned up test data');

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

    // Close the database connection
    await RepositoryFactory.close();

    // Release the allocated port
    if (TEST_PORT) {
      releasePort(TEST_PORT);
    }
  });

  describe('Create Badge Class', () => {
    it('should create a badge class with valid data', async () => {
      // Create a test issuer first
      const { id: issuerId } = await TestDataHelper.createIssuer();

      // Prepare test data
      const badgeClassData = {
        type: 'BadgeClass',
        name: 'E2E Test Badge Class',
        description: 'Badge class for E2E test.',
        issuer: issuerId,
        criteria: {
          narrative: 'Complete the E2E test requirements',
        },
        image: 'https://example.com/badge.png',
      };

      // Execute test
      const res = await fetch(BADGE_CLASSES_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY,
        },
        body: JSON.stringify(badgeClassData),
      });

      const responseBody = await res.clone().text();
      logger.debug('Create badge class response:', {
        status: res.status,
        statusText: res.statusText,
        body: responseBody,
        headers: headersToObject(res.headers),
        requestUrl: BADGE_CLASSES_ENDPOINT,
        requestMethod: 'POST',
        requestHeaders: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY ? 'provided' : 'not provided',
        },
        requestBody: JSON.stringify(badgeClassData),
      });

      // Verify response
      expect(res.status).toBe(201);
      const body = (await res.json()) as BadgeClassResponseDto;
      expect(body).toBeDefined();
      expect(body.id).toBeDefined();
      expect(body.name).toBe(badgeClassData.name);
      expect(body.description).toBe(badgeClassData.description);
      expect(body.issuer.toString()).toBe(issuerId);
      // API intentionally maps BadgeClass input → Achievement output (OBv3 specification)
      expect(body.type).toEqual(['Achievement']);
    });

    it('should fail to create badge class with invalid issuer', async () => {
      // Prepare test data with invalid issuer
      const invalidBadgeClassData = {
        type: 'BadgeClass',
        name: 'Bad Issuer Badge Class',
        description: 'Badge class with invalid issuer.',
        issuer: '00000000-0000-4000-a000-000000000999', // Non-existent issuer
        criteria: {
          narrative: 'Complete the test',
        },
      };

      // Execute test
      const res = await fetch(BADGE_CLASSES_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY,
        },
        body: JSON.stringify(invalidBadgeClassData),
      });

      // Verify response
      expect(res.status).toBe(400);
      const body = (await res.json()) as { error: string };
      expect(body.error).toBeDefined();
    });

    it('should fail to create badge class without required fields', async () => {
      // Prepare test data with missing required fields
      const incompleteBadgeClassData = {
        type: 'BadgeClass',
        // Missing name, description, issuer, and criteria
        image: 'https://example.com/badge.png',
      };

      // Execute test
      const res = await fetch(BADGE_CLASSES_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY,
        },
        body: JSON.stringify(incompleteBadgeClassData),
      });

      // Verify response
      expect(res.status).toBe(400);
      const body = (await res.json()) as { error: string };
      expect(body.error).toBeDefined();
    });
  });

  describe('Read Badge Class', () => {
    it('should retrieve a badge class by ID', async () => {
      // Create test issuer and badge class
      const { id: issuerId } = await TestDataHelper.createIssuer();
      const { id: badgeClassId } = await TestDataHelper.createBadgeClass(
        issuerId
      );

      // Execute test
      const res = await fetch(`${BADGE_CLASSES_ENDPOINT}/${badgeClassId}`, {
        method: 'GET',
        headers: { 'X-API-Key': API_KEY },
      });

      // Log the response for debugging
      const responseText = await res.clone().text();
      logger.debug('Get badge class response:', {
        status: res.status,
        statusText: res.statusText,
        responseText,
        headers: headersToObject(res.headers),
        requestUrl: `${BADGE_CLASSES_ENDPOINT}/${badgeClassId}`,
        requestMethod: 'GET',
        requestHeaders: {
          'X-API-Key': API_KEY ? 'provided' : 'not provided',
        },
        badgeClassId,
      });

      // Verify response
      expect(res.status).toBe(200);
      const body = (await res.json()) as BadgeClassResponseDto;
      expect(body).toBeDefined();
      expect(body.id.toString()).toBe(badgeClassId);
      expect(body.name).toBeDefined();
      expect(body.description).toBeDefined();
      expect(body.issuer.toString()).toBe(issuerId);
      // Badge classes are returned as Achievement type in Open Badges 3.0
      expect(body.type).toEqual(['Achievement']);
    });

    it('should handle non-existent badge class gracefully', async () => {
      // Execute test with non-existent ID (using a valid UUID format)
      const nonexistentId = '00000000-0000-4000-a000-000000000002';
      const res = await fetch(`${BADGE_CLASSES_ENDPOINT}/${nonexistentId}`, {
        method: 'GET',
        headers: { 'X-API-Key': API_KEY },
      });

      // The API should return 404 for a non-existent resource
      expect(res.status).toBe(404);
    });

    it('should list all badge classes', async () => {
      // Reset database to ensure a clean state
      await resetDatabase();

      // Create a test issuer and badge class to ensure there's at least one in the database
      const { id: issuerId } = await TestDataHelper.createIssuer();
      await TestDataHelper.createBadgeClass(issuerId, {
        name: `Test Badge Class ${Date.now().toString()}`,
      });

      // Execute test
      const res = await fetch(BADGE_CLASSES_ENDPOINT, {
        method: 'GET',
        headers: { 'X-API-Key': API_KEY },
      });

      // Verify response
      expect(res.status).toBe(200);
      const body = (await res.json()) as Record<string, unknown>[];

      // Log the response for debugging
      logger.debug('List badge classes response:', {
        status: res.status,
        bodyLength: body.length,
        responseType: typeof body,
        isArray: Array.isArray(body),
      });

      // Verify the response is an array
      expect(Array.isArray(body)).toBe(true);

      // Verify the array contains at least one badge class
      expect(body.length).toBeGreaterThan(0);

      // Verify each badge class has the required properties
      body.forEach((badgeClass: Record<string, unknown>) => {
        expect(badgeClass.id).toBeDefined();
        // Badge classes are returned as Achievement type in Open Badges 3.0
        expect(badgeClass.type).toEqual(['Achievement']);
        expect(badgeClass.name).toBeDefined();
        expect(badgeClass.description).toBeDefined();
        expect(badgeClass.issuer).toBeDefined();
        // Check for JSON-LD context which should be present
        expect(badgeClass['@context']).toBeDefined();
      });
    });
  });

  describe('Update Badge Class', () => {
    it('should update an existing badge class with valid data', async () => {
      try {
        // Reset database to ensure a clean state
        await resetDatabase();

        // Create a test issuer and badge class
        const { id: issuerId } = await TestDataHelper.createIssuer();
        const uniqueName = `Test Badge Class ${Date.now().toString()}`;
        logger.info(`Creating test badge class with name: ${uniqueName}`);

        const badgeClassData = {
          name: uniqueName,
          type: 'BadgeClass',
          description: 'Test badge class for E2E tests',
          issuer: issuerId,
          criteria: {
            narrative: 'Complete the test requirements',
          },
        };

        logger.debug('Creating badge class with data:', { badgeClassData });

        const { id: badgeClassId } = await TestDataHelper.createBadgeClass(
          issuerId,
          badgeClassData
        );

        logger.info(`Created test badge class with ID: ${badgeClassId}`);

        // Verify the badge class exists before updating
        const checkRes = await fetch(
          `${BADGE_CLASSES_ENDPOINT}/${badgeClassId}`,
          {
            method: 'GET',
            headers: { 'X-API-Key': API_KEY },
          }
        );

        const checkBody = await checkRes.clone().text();
        logger.info(
          `Verify badge class exists response: status=${checkRes.status}, body=${checkBody}`
        );

        // If the badge class doesn't exist, fail the test
        expect(checkRes.status).toBe(200);

        // Prepare update data with all required fields
        const updateData = {
          name: `Updated Badge Class Name ${Date.now().toString()}`,
          description: 'Updated description.',
          type: 'BadgeClass',
          issuer: issuerId,
          image: 'https://example.com/updated-badge.png',
          criteria: {
            narrative: 'Updated test requirements',
          },
        };

        logger.info(
          `Updating badge class with ID: ${badgeClassId}, data: ${JSON.stringify(
            updateData
          )}`
        );

        // Execute test
        const res = await fetch(`${BADGE_CLASSES_ENDPOINT}/${badgeClassId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': API_KEY,
          },
          body: JSON.stringify(updateData),
        });

        // Log the response for debugging
        const responseText = await res.text();
        logger.info(
          `Update badge class response: status=${res.status}, body=${responseText}`
        );

        logger.debug('Update badge class response details:', {
          status: res.status,
          statusText: res.statusText,
          responseText,
          headers: headersToObject(res.headers),
          requestUrl: `${BADGE_CLASSES_ENDPOINT}/${badgeClassId}`,
          requestMethod: 'PUT',
          requestHeaders: {
            'Content-Type': 'application/json',
            'X-API-Key': API_KEY ? 'provided' : 'not provided',
          },
          requestBody: JSON.stringify(updateData),
          badgeClassId,
        });

        // Verify response status - PUT operations should return 200 for successful updates
        expect(res.status).toBe(200);

        // Fetch again to confirm update (immediate verification without arbitrary delay)
        const getRes = await fetch(
          `${BADGE_CLASSES_ENDPOINT}/${badgeClassId}`,
          {
            method: 'GET',
            headers: { 'X-API-Key': API_KEY },
          }
        );

        const getBody = await getRes.clone().text();
        logger.info(
          `Get updated badge class response: status=${getRes.status}, body=${getBody}`
        );

        expect(getRes.status).toBe(200);
        const body = (await getRes.json()) as BadgeClassResponseDto;

        // Verify the updated fields
        expect(body.name).toBe(updateData.name);
        expect(body.description).toBe(updateData.description);
        expect(body.issuer.toString()).toBe(issuerId);
        // Verify the ID hasn't changed
        expect(body.id.toString()).toBe(badgeClassId);
      } catch (error) {
        logger.error('Error in update badge class test', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
        throw error;
      }
    });

    it('should fail to update badge class with invalid data', async () => {
      // Create test issuer and badge class
      const { id: issuerId } = await TestDataHelper.createIssuer();
      const { id: badgeClassId } = await TestDataHelper.createBadgeClass(
        issuerId
      );

      // Test cases for invalid data
      const invalidUpdateTests = [
        {
          name: 'missing required name field',
          data: {
            description: 'Updated description.',
            type: 'BadgeClass',
            issuer: issuerId,
            image: 'https://example.com/badge.png',
            criteria: {
              narrative: 'Updated requirements',
            },
            // name is missing
          },
        },
        {
          name: 'invalid issuer ID',
          data: {
            name: 'Updated Badge Class Name',
            description: 'Updated description.',
            type: 'BadgeClass',
            issuer: '00000000-0000-4000-a000-000000000999', // Non-existent issuer
            image: 'https://example.com/badge.png',
            criteria: {
              narrative: 'Updated requirements',
            },
          },
        },
        {
          name: 'missing required criteria field',
          data: {
            name: 'Updated Badge Class Name',
            description: 'Updated description.',
            type: 'BadgeClass',
            issuer: issuerId,
            image: 'https://example.com/badge.png',
            // criteria is missing
          },
        },
      ];

      for (const testCase of invalidUpdateTests) {
        logger.info(`Testing invalid update: ${testCase.name}`);

        // Execute test with invalid data
        const res = await fetch(`${BADGE_CLASSES_ENDPOINT}/${badgeClassId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': API_KEY,
          },
          body: JSON.stringify(testCase.data),
        });

        // Log the response for debugging
        const responseText = await res.text();
        logger.debug(
          `Invalid update test '${testCase.name}' response: status=${res.status}, body=${responseText}`
        );

        // Verify response status - expect validation error for invalid data
        expect(res.status).toBe(400);

        // Verify error response contains error information
        if (responseText) {
          try {
            const body = JSON.parse(responseText);
            expect(body.error).toBeDefined();
          } catch {
            // Response might not be JSON, which is also acceptable for error responses
          }
        }
      }
    });

    it('should handle updating non-existent badge class appropriately', async () => {
      // Create a test issuer for the update data
      const { id: issuerId } = await TestDataHelper.createIssuer();

      // Prepare update data
      const updateData = {
        name: 'Updated Badge Class Name',
        description: 'Updated description.',
        type: 'BadgeClass',
        issuer: issuerId,
        image: 'https://example.com/updated-badge.png',
        criteria: {
          narrative: 'Updated requirements',
        },
      };

      // Execute test with non-existent ID (using a valid UUID format)
      const nonexistentId = '00000000-0000-4000-a000-000000000000';
      const res = await fetch(`${BADGE_CLASSES_ENDPOINT}/${nonexistentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY,
        },
        body: JSON.stringify(updateData),
      });

      // The API should return 404 for PUT operations on non-existent resources
      expect(res.status).toBe(404);
    });
  });

  describe('Delete Badge Class', () => {
    it('should delete an existing badge class', async () => {
      // Create test issuer and badge class
      const { id: issuerId } = await TestDataHelper.createIssuer();
      const { id: badgeClassId } = await TestDataHelper.createBadgeClass(
        issuerId
      );

      // Execute delete
      const deleteRes = await fetch(
        `${BADGE_CLASSES_ENDPOINT}/${badgeClassId}`,
        {
          method: 'DELETE',
          headers: { 'X-API-Key': API_KEY },
        }
      );

      // Verify delete response - DELETE operations should return 204 for successful deletions
      expect(deleteRes.status).toBe(204);

      // Verify badge class is deleted by trying to fetch it
      const getRes = await fetch(`${BADGE_CLASSES_ENDPOINT}/${badgeClassId}`, {
        method: 'GET',
        headers: { 'X-API-Key': API_KEY },
      });

      // After deletion, the API should return 404 (not found)
      expect(getRes.status).toBe(404);
    });

    it('should handle deleting non-existent badge class gracefully', async () => {
      // Execute test with non-existent ID (using a valid UUID format)
      const nonexistentId = '00000000-0000-4000-a000-000000000001';
      const res = await fetch(`${BADGE_CLASSES_ENDPOINT}/${nonexistentId}`, {
        method: 'DELETE',
        headers: { 'X-API-Key': API_KEY },
      });

      // The API may return 200 (idempotent delete) or 404 (not found)
      // Both are acceptable behaviors for DELETE operations
      expect(res.status).toBe(404);
    });
  });

  describe('Achievement Versioning and Relationships (OB 3.0)', () => {
    describe('Achievement Versioning', () => {
      it('should create badge class with version field', async () => {
        // Create a test issuer first
        const { id: issuerId } = await TestDataHelper.createIssuer();

        // Prepare test data with version field
        const badgeClassData = {
          type: 'BadgeClass',
          name: 'Versioned Achievement v1.0',
          description: 'First version of this achievement.',
          issuer: issuerId,
          criteria: {
            narrative: 'Complete the versioned requirements',
          },
          image: 'https://example.com/versioned-badge.png',
          version: '1.0',
        };

        // Execute test
        const res = await fetch(BADGE_CLASSES_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': API_KEY,
          },
          body: JSON.stringify(badgeClassData),
        });

        expect(res.status).toBe(201);
        const body = (await res.json()) as BadgeClassResponseDto;

        // Verify version field is included in OB 3.0 output
        expect(body.version).toBe('1.0');
        expect(body.type).toEqual(['Achievement']);
        expect(body.name).toBe(badgeClassData.name);
      });

      it('should create version chain with previousVersion field', async () => {
        // Create a test issuer first
        const { id: issuerId } = await TestDataHelper.createIssuer();

        // Create first version
        const v1Data = {
          type: 'BadgeClass',
          name: 'Achievement v1.0',
          description: 'First version of this achievement.',
          issuer: issuerId,
          criteria: { narrative: 'Complete v1 requirements' },
          image: 'https://example.com/badge-v1.png',
          version: '1.0',
        };

        const v1Res = await fetch(BADGE_CLASSES_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': API_KEY,
          },
          body: JSON.stringify(v1Data),
        });

        expect(v1Res.status).toBe(201);
        const v1Body = (await v1Res.json()) as BadgeClassResponseDto;

        // Create second version with previousVersion reference
        const v2Data = {
          type: 'BadgeClass',
          name: 'Achievement v2.0',
          description: 'Second version of this achievement.',
          issuer: issuerId,
          criteria: { narrative: 'Complete v2 requirements' },
          image: 'https://example.com/badge-v2.png',
          version: '2.0',
          previousVersion: v1Body.id,
        };

        const v2Res = await fetch(BADGE_CLASSES_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': API_KEY,
          },
          body: JSON.stringify(v2Data),
        });

        expect(v2Res.status).toBe(201);
        const v2Body = (await v2Res.json()) as BadgeClassResponseDto;

        // Verify version fields
        expect(v2Body.version).toBe('2.0');
        expect(v2Body.type).toEqual(['Achievement']);
        // Note: previousVersion is for internal tracking, not in JSON-LD output
        expect(v2Body.previousVersion).toBeUndefined();
      });
    });

    describe('Related Achievements', () => {
      it('should manage related achievements through API endpoints', async () => {
        // Create a test issuer first
        const { id: issuerId } = await TestDataHelper.createIssuer();

        // Create two achievements
        const achievement1Data = {
          type: 'BadgeClass',
          name: 'Primary Achievement',
          description: 'The main achievement.',
          issuer: issuerId,
          criteria: { narrative: 'Complete primary requirements' },
          image: 'https://example.com/primary-badge.png',
        };

        const achievement2Data = {
          type: 'BadgeClass',
          name: 'Related Achievement',
          description: 'A related achievement.',
          issuer: issuerId,
          criteria: { narrative: 'Complete related requirements' },
          image: 'https://example.com/related-badge.png',
        };

        // Create both achievements
        const res1 = await fetch(BADGE_CLASSES_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': API_KEY,
          },
          body: JSON.stringify(achievement1Data),
        });

        const res2 = await fetch(BADGE_CLASSES_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': API_KEY,
          },
          body: JSON.stringify(achievement2Data),
        });

        expect(res1.status).toBe(201);
        expect(res2.status).toBe(201);

        const achievement1 = (await res1.json()) as BadgeClassResponseDto;
        const achievement2 = (await res2.json()) as BadgeClassResponseDto;

        // Add relationship using the new API endpoint
        const relatedData = {
          id: achievement2.id,
          type: ['Related'],
          inLanguage: 'en-US',
          version: '1.0',
        };

        const addRelatedRes = await fetch(
          `${BADGE_CLASSES_ENDPOINT}/${achievement1.id}/related`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-API-Key': API_KEY,
            },
            body: JSON.stringify(relatedData),
          }
        );

        expect(addRelatedRes.status).toBe(200);
        const updatedAchievement =
          (await addRelatedRes.json()) as BadgeClassResponseDto;

        // Verify relationship was added
        expect(updatedAchievement.related).toHaveLength(1);
        expect(updatedAchievement.related?.[0].id).toBe(achievement2.id);

        // Get related achievements using the API endpoint
        const getRelatedRes = await fetch(
          `${BADGE_CLASSES_ENDPOINT}/${achievement1.id}/related`,
          {
            method: 'GET',
            headers: { 'X-API-Key': API_KEY },
          }
        );

        expect(getRelatedRes.status).toBe(200);
        const relatedAchievements =
          (await getRelatedRes.json()) as BadgeClassResponseDto[];

        expect(relatedAchievements).toHaveLength(1);
        expect(relatedAchievements[0].id).toBe(achievement2.id);

        // Remove relationship using the API endpoint
        const removeRelatedRes = await fetch(
          `${BADGE_CLASSES_ENDPOINT}/${achievement1.id}/related/${achievement2.id}`,
          {
            method: 'DELETE',
            headers: { 'X-API-Key': API_KEY },
          }
        );

        expect(removeRelatedRes.status).toBe(200);
        const finalAchievement =
          (await removeRelatedRes.json()) as BadgeClassResponseDto;

        // Verify relationship was removed
        expect(finalAchievement.related).toHaveLength(0);
      });
    });
  });
});
