/**
 * API tests for status list endpoints
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { app } from '../../src/index';
import { RepositoryFactory } from '../../src/infrastructure/repository.factory';
import { StatusPurpose } from '../../src/domains/status-list/status-list.types';
import { StatusList } from '../../src/domains/status-list/status-list.entity';
import { Issuer } from '../../src/domains/issuer/issuer.entity';
import { User } from '../../src/domains/user/user.entity';
import { UserRole } from '../../src/domains/user/user.types';

describe('Status List API', () => {
  let statusListRepository: any;
  let issuerRepository: any;
  let userRepository: any;
  let testIssuer: Issuer;
  let testUser: User;
  let authToken: string;

  beforeEach(async () => {
    // Initialize repositories
    statusListRepository = await RepositoryFactory.createStatusListRepository();
    issuerRepository = await RepositoryFactory.createIssuerRepository();
    userRepository = await RepositoryFactory.createUserRepository();

    // Create test user
    testUser = User.create({
      id: 'test-user-1',
      email: 'test@example.com',
      name: 'Test User',
      role: UserRole.ADMIN,
      isActive: true,
    });
    await userRepository.create(testUser);

    // Create test issuer
    testIssuer = Issuer.create({
      id: 'test-issuer-1',
      name: 'Test Issuer',
      url: 'https://example.com',
      email: 'issuer@example.com',
      description: 'Test issuer for status list tests',
      image: 'https://example.com/logo.png',
      userId: testUser.id,
    });
    await issuerRepository.create(testIssuer);

    // Get auth token (simplified for testing)
    authToken = 'Bearer test-token';
  });

  afterEach(async () => {
    // Clean up test data
    try {
      await statusListRepository.delete(testIssuer.id);
      await issuerRepository.delete(testIssuer.id);
      await userRepository.delete(testUser.id);
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('POST /v3/status-lists', () => {
    it('should create a new status list', async () => {
      const response = await app.request('/v3/status-lists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authToken,
        },
        body: JSON.stringify({
          issuerId: testIssuer.id,
          purpose: StatusPurpose.REVOCATION,
          statusSize: 1,
          totalEntries: 100000,
        }),
      });

      expect(response.status).toBe(201);
      
      const data = await response.json();
      expect(data).toMatchObject({
        id: expect.any(String),
        issuerId: testIssuer.id,
        purpose: StatusPurpose.REVOCATION,
        statusSize: 1,
        totalEntries: 100000,
        usedEntries: 0,
        encodedList: expect.any(String),
      });
    });

    it('should validate required fields', async () => {
      const response = await app.request('/v3/status-lists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authToken,
        },
        body: JSON.stringify({
          // Missing required fields
        }),
      });

      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.error).toContain('validation');
    });

    it('should require authentication', async () => {
      const response = await app.request('/v3/status-lists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          issuerId: testIssuer.id,
          purpose: StatusPurpose.REVOCATION,
        }),
      });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /v3/status-lists/:id', () => {
    let testStatusList: StatusList;

    beforeEach(async () => {
      // Create a test status list
      testStatusList = StatusList.create({
        id: 'test-status-list-1',
        issuerId: testIssuer.id,
        purpose: StatusPurpose.REVOCATION,
        statusSize: 1,
        totalEntries: 100000,
        usedEntries: 0,
        encodedList: 'H4sIAAAAAAAAA-3BMQEAAADCoPVPbQwfoAAAAAAAAAAAAAAAAAAAAIC3AYbSVKsAQAAA',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await statusListRepository.create(testStatusList);
    });

    it('should return status list credential format', async () => {
      const response = await app.request(`/v3/status-lists/${testStatusList.id}`);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toContain('application/json');
      
      const data = await response.json();
      expect(data).toMatchObject({
        '@context': expect.arrayContaining([
          'https://www.w3.org/2018/credentials/v1',
          'https://w3id.org/vc/status-list/2021/v1',
        ]),
        id: expect.stringContaining(testStatusList.id),
        type: expect.arrayContaining(['VerifiableCredential', 'BitstringStatusListCredential']),
        issuer: testIssuer.id,
        validFrom: expect.any(String),
        credentialSubject: {
          id: expect.stringContaining(testStatusList.id),
          type: 'BitstringStatusList',
          statusPurpose: StatusPurpose.REVOCATION,
          encodedList: testStatusList.encodedList,
        },
      });
    });

    it('should return 404 for non-existent status list', async () => {
      const response = await app.request('/v3/status-lists/non-existent-id');

      expect(response.status).toBe(404);
      
      const data = await response.json();
      expect(data.error).toContain('not found');
    });

    it('should include proper caching headers', async () => {
      const response = await app.request(`/v3/status-lists/${testStatusList.id}`);

      expect(response.status).toBe(200);
      expect(response.headers.get('Cache-Control')).toBeDefined();
      expect(response.headers.get('ETag')).toBeDefined();
    });
  });

  describe('GET /v3/status-lists', () => {
    let testStatusList1: StatusList;
    let testStatusList2: StatusList;

    beforeEach(async () => {
      // Create test status lists
      testStatusList1 = StatusList.create({
        id: 'test-status-list-1',
        issuerId: testIssuer.id,
        purpose: StatusPurpose.REVOCATION,
        statusSize: 1,
        totalEntries: 100000,
        usedEntries: 10,
        encodedList: 'H4sIAAAAAAAAA-3BMQEAAADCoPVPbQwfoAAAAAAAAAAAAAAAAAAAAIC3AYbSVKsAQAAA',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      testStatusList2 = StatusList.create({
        id: 'test-status-list-2',
        issuerId: testIssuer.id,
        purpose: StatusPurpose.SUSPENSION,
        statusSize: 2,
        totalEntries: 50000,
        usedEntries: 5,
        encodedList: 'H4sIAAAAAAAAA-3BMQEAAADCoPVPbQwfoAAAAAAAAAAAAAAAAAAAAIC3AYbSVKsAQAAA',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await statusListRepository.create(testStatusList1);
      await statusListRepository.create(testStatusList2);
    });

    it('should return paginated list of status lists', async () => {
      const response = await app.request('/v3/status-lists', {
        headers: {
          'Authorization': authToken,
        },
      });

      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toMatchObject({
        statusLists: expect.arrayContaining([
          expect.objectContaining({
            id: testStatusList1.id,
            issuerId: testIssuer.id,
            purpose: StatusPurpose.REVOCATION,
          }),
          expect.objectContaining({
            id: testStatusList2.id,
            issuerId: testIssuer.id,
            purpose: StatusPurpose.SUSPENSION,
          }),
        ]),
        pagination: expect.objectContaining({
          page: expect.any(Number),
          limit: expect.any(Number),
          total: expect.any(Number),
        }),
      });
    });

    it('should filter by issuer ID', async () => {
      const response = await app.request(`/v3/status-lists?issuerId=${testIssuer.id}`, {
        headers: {
          'Authorization': authToken,
        },
      });

      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.statusLists).toHaveLength(2);
      data.statusLists.forEach((statusList: any) => {
        expect(statusList.issuerId).toBe(testIssuer.id);
      });
    });

    it('should filter by purpose', async () => {
      const response = await app.request(`/v3/status-lists?purpose=${StatusPurpose.REVOCATION}`, {
        headers: {
          'Authorization': authToken,
        },
      });

      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.statusLists).toHaveLength(1);
      expect(data.statusLists[0].purpose).toBe(StatusPurpose.REVOCATION);
    });

    it('should require authentication', async () => {
      const response = await app.request('/v3/status-lists');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /v3/status-lists/:id/stats', () => {
    let testStatusList: StatusList;

    beforeEach(async () => {
      testStatusList = StatusList.create({
        id: 'test-status-list-1',
        issuerId: testIssuer.id,
        purpose: StatusPurpose.REVOCATION,
        statusSize: 1,
        totalEntries: 100000,
        usedEntries: 1500,
        encodedList: 'H4sIAAAAAAAAA-3BMQEAAADCoPVPbQwfoAAAAAAAAAAAAAAAAAAAAIC3AYbSVKsAQAAA',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await statusListRepository.create(testStatusList);
    });

    it('should return status list statistics', async () => {
      const response = await app.request(`/v3/status-lists/${testStatusList.id}/stats`, {
        headers: {
          'Authorization': authToken,
        },
      });

      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toMatchObject({
        totalEntries: 100000,
        usedEntries: 1500,
        availableEntries: 98500,
        utilizationPercent: 1.5,
      });
    });

    it('should return 404 for non-existent status list', async () => {
      const response = await app.request('/v3/status-lists/non-existent-id/stats', {
        headers: {
          'Authorization': authToken,
        },
      });

      expect(response.status).toBe(404);
    });

    it('should require authentication', async () => {
      const response = await app.request(`/v3/status-lists/${testStatusList.id}/stats`);

      expect(response.status).toBe(401);
    });
  });

  describe('POST /v3/credentials/:id/status', () => {
    let testStatusList: StatusList;

    beforeEach(async () => {
      testStatusList = StatusList.create({
        id: 'test-status-list-1',
        issuerId: testIssuer.id,
        purpose: StatusPurpose.REVOCATION,
        statusSize: 1,
        totalEntries: 100000,
        usedEntries: 0,
        encodedList: 'H4sIAAAAAAAAA-3BMQEAAADCoPVPbQwfoAAAAAAAAAAAAAAAAAAAAIC3AYbSVKsAQAAA',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await statusListRepository.create(testStatusList);

      // Create a status entry for testing
      await statusListRepository.createStatusEntry({
        credentialId: 'test-credential-1',
        statusListId: testStatusList.id,
        statusListIndex: 0,
        statusSize: 1,
        purpose: StatusPurpose.REVOCATION,
        currentStatus: 0,
      });
    });

    it('should update credential status', async () => {
      const response = await app.request('/v3/credentials/test-credential-1/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authToken,
        },
        body: JSON.stringify({
          status: 1,
          reason: 'Credential revoked for testing',
          purpose: StatusPurpose.REVOCATION,
        }),
      });

      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toMatchObject({
        success: true,
        credentialId: 'test-credential-1',
        newStatus: 1,
        reason: 'Credential revoked for testing',
      });
    });

    it('should validate status value', async () => {
      const response = await app.request('/v3/credentials/test-credential-1/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authToken,
        },
        body: JSON.stringify({
          status: -1, // Invalid status
          purpose: StatusPurpose.REVOCATION,
        }),
      });

      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.error).toContain('validation');
    });

    it('should return 404 for non-existent credential', async () => {
      const response = await app.request('/v3/credentials/non-existent-credential/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authToken,
        },
        body: JSON.stringify({
          status: 1,
          purpose: StatusPurpose.REVOCATION,
        }),
      });

      expect(response.status).toBe(404);
      
      const data = await response.json();
      expect(data.error).toContain('not found');
    });

    it('should require authentication', async () => {
      const response = await app.request('/v3/credentials/test-credential-1/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 1,
          purpose: StatusPurpose.REVOCATION,
        }),
      });

      expect(response.status).toBe(401);
    });
  });
});
