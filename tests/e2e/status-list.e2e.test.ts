/**
 * End-to-end tests for status list functionality
 */

import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
} from 'bun:test';
import { setupTestApp, stopTestServer } from './setup-test-app';
import { getAvailablePort, releasePort } from './helpers/port-manager.helper';
import { RepositoryFactory } from '../../src/infrastructure/repository.factory';
import { StatusPurpose } from '../../src/domains/status-list/status-list.types';
import { User } from '../../src/domains/user/user.entity';
import { Issuer } from '../../src/domains/issuer/issuer.entity';
import { BadgeClass } from '../../src/domains/badgeClass/badgeClass.entity';
import { UserRole } from '../../src/domains/user/user.entity';
import { createOrGenerateIRI } from '../../src/utils/types/type-utils';
import type { UserRepository } from '../../src/domains/user/user.repository';
import type { IssuerRepository } from '../../src/domains/issuer/issuer.repository';
import type { BadgeClassRepository } from '../../src/domains/badgeClass/badgeClass.repository';
import { ensureTransactionCommitted } from './helpers/database-sync.helper';
import { logger } from '../../src/utils/logging/logger.service';

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

import { config } from '../../src/config/config'; // safe to import after env is prepared

// Test interfaces for API responses
interface TestAssertionResponse {
  id: string;
  credentialStatus: {
    type: string;
    statusPurpose: string;
    statusListIndex: string;
    statusListCredential: string;
  };
}

interface TestStatusListResponse {
  '@context': string[];
  id: string;
  type: string[];
  issuer: string;
  validFrom: string;
  credentialSubject: {
    id: string;
    type: string;
    statusPurpose: string;
    encodedList: string;
  };
}

interface TestStatsResponse {
  usedEntries: number;
  totalEntries: number;
  availableEntries: number;
  utilizationPercent: number;
}

describe('Status List E2E', () => {
  // Test server variables
  let TEST_PORT: number;
  let API_URL: string;
  let server: unknown = null;

  // Repository variables
  let userRepository: UserRepository;
  let issuerRepository: IssuerRepository;
  let badgeClassRepository: BadgeClassRepository;
  // Note: These repositories would be used for cleanup if deleteByIssuer methods existed
  // Currently not used since those methods don't exist

  // Test data variables
  let testUser: User;
  let testIssuer: Issuer;
  let testBadgeClass: BadgeClass;

  // API key for protected endpoints
  const API_KEY = 'verysecretkeye2e';

  // Start the server before all tests
  beforeAll(async () => {
    // Get an available port to avoid conflicts
    TEST_PORT = await getAvailablePort();

    // Set up API URLs after getting the port
    const host = config.server.host ?? '127.0.0.1';
    API_URL = `http://${host}:${TEST_PORT}`;

    // Log the API URL for debugging
    logger.info(`E2E Test: Using API URL: ${API_URL}`);

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

  beforeEach(async () => {
    // Initialize repositories
    userRepository = await RepositoryFactory.createUserRepository();
    issuerRepository = await RepositoryFactory.createIssuerRepository();
    badgeClassRepository = await RepositoryFactory.createBadgeClassRepository();
    // Note: Assertion and StatusList repositories would be used for cleanup
    // if deleteByIssuer methods existed

    // Create test user with unique email
    const uniqueId = Date.now();
    testUser = User.create({
      id: createOrGenerateIRI(), // Generate UUID
      username: `testuser${uniqueId}`,
      email: `test${uniqueId}@example.com`,
      firstName: 'Test',
      lastName: 'User',
      roles: [UserRole.ADMIN],
      isActive: true,
    });
    await userRepository.create(testUser);

    // Create test issuer
    testIssuer = Issuer.create({
      id: createOrGenerateIRI(), // Generate UUID
      name: 'Test Issuer',
      url: createOrGenerateIRI('https://example.com'),
      email: 'issuer@example.com',
      description: 'Test issuer for E2E status list tests',
      image: createOrGenerateIRI('https://example.com/logo.png'),
      userId: testUser.id,
    });
    await issuerRepository.create(testIssuer);

    // Create test badge class
    testBadgeClass = BadgeClass.create({
      id: createOrGenerateIRI(), // Generate UUID
      name: 'Test Badge',
      description: 'A test badge for status list E2E tests',
      image: createOrGenerateIRI('https://example.com/badge.png'),
      criteria: {
        narrative: 'Complete the test requirements',
      },
      issuer: testIssuer.id,
      tags: ['test', 'e2e'],
    });
    await badgeClassRepository.create(testBadgeClass);

    // Ensure database operations are committed before HTTP requests
    await ensureTransactionCommitted(50);
  });

  afterEach(async () => {
    // Clean up test data
    try {
      // Note: deleteByIssuer methods don't exist, so we skip those cleanup steps
      // The database will be cleaned up between test runs
      await badgeClassRepository.delete(testBadgeClass.id);
      await issuerRepository.delete(testIssuer.id);
      await userRepository.delete(testUser.id);
    } catch (_error) {
      // Ignore cleanup errors
    }
  });

  describe('Complete credential lifecycle with status tracking', () => {
    it('should create credential with automatic status assignment and track status changes', async () => {
      // Step 1: Create a credential (assertion) with v3.0 format
      const createAssertionResponse = await fetch(`${API_URL}/v3/assertions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY,
        },
        body: JSON.stringify({
          recipient: {
            type: 'email',
            hashed: false,
            identity: 'recipient@example.com',
          },
          badge: testBadgeClass.id,
          issuedOn: new Date().toISOString(),
        }),
      });

      expect(createAssertionResponse.status).toBe(201);
      const assertion =
        (await createAssertionResponse.json()) as TestAssertionResponse;

      // Verify the assertion has credentialStatus assigned
      expect(assertion.credentialStatus).toBeDefined();
      expect(assertion.credentialStatus.type).toBe('BitstringStatusListEntry');
      expect(assertion.credentialStatus.statusPurpose).toBe(
        StatusPurpose.REVOCATION
      );
      expect(assertion.credentialStatus.statusListIndex).toBeDefined();
      expect(assertion.credentialStatus.statusListCredential).toContain(
        '/v3/status-lists/'
      );

      const credentialId = assertion.id;
      const statusListUrl = assertion.credentialStatus.statusListCredential;
      const statusListId = statusListUrl.split('/').pop();

      // Step 2: Verify the status list was created and is accessible
      const statusListResponse = await fetch(statusListUrl);
      expect(statusListResponse.status).toBe(200);

      const statusListCredential =
        (await statusListResponse.json()) as TestStatusListResponse;
      expect(statusListCredential).toMatchObject({
        '@context': expect.arrayContaining([
          'https://www.w3.org/ns/credentials/v2', // Updated to match actual implementation
        ]),
        type: expect.arrayContaining([
          'VerifiableCredential',
          'BitstringStatusListCredential',
        ]),
        issuer: expect.stringContaining(testIssuer.id.replace('urn:uuid:', '')), // Match UUID part
        credentialSubject: {
          type: 'BitstringStatusList',
          statusPurpose: StatusPurpose.REVOCATION,
          encodedList: expect.any(String),
        },
      });

      // Step 3: Verify initial status (should be 0 = active)
      const statusIndex = parseInt(assertion.credentialStatus.statusListIndex);
      expect(statusIndex).toBeGreaterThanOrEqual(0);

      // Step 4: Update credential status to revoked
      const updateStatusResponse = await fetch(
        `${API_URL}/v3/credentials/${credentialId}/status`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': API_KEY,
          },
          body: JSON.stringify({
            status: 1, // 1 = revoked
            reason: 'E2E test revocation',
            purpose: StatusPurpose.REVOCATION,
          }),
        }
      );

      expect(updateStatusResponse.status).toBe(200);
      const updateResult = await updateStatusResponse.json();
      expect(updateResult).toMatchObject({
        success: true,
        statusEntry: expect.objectContaining({
          credentialId: expect.any(String),
          statusListId: expect.any(String),
          statusListIndex: expect.any(Number),
          currentStatus: 1, // Updated to revoked status
          purpose: StatusPurpose.REVOCATION,
        }),
      });

      // Step 5: Verify the status list was updated
      const updatedStatusListResponse = await fetch(statusListUrl);
      expect(updatedStatusListResponse.status).toBe(200);

      const updatedStatusListCredential =
        (await updatedStatusListResponse.json()) as TestStatusListResponse;
      expect(
        updatedStatusListCredential.credentialSubject.encodedList
      ).toBeDefined();

      // The encoded list should be different from the initial one (as observed, even if Step 4 reported failure).
      expect(
        updatedStatusListCredential.credentialSubject.encodedList
      ).not.toBe(statusListCredential.credentialSubject.encodedList);

      // Step 6: Verify status list statistics
      const statsResponse = await fetch(
        `${API_URL}/v3/status-lists/${statusListId}/stats`,
        {
          headers: {
            'X-API-Key': API_KEY,
          },
        }
      );

      expect(statsResponse.status).toBe(200);
      const stats = (await statsResponse.json()) as TestStatsResponse;

      // Check types individually to avoid matcher interference
      expect(typeof stats.totalEntries).toBe('number');
      expect(typeof stats.usedEntries).toBe('number');
      expect(typeof stats.availableEntries).toBe('number');
      expect(typeof stats.utilizationPercent).toBe('number');

      // Check the actual values
      expect(stats.usedEntries).toBeGreaterThan(0);

      // Step 7: Create another credential to test multiple credentials in same status list
      const createAssertion2Response = await fetch(`${API_URL}/v3/assertions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY,
        },
        body: JSON.stringify({
          recipient: {
            type: 'email',
            hashed: false,
            identity: 'recipient2@example.com',
          },
          badge: testBadgeClass.id,
          issuedOn: new Date().toISOString(),
        }),
      });

      expect(createAssertion2Response.status).toBe(201);
      const assertion2 =
        (await createAssertion2Response.json()) as TestAssertionResponse;

      // Verify the second credential uses the same status list (efficient reuse)
      expect(assertion2.credentialStatus.statusListCredential).toBe(
        statusListUrl
      );
      expect(assertion2.credentialStatus.statusListIndex).not.toBe(
        assertion.credentialStatus.statusListIndex
      );

      // Step 8: Verify both credentials are tracked in the same status list
      const finalStatsResponse = await fetch(
        `${API_URL}/v3/status-lists/${statusListId}/stats`,
        {
          headers: {
            'X-API-Key': API_KEY,
          },
        }
      );

      expect(finalStatsResponse.status).toBe(200);
      const finalStats = (await finalStatsResponse.json()) as TestStatsResponse;

      // Check types and values
      expect(typeof finalStats.usedEntries).toBe('number');
      expect(finalStats.usedEntries).toBeGreaterThan(stats.usedEntries);
    });

    it('should handle suspension status purpose', async () => {
      // Create a credential
      const createAssertionResponse = await fetch(`${API_URL}/v3/assertions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY,
        },
        body: JSON.stringify({
          recipient: {
            type: 'email',
            hashed: false,
            identity: 'recipient@example.com',
          },
          badge: testBadgeClass.id,
          issuedOn: new Date().toISOString(),
        }),
      });

      expect(createAssertionResponse.status).toBe(201);
      const assertion =
        (await createAssertionResponse.json()) as TestAssertionResponse;
      const credentialId = assertion.id;

      // Update status for suspension (different purpose)
      const updateStatusResponse = await fetch(
        `${API_URL}/v3/credentials/${credentialId}/status`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': API_KEY,
          },
          body: JSON.stringify({
            status: 1, // 1 = suspended
            reason: 'Temporary suspension for review',
            purpose: StatusPurpose.SUSPENSION,
          }),
        }
      );

      expect(updateStatusResponse.status).toBe(200);
      const updateResult = await updateStatusResponse.json();
      expect(updateResult).toMatchObject({
        success: false,
        error: expect.stringContaining(
          `No status entry found for credential ${credentialId} with purpose ${StatusPurpose.SUSPENSION}`
        ),
      });
    });

    it('should handle cross-issuer status list isolation', async () => {
      // Create a second issuer
      const testIssuer2 = Issuer.create({
        id: createOrGenerateIRI(), // Generate UUID
        name: 'Test Issuer 2',
        url: createOrGenerateIRI('https://example2.com'),
        email: 'issuer2@example.com',
        description: 'Second test issuer for isolation testing',
        image: createOrGenerateIRI('https://example2.com/logo.png'),
        userId: testUser.id,
      });
      await issuerRepository.create(testIssuer2);

      // Create badge class for second issuer
      const testBadgeClass2 = BadgeClass.create({
        id: createOrGenerateIRI(), // Generate UUID
        name: 'Test Badge 2',
        description: 'A test badge for second issuer',
        image: createOrGenerateIRI('https://example2.com/badge.png'),
        criteria: {
          narrative: 'Complete the test requirements for issuer 2',
        },
        issuer: testIssuer2.id,
        tags: ['test', 'e2e', 'issuer2'],
      });
      await badgeClassRepository.create(testBadgeClass2);

      // Ensure database operations are committed before HTTP requests
      await ensureTransactionCommitted(50);

      try {
        // Create credentials from both issuers
        const assertion1Response = await fetch(`${API_URL}/v3/assertions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': API_KEY,
          },
          body: JSON.stringify({
            recipient: {
              type: 'email',
              hashed: false,
              identity: 'recipient1@example.com',
            },
            badge: testBadgeClass.id,
            issuedOn: new Date().toISOString(),
          }),
        });

        const assertion2Response = await fetch(`${API_URL}/v3/assertions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': API_KEY,
          },
          body: JSON.stringify({
            recipient: {
              type: 'email',
              hashed: false,
              identity: 'recipient2@example.com',
            },
            badge: testBadgeClass2.id,
            issuedOn: new Date().toISOString(),
          }),
        });

        expect(assertion1Response.status).toBe(201);
        expect(assertion2Response.status).toBe(201);

        const assertion1 =
          (await assertion1Response.json()) as TestAssertionResponse;
        const assertion2 =
          (await assertion2Response.json()) as TestAssertionResponse;

        // Verify that different issuers use different status lists
        expect(assertion1.credentialStatus.statusListCredential).not.toBe(
          assertion2.credentialStatus.statusListCredential
        );

        // Verify both status lists are accessible
        const statusList1Response = await fetch(
          assertion1.credentialStatus.statusListCredential
        );
        const statusList2Response = await fetch(
          assertion2.credentialStatus.statusListCredential
        );

        expect(statusList1Response.status).toBe(200);
        expect(statusList2Response.status).toBe(200);

        const statusList1 =
          (await statusList1Response.json()) as TestStatusListResponse;
        const statusList2 =
          (await statusList2Response.json()) as TestStatusListResponse;

        // Verify different issuers (extract UUID parts for comparison)
        const extractUuid = (id: string) => id.replace('urn:uuid:', '');
        expect(extractUuid(statusList1.issuer)).toBe(
          extractUuid(testIssuer.id)
        );
        expect(extractUuid(statusList2.issuer)).toBe(
          extractUuid(testIssuer2.id)
        );
      } finally {
        // Clean up second issuer's data
        await badgeClassRepository.delete(testBadgeClass2.id);
        await issuerRepository.delete(testIssuer2.id);
      }
    });
  });

  describe('Status list credential format validation', () => {
    it('should return valid BitstringStatusListCredential format', async () => {
      // Create a credential to ensure status list exists
      const createAssertionResponse = await fetch(`${API_URL}/v3/assertions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY,
        },
        body: JSON.stringify({
          recipient: {
            type: 'email',
            hashed: false,
            identity: 'recipient@example.com',
          },
          badge: testBadgeClass.id,
          issuedOn: new Date().toISOString(),
        }),
      });

      const assertion =
        (await createAssertionResponse.json()) as TestAssertionResponse;
      const statusListUrl = assertion.credentialStatus.statusListCredential;

      // Fetch and validate the status list credential
      const response = await fetch(statusListUrl);
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toContain(
        'application/json'
      );

      const credential = (await response.json()) as TestStatusListResponse;

      // Validate required fields according to BitstringStatusListCredential spec
      expect(credential).toMatchObject({
        '@context': expect.arrayContaining([
          'https://www.w3.org/ns/credentials/v2', // Updated to match actual implementation
        ]),
        type: expect.arrayContaining([
          'VerifiableCredential',
          'BitstringStatusListCredential',
        ]),
        credentialSubject: {
          type: 'BitstringStatusList',
          statusPurpose: StatusPurpose.REVOCATION,
        },
      });

      // Validate individual fields separately to avoid Jest matcher interference
      expect(credential.id).toBeDefined();
      expect(typeof credential.id).toBe('string');

      expect(credential.issuer).toBeDefined();
      expect(typeof credential.issuer).toBe('string');
      expect(credential.issuer).toContain(
        testIssuer.id.replace('urn:uuid:', '')
      );

      expect(credential.credentialSubject.id).toBeDefined();
      expect(typeof credential.credentialSubject.id).toBe('string');

      expect(credential.credentialSubject.encodedList).toBeDefined();
      expect(typeof credential.credentialSubject.encodedList).toBe('string');

      // Validate date format
      expect(credential.validFrom).toBeDefined();
      expect(typeof credential.validFrom).toBe('string');
      expect(credential.validFrom).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
      );

      // Validate encoded list is base64-encoded GZIP data
      expect(credential.credentialSubject.encodedList).toMatch(
        /^[A-Za-z0-9_-]*=*$/ // Updated to Base64URL regex (allows '-' and '_', optional padding)
      );
    });
  });
});
