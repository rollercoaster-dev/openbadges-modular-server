/**
 * End-to-End tests for StatusList2021 functionality
 *
 * This file contains comprehensive E2E tests that verify the complete
 * StatusList2021 workflow from assertion creation to status verification.
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { Hono } from 'hono';
import { setupTestApp } from './setup-test-app';
import { RepositoryFactory } from '@/infrastructure/repository.factory';
import { ServiceFactory } from '@/core/service.factory';
import { CredentialStatus } from '@/core/types/status-list.types';
import { Shared } from 'openbadges-types';

describe('StatusList2021 E2E Tests', () => {
  let app: Hono;
  let baseUrl: string;

  // Test data
  const testIssuer = {
    id: 'https://example.com/issuer/e2e-test',
    type: 'Profile',
    name: 'E2E Test Issuer',
    url: 'https://example.com',
    email: 'test@example.com',
  };

  const testBadgeClass = {
    id: 'https://example.com/badgeclass/e2e-test',
    type: 'BadgeClass',
    name: 'E2E Test Badge',
    description: 'A badge for E2E testing',
    image: 'https://example.com/badge.png',
    criteria: {
      narrative: 'Complete the E2E test',
    },
    issuer: testIssuer.id,
  };

  beforeAll(async () => {
    // Setup test application
    const { app: testApp, baseUrl: testBaseUrl } = await setupTestApp();
    app = testApp;
    baseUrl = testBaseUrl;

    // Initialize repositories and services
    await RepositoryFactory.initialize({
      type: 'sqlite',
      sqliteFile: ':memory:',
    });
  });

  afterAll(async () => {
    // Clean up
    await RepositoryFactory.close();
    ServiceFactory.reset();
  });

  beforeEach(async () => {
    // Reset services for each test
    ServiceFactory.reset();
  });

  describe('Complete StatusList2021 Workflow', () => {
    test('should create assertion with StatusList integration and verify status', async () => {
      // Step 1: Create issuer
      const issuerResponse = await app.request('/v3/issuers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testIssuer),
      });

      expect(issuerResponse.status).toBe(201);
      const createdIssuer = await issuerResponse.json();

      // Step 2: Create badge class
      const badgeClassResponse = await app.request('/v3/badgeclasses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...testBadgeClass,
          issuer: createdIssuer.id,
        }),
      });

      expect(badgeClassResponse.status).toBe(201);
      const createdBadgeClass = await badgeClassResponse.json();

      // Step 3: Create assertion (should automatically assign to status list)
      const assertionData = {
        type: 'Assertion',
        recipient: {
          type: 'email',
          hashed: false,
          identity: 'test@example.com',
        },
        badgeClass: createdBadgeClass.id,
        issuedOn: new Date().toISOString(),
      };

      const assertionResponse = await app.request('/v3/assertions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(assertionData),
      });

      expect(assertionResponse.status).toBe(201);
      const createdAssertion = await assertionResponse.json();

      // Verify assertion has credentialStatus
      expect(createdAssertion.credentialStatus).toBeDefined();
      expect(createdAssertion.credentialStatus.type).toBe('StatusList2021Entry');
      expect(createdAssertion.credentialStatus.statusPurpose).toBe('revocation');
      expect(createdAssertion.credentialStatus.statusListIndex).toBeDefined();
      expect(createdAssertion.credentialStatus.statusListCredential).toBeDefined();

      // Step 4: Verify initial status is valid
      const statusResponse = await app.request(
        `/v3/credentials/${encodeURIComponent(createdAssertion.id)}/status`
      );

      expect(statusResponse.status).toBe(200);
      const statusResult = await statusResponse.json();
      expect(statusResult.status).toBe(CredentialStatus.VALID);

      // Step 5: Get the status list credential
      const statusListId = createdAssertion.credentialStatus.statusListCredential;
      const statusListResponse = await app.request(
        `/v3/status-lists/${encodeURIComponent(statusListId)}`
      );

      expect(statusListResponse.status).toBe(200);
      const statusListCredential = await statusListResponse.json();

      // Verify status list credential format
      expect(statusListCredential['@context']).toEqual([
        'https://www.w3.org/2018/credentials/v1',
        'https://w3id.org/vc/status-list/2021/v1'
      ]);
      expect(statusListCredential.type).toEqual(['VerifiableCredential', 'StatusList2021Credential']);
      expect(statusListCredential.issuer).toBe(createdIssuer.id);
      expect(statusListCredential.credentialSubject.type).toBe('StatusList2021');
      expect(statusListCredential.credentialSubject.statusPurpose).toBe('revocation');
      expect(statusListCredential.credentialSubject.encodedList).toBeDefined();

      // Step 6: Revoke the assertion
      const revokeResponse = await app.request(
        `/v3/credentials/${encodeURIComponent(createdAssertion.id)}/status`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: CredentialStatus.REVOKED_OR_SUSPENDED,
            reason: 'E2E test revocation',
          }),
        }
      );

      expect(revokeResponse.status).toBe(200);
      const revokeResult = await revokeResponse.json();
      expect(revokeResult.status).toBe(CredentialStatus.REVOKED_OR_SUSPENDED);
      expect(revokeResult.reason).toBe('E2E test revocation');

      // Step 7: Verify status is now revoked
      const updatedStatusResponse = await app.request(
        `/v3/credentials/${encodeURIComponent(createdAssertion.id)}/status`
      );

      expect(updatedStatusResponse.status).toBe(200);
      const updatedStatusResult = await updatedStatusResponse.json();
      expect(updatedStatusResult.status).toBe(CredentialStatus.REVOKED_OR_SUSPENDED);
      expect(updatedStatusResult.reason).toBe('E2E test revocation');

      // Step 8: Verify the status list bitstring was updated
      const updatedStatusListResponse = await app.request(
        `/v3/status-lists/${encodeURIComponent(statusListId)}`
      );

      expect(updatedStatusListResponse.status).toBe(200);
      const updatedStatusListCredential = await updatedStatusListResponse.json();

      // The bitstring should be different after the status update
      expect(updatedStatusListCredential.credentialSubject.encodedList).not.toBe(
        statusListCredential.credentialSubject.encodedList
      );

      // Step 9: Verify assertion verification fails for revoked credential
      const verifyResponse = await app.request(
        `/v3/assertions/${encodeURIComponent(createdAssertion.id)}/verify`
      );

      expect(verifyResponse.status).toBe(200);
      const verifyResult = await verifyResponse.json();
      
      // The verification should indicate the credential is revoked
      expect(verifyResult.verified).toBe(false);
      expect(verifyResult.error).toContain('revoked');
    });

    test('should handle multiple credentials in same status list', async () => {
      // Create issuer and badge class
      const issuer = {
        id: 'https://example.com/issuer/multi-test',
        type: 'Profile',
        name: 'Multi Test Issuer',
        url: 'https://example.com',
        email: 'multi@example.com',
      };

      const issuerResponse = await app.request('/v3/issuers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(issuer),
      });

      expect(issuerResponse.status).toBe(201);
      const createdIssuer = await issuerResponse.json();

      const badgeClass = {
        id: 'https://example.com/badgeclass/multi-test',
        type: 'BadgeClass',
        name: 'Multi Test Badge',
        description: 'A badge for multi-credential testing',
        image: 'https://example.com/badge.png',
        criteria: {
          narrative: 'Complete the multi test',
        },
        issuer: createdIssuer.id,
      };

      const badgeClassResponse = await app.request('/v3/badgeclasses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(badgeClass),
      });

      expect(badgeClassResponse.status).toBe(201);
      const createdBadgeClass = await badgeClassResponse.json();

      // Create multiple assertions
      const assertions = [];
      for (let i = 0; i < 3; i++) {
        const assertionData = {
          type: 'Assertion',
          recipient: {
            type: 'email',
            hashed: false,
            identity: `test${i}@example.com`,
          },
          badgeClass: createdBadgeClass.id,
          issuedOn: new Date().toISOString(),
        };

        const assertionResponse = await app.request('/v3/assertions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(assertionData),
        });

        expect(assertionResponse.status).toBe(201);
        const assertion = await assertionResponse.json();
        assertions.push(assertion);
      }

      // Verify all assertions have credentialStatus and use the same status list
      const statusListId = assertions[0].credentialStatus.statusListCredential;
      for (const assertion of assertions) {
        expect(assertion.credentialStatus).toBeDefined();
        expect(assertion.credentialStatus.statusListCredential).toBe(statusListId);
        expect(assertion.credentialStatus.statusListIndex).toBeDefined();
      }

      // Verify each assertion has a unique index
      const indexes = assertions.map(a => parseInt(a.credentialStatus.statusListIndex));
      const uniqueIndexes = new Set(indexes);
      expect(uniqueIndexes.size).toBe(assertions.length);

      // Revoke the middle assertion
      const middleAssertion = assertions[1];
      const revokeResponse = await app.request(
        `/v3/credentials/${encodeURIComponent(middleAssertion.id)}/status`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: CredentialStatus.REVOKED_OR_SUSPENDED,
            reason: 'Multi-test revocation',
          }),
        }
      );

      expect(revokeResponse.status).toBe(200);

      // Verify only the middle assertion is revoked
      for (let i = 0; i < assertions.length; i++) {
        const statusResponse = await app.request(
          `/v3/credentials/${encodeURIComponent(assertions[i].id)}/status`
        );

        expect(statusResponse.status).toBe(200);
        const statusResult = await statusResponse.json();

        if (i === 1) {
          // Middle assertion should be revoked
          expect(statusResult.status).toBe(CredentialStatus.REVOKED_OR_SUSPENDED);
          expect(statusResult.reason).toBe('Multi-test revocation');
        } else {
          // Other assertions should still be valid
          expect(statusResult.status).toBe(CredentialStatus.VALID);
        }
      }
    });

    test('should handle suspension purpose separately from revocation', async () => {
      // Create issuer and badge class
      const issuer = {
        id: 'https://example.com/issuer/suspension-test',
        type: 'Profile',
        name: 'Suspension Test Issuer',
        url: 'https://example.com',
        email: 'suspension@example.com',
      };

      const issuerResponse = await app.request('/v3/issuers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(issuer),
      });

      expect(issuerResponse.status).toBe(201);
      const createdIssuer = await issuerResponse.json();

      // Create status lists for both revocation and suspension
      const revocationStatusListResponse = await app.request('/v3/status-lists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          issuerId: createdIssuer.id,
          purpose: 'revocation',
        }),
      });

      expect(revocationStatusListResponse.status).toBe(201);
      const revocationStatusList = await revocationStatusListResponse.json();

      const suspensionStatusListResponse = await app.request('/v3/status-lists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          issuerId: createdIssuer.id,
          purpose: 'suspension',
        }),
      });

      expect(suspensionStatusListResponse.status).toBe(201);
      const suspensionStatusList = await suspensionStatusListResponse.json();

      // Verify different status lists were created
      expect(revocationStatusList.id).not.toBe(suspensionStatusList.id);
      expect(revocationStatusList.purpose).toBe('revocation');
      expect(suspensionStatusList.purpose).toBe('suspension');

      // Verify status list credentials have correct purposes
      const revocationCredentialResponse = await app.request(
        `/v3/status-lists/${encodeURIComponent(revocationStatusList.id)}`
      );
      const suspensionCredentialResponse = await app.request(
        `/v3/status-lists/${encodeURIComponent(suspensionStatusList.id)}`
      );

      expect(revocationCredentialResponse.status).toBe(200);
      expect(suspensionCredentialResponse.status).toBe(200);

      const revocationCredential = await revocationCredentialResponse.json();
      const suspensionCredential = await suspensionCredentialResponse.json();

      expect(revocationCredential.credentialSubject.statusPurpose).toBe('revocation');
      expect(suspensionCredential.credentialSubject.statusPurpose).toBe('suspension');
    });
  });

  describe('StatusList2021 Performance and Scalability', () => {
    test('should handle large number of credentials efficiently', async () => {
      // Create issuer and badge class for performance test
      const issuer = {
        id: 'https://example.com/issuer/perf-test',
        type: 'Profile',
        name: 'Performance Test Issuer',
        url: 'https://example.com',
        email: 'perf@example.com',
      };

      const issuerResponse = await app.request('/v3/issuers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(issuer),
      });

      expect(issuerResponse.status).toBe(201);
      const createdIssuer = await issuerResponse.json();

      // Create a status list
      const statusListResponse = await app.request('/v3/status-lists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          issuerId: createdIssuer.id,
          purpose: 'revocation',
        }),
      });

      expect(statusListResponse.status).toBe(201);
      const statusList = await statusListResponse.json();

      // Assign multiple credentials to the status list
      const credentialIds = [];
      const batchSize = 10; // Reduced for E2E test performance

      for (let i = 0; i < batchSize; i++) {
        const credentialId = `https://example.com/credentials/perf-test-${i}`;
        credentialIds.push(credentialId);

        const assignResponse = await app.request(
          `/v3/credentials/${encodeURIComponent(credentialId)}/assign-status`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              issuerId: createdIssuer.id,
              purpose: 'revocation',
            }),
          }
        );

        expect(assignResponse.status).toBe(201);
      }

      // Verify all credentials were assigned unique indexes
      const statusEntries = [];
      for (const credentialId of credentialIds) {
        const statusResponse = await app.request(
          `/v3/credentials/${encodeURIComponent(credentialId)}/status`
        );

        expect(statusResponse.status).toBe(200);
        const statusEntry = await statusResponse.json();
        statusEntries.push(statusEntry);
      }

      // Verify unique indexes
      const indexes = statusEntries.map(entry => entry.statusListIndex);
      const uniqueIndexes = new Set(indexes);
      expect(uniqueIndexes.size).toBe(credentialIds.length);

      // Verify indexes are sequential starting from 0
      indexes.sort((a, b) => a - b);
      for (let i = 0; i < indexes.length; i++) {
        expect(indexes[i]).toBe(i);
      }
    });
  });
});
