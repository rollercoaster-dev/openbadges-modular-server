/**
 * End-to-end tests for status list functionality
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { app } from '../../src/index';
import { RepositoryFactory } from '../../src/infrastructure/repository.factory';
import { StatusPurpose } from '../../src/domains/status-list/status-list.types';
import { BadgeVersion } from '../../src/utils/version/badge-version';
import { User } from '../../src/domains/user/user.entity';
import { Issuer } from '../../src/domains/issuer/issuer.entity';
import { BadgeClass } from '../../src/domains/badge-class/badge-class.entity';
import { UserRole } from '../../src/domains/user/user.types';

describe('Status List E2E', () => {
  let userRepository: any;
  let issuerRepository: any;
  let badgeClassRepository: any;
  let assertionRepository: any;
  let statusListRepository: any;
  
  let testUser: User;
  let testIssuer: Issuer;
  let testBadgeClass: BadgeClass;
  let authToken: string;

  beforeEach(async () => {
    // Initialize repositories
    userRepository = await RepositoryFactory.createUserRepository();
    issuerRepository = await RepositoryFactory.createIssuerRepository();
    badgeClassRepository = await RepositoryFactory.createBadgeClassRepository();
    assertionRepository = await RepositoryFactory.createAssertionRepository();
    statusListRepository = await RepositoryFactory.createStatusListRepository();

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
      description: 'Test issuer for E2E status list tests',
      image: 'https://example.com/logo.png',
      userId: testUser.id,
    });
    await issuerRepository.create(testIssuer);

    // Create test badge class
    testBadgeClass = BadgeClass.create({
      id: 'test-badge-class-1',
      name: 'Test Badge',
      description: 'A test badge for status list E2E tests',
      image: 'https://example.com/badge.png',
      criteria: {
        narrative: 'Complete the test requirements',
      },
      issuer: testIssuer.id,
      tags: ['test', 'e2e'],
    });
    await badgeClassRepository.create(testBadgeClass);

    // Get auth token (simplified for testing)
    authToken = 'Bearer test-token';
  });

  afterEach(async () => {
    // Clean up test data
    try {
      await assertionRepository.deleteByIssuer?.(testIssuer.id);
      await statusListRepository.deleteByIssuer?.(testIssuer.id);
      await badgeClassRepository.delete(testBadgeClass.id);
      await issuerRepository.delete(testIssuer.id);
      await userRepository.delete(testUser.id);
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Complete credential lifecycle with status tracking', () => {
    it('should create credential with automatic status assignment and track status changes', async () => {
      // Step 1: Create a credential (assertion) with v3.0 format
      const createAssertionResponse = await app.request('/v3/assertions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authToken,
        },
        body: JSON.stringify({
          recipient: {
            type: 'email',
            hashed: false,
            identity: 'recipient@example.com',
          },
          badge: testBadgeClass.id,
          issuer: testIssuer.id,
          issuedOn: new Date().toISOString(),
          version: BadgeVersion.V3,
        }),
      });

      expect(createAssertionResponse.status).toBe(201);
      const assertion = await createAssertionResponse.json();
      
      // Verify the assertion has credentialStatus assigned
      expect(assertion.credentialStatus).toBeDefined();
      expect(assertion.credentialStatus.type).toBe('BitstringStatusListEntry');
      expect(assertion.credentialStatus.statusPurpose).toBe(StatusPurpose.REVOCATION);
      expect(assertion.credentialStatus.statusListIndex).toBeDefined();
      expect(assertion.credentialStatus.statusListCredential).toContain('/v3/status-lists/');

      const credentialId = assertion.id;
      const statusListUrl = assertion.credentialStatus.statusListCredential;
      const statusListId = statusListUrl.split('/').pop();

      // Step 2: Verify the status list was created and is accessible
      const statusListResponse = await app.request(statusListUrl);
      expect(statusListResponse.status).toBe(200);
      
      const statusListCredential = await statusListResponse.json();
      expect(statusListCredential).toMatchObject({
        '@context': expect.arrayContaining([
          'https://www.w3.org/2018/credentials/v1',
          'https://w3id.org/vc/status-list/2021/v1',
        ]),
        type: expect.arrayContaining(['VerifiableCredential', 'BitstringStatusListCredential']),
        issuer: testIssuer.id,
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
      const updateStatusResponse = await app.request(`/v3/credentials/${credentialId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authToken,
        },
        body: JSON.stringify({
          status: 1, // 1 = revoked
          reason: 'E2E test revocation',
          purpose: StatusPurpose.REVOCATION,
        }),
      });

      expect(updateStatusResponse.status).toBe(200);
      const updateResult = await updateStatusResponse.json();
      expect(updateResult).toMatchObject({
        success: true,
        credentialId,
        newStatus: 1,
        reason: 'E2E test revocation',
      });

      // Step 5: Verify the status list was updated
      const updatedStatusListResponse = await app.request(statusListUrl);
      expect(updatedStatusListResponse.status).toBe(200);
      
      const updatedStatusListCredential = await updatedStatusListResponse.json();
      expect(updatedStatusListCredential.credentialSubject.encodedList).toBeDefined();
      
      // The encoded list should be different from the initial one (status was updated)
      expect(updatedStatusListCredential.credentialSubject.encodedList)
        .not.toBe(statusListCredential.credentialSubject.encodedList);

      // Step 6: Verify status list statistics
      const statsResponse = await app.request(`/v3/status-lists/${statusListId}/stats`, {
        headers: {
          'Authorization': authToken,
        },
      });

      expect(statsResponse.status).toBe(200);
      const stats = await statsResponse.json();
      expect(stats).toMatchObject({
        totalEntries: expect.any(Number),
        usedEntries: expect.any(Number),
        availableEntries: expect.any(Number),
        utilizationPercent: expect.any(Number),
      });
      expect(stats.usedEntries).toBeGreaterThan(0);

      // Step 7: Create another credential to test multiple credentials in same status list
      const createAssertion2Response = await app.request('/v3/assertions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authToken,
        },
        body: JSON.stringify({
          recipient: {
            type: 'email',
            hashed: false,
            identity: 'recipient2@example.com',
          },
          badge: testBadgeClass.id,
          issuer: testIssuer.id,
          issuedOn: new Date().toISOString(),
          version: BadgeVersion.V3,
        }),
      });

      expect(createAssertion2Response.status).toBe(201);
      const assertion2 = await createAssertion2Response.json();
      
      // Verify the second credential uses the same status list (efficient reuse)
      expect(assertion2.credentialStatus.statusListCredential).toBe(statusListUrl);
      expect(assertion2.credentialStatus.statusListIndex).not.toBe(assertion.credentialStatus.statusListIndex);

      // Step 8: Verify both credentials are tracked in the same status list
      const finalStatsResponse = await app.request(`/v3/status-lists/${statusListId}/stats`, {
        headers: {
          'Authorization': authToken,
        },
      });

      expect(finalStatsResponse.status).toBe(200);
      const finalStats = await finalStatsResponse.json();
      expect(finalStats.usedEntries).toBeGreaterThan(stats.usedEntries);
    });

    it('should handle suspension status purpose', async () => {
      // Create a credential
      const createAssertionResponse = await app.request('/v3/assertions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authToken,
        },
        body: JSON.stringify({
          recipient: {
            type: 'email',
            hashed: false,
            identity: 'recipient@example.com',
          },
          badge: testBadgeClass.id,
          issuer: testIssuer.id,
          issuedOn: new Date().toISOString(),
          version: BadgeVersion.V3,
        }),
      });

      expect(createAssertionResponse.status).toBe(201);
      const assertion = await createAssertionResponse.json();
      const credentialId = assertion.id;

      // Update status for suspension (different purpose)
      const updateStatusResponse = await app.request(`/v3/credentials/${credentialId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authToken,
        },
        body: JSON.stringify({
          status: 1, // 1 = suspended
          reason: 'Temporary suspension for review',
          purpose: StatusPurpose.SUSPENSION,
        }),
      });

      expect(updateStatusResponse.status).toBe(200);
      const updateResult = await updateStatusResponse.json();
      expect(updateResult).toMatchObject({
        success: true,
        credentialId,
        newStatus: 1,
        reason: 'Temporary suspension for review',
      });
    });

    it('should handle cross-issuer status list isolation', async () => {
      // Create a second issuer
      const testIssuer2 = Issuer.create({
        id: 'test-issuer-2',
        name: 'Test Issuer 2',
        url: 'https://example2.com',
        email: 'issuer2@example.com',
        description: 'Second test issuer for isolation testing',
        image: 'https://example2.com/logo.png',
        userId: testUser.id,
      });
      await issuerRepository.create(testIssuer2);

      // Create badge class for second issuer
      const testBadgeClass2 = BadgeClass.create({
        id: 'test-badge-class-2',
        name: 'Test Badge 2',
        description: 'A test badge for second issuer',
        image: 'https://example2.com/badge.png',
        criteria: {
          narrative: 'Complete the test requirements for issuer 2',
        },
        issuer: testIssuer2.id,
        tags: ['test', 'e2e', 'issuer2'],
      });
      await badgeClassRepository.create(testBadgeClass2);

      try {
        // Create credentials from both issuers
        const assertion1Response = await app.request('/v3/assertions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authToken,
          },
          body: JSON.stringify({
            recipient: {
              type: 'email',
              hashed: false,
              identity: 'recipient1@example.com',
            },
            badge: testBadgeClass.id,
            issuer: testIssuer.id,
            issuedOn: new Date().toISOString(),
            version: BadgeVersion.V3,
          }),
        });

        const assertion2Response = await app.request('/v3/assertions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authToken,
          },
          body: JSON.stringify({
            recipient: {
              type: 'email',
              hashed: false,
              identity: 'recipient2@example.com',
            },
            badge: testBadgeClass2.id,
            issuer: testIssuer2.id,
            issuedOn: new Date().toISOString(),
            version: BadgeVersion.V3,
          }),
        });

        expect(assertion1Response.status).toBe(201);
        expect(assertion2Response.status).toBe(201);

        const assertion1 = await assertion1Response.json();
        const assertion2 = await assertion2Response.json();

        // Verify that different issuers use different status lists
        expect(assertion1.credentialStatus.statusListCredential)
          .not.toBe(assertion2.credentialStatus.statusListCredential);

        // Verify both status lists are accessible
        const statusList1Response = await app.request(assertion1.credentialStatus.statusListCredential);
        const statusList2Response = await app.request(assertion2.credentialStatus.statusListCredential);

        expect(statusList1Response.status).toBe(200);
        expect(statusList2Response.status).toBe(200);

        const statusList1 = await statusList1Response.json();
        const statusList2 = await statusList2Response.json();

        // Verify different issuers
        expect(statusList1.issuer).toBe(testIssuer.id);
        expect(statusList2.issuer).toBe(testIssuer2.id);
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
      const createAssertionResponse = await app.request('/v3/assertions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authToken,
        },
        body: JSON.stringify({
          recipient: {
            type: 'email',
            hashed: false,
            identity: 'recipient@example.com',
          },
          badge: testBadgeClass.id,
          issuer: testIssuer.id,
          issuedOn: new Date().toISOString(),
          version: BadgeVersion.V3,
        }),
      });

      const assertion = await createAssertionResponse.json();
      const statusListUrl = assertion.credentialStatus.statusListCredential;

      // Fetch and validate the status list credential
      const response = await app.request(statusListUrl);
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toContain('application/json');

      const credential = await response.json();

      // Validate required fields according to BitstringStatusListCredential spec
      expect(credential).toMatchObject({
        '@context': expect.arrayContaining([
          'https://www.w3.org/2018/credentials/v1',
          'https://w3id.org/vc/status-list/2021/v1',
        ]),
        id: expect.any(String),
        type: expect.arrayContaining(['VerifiableCredential', 'BitstringStatusListCredential']),
        issuer: testIssuer.id,
        validFrom: expect.any(String),
        credentialSubject: {
          id: expect.any(String),
          type: 'BitstringStatusList',
          statusPurpose: StatusPurpose.REVOCATION,
          encodedList: expect.any(String),
        },
      });

      // Validate date format
      expect(new Date(credential.validFrom).toISOString()).toBe(credential.validFrom);

      // Validate encoded list is base64-encoded GZIP data
      expect(credential.credentialSubject.encodedList).toMatch(/^[A-Za-z0-9+/]+=*$/);
    });
  });
});
