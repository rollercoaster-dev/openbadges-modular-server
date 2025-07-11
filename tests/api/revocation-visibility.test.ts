/**
 * Tests for revocation visibility compliance
 *
 * This test verifies that revoked assertions return 410 Gone status
 * when accessed via GET endpoints, ensuring Open Badges compliance.
 */

import { describe, expect, it, beforeAll, afterAll } from 'bun:test';
import { setupTestApp, stopTestServer } from '../e2e/setup-test-app';
import {
  getAvailablePort,
  releasePort,
} from '../e2e/helpers/port-manager.helper';
import { resetDatabase } from '../e2e/helpers/database-reset.helper';
import { logger } from '@/utils/logging/logger.service';

describe('Revocation Visibility Compliance', () => {
  let TEST_PORT: number;
  let API_URL: string;
  let server: unknown = null;
  const API_KEY = 'verysecretkeye2e';

  // Store created resources for cleanup
  const createdResources: {
    issuerId?: string;
    badgeClassId?: string;
    assertionId?: string;
  } = {};

  beforeAll(async () => {
    // Reset database to ensure clean state
    await resetDatabase();

    // Get available port
    TEST_PORT = await getAvailablePort();
    API_URL = `http://127.0.0.1:${TEST_PORT}`;

    // Setup test app
    const { app: _app, server: testServer } = await setupTestApp(TEST_PORT);
    server = testServer;

    logger.info('Test server started', { port: TEST_PORT, url: API_URL });

    // Create test issuer
    const issuerResponse = await fetch(`${API_URL}/v3/issuers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
      },
      body: JSON.stringify({
        name: 'Revocation Test Issuer',
        url: 'https://example.com/issuer',
        email: 'issuer@example.com',
      }),
    });
    expect(issuerResponse.status).toBe(201);
    const issuer = await issuerResponse.json();
    createdResources.issuerId = issuer.id;

    // Create test badge class
    const badgeClassResponse = await fetch(`${API_URL}/v3/achievements`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
      },
      body: JSON.stringify({
        name: 'Revocation Test Badge',
        description: 'A test badge for revocation testing',
        image: 'https://example.com/badge.png',
        criteria: 'https://example.com/criteria',
        issuer: issuer.id,
      }),
    });
    expect(badgeClassResponse.status).toBe(201);
    const badgeClass = await badgeClassResponse.json();
    createdResources.badgeClassId = badgeClass.id;

    // Create test assertion
    const assertionResponse = await fetch(`${API_URL}/v3/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
      },
      body: JSON.stringify({
        recipient: {
          type: 'email',
          identity: 'recipient@example.com',
          hashed: false,
        },
        badge: badgeClass.id,
        issuedOn: new Date().toISOString(),
      }),
    });
    expect(assertionResponse.status).toBe(201);
    const assertion = await assertionResponse.json();
    createdResources.assertionId = assertion.id;
  });

  afterAll(async () => {
    // Clean up test data
    if (createdResources.assertionId) {
      await fetch(`${API_URL}/v3/credentials/${createdResources.assertionId}`, {
        method: 'DELETE',
        headers: { 'X-API-Key': API_KEY },
      });
    }
    if (createdResources.badgeClassId) {
      await fetch(
        `${API_URL}/v3/achievements/${createdResources.badgeClassId}`,
        {
          method: 'DELETE',
          headers: { 'X-API-Key': API_KEY },
        }
      );
    }
    if (createdResources.issuerId) {
      await fetch(`${API_URL}/v3/issuers/${createdResources.issuerId}`, {
        method: 'DELETE',
        headers: { 'X-API-Key': API_KEY },
      });
    }

    // Stop server and release port
    await stopTestServer(server);
    await releasePort(TEST_PORT);
  });

  describe('GET /v3/credentials/:id', () => {
    it('should return 200 for active (non-revoked) credentials', async () => {
      const response = await fetch(
        `${API_URL}/v3/credentials/${createdResources.assertionId}`,
        {
          method: 'GET',
          headers: {
            'X-API-Key': API_KEY,
          },
        }
      );

      expect(response.status).toBe(200);
      const credential = await response.json();
      expect(credential.id).toBe(createdResources.assertionId);
    });

    it('should return 410 Gone for revoked credentials', async () => {
      // First revoke the assertion
      const revokeResponse = await fetch(
        `${API_URL}/v3/credentials/${createdResources.assertionId}/revoke`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': API_KEY,
          },
          body: JSON.stringify({
            reason: 'Test revocation for compliance',
          }),
        }
      );
      expect(revokeResponse.status).toBe(200);

      // Now try to get the revoked credential
      const response = await fetch(
        `${API_URL}/v3/credentials/${createdResources.assertionId}`,
        {
          method: 'GET',
          headers: {
            'X-API-Key': API_KEY,
          },
        }
      );

      expect(response.status).toBe(410);
      const errorResponse = await response.json();
      expect(errorResponse.error).toBe('Credential has been revoked');
      expect(errorResponse.code).toBe('CREDENTIAL_REVOKED');
      expect(errorResponse.details.id).toBe(createdResources.assertionId);
      expect(errorResponse.details.revocationReason).toBe(
        'Test revocation for compliance'
      );
    });

    it('should return 404 for non-existent credentials', async () => {
      const nonExistentId = 'urn:uuid:00000000-0000-4000-a000-000000000999';
      const response = await fetch(
        `${API_URL}/v3/credentials/${nonExistentId}`,
        {
          method: 'GET',
          headers: {
            'X-API-Key': API_KEY,
          },
        }
      );

      expect(response.status).toBe(404);
      const errorResponse = await response.json();
      expect(errorResponse.error.toLowerCase()).toContain('not found');
    });
  });

  describe('Verification endpoint behavior', () => {
    it('should still detect revoked status via verification endpoint', async () => {
      // The credential should already be revoked from the previous test
      const response = await fetch(
        `${API_URL}/v3/credentials/${createdResources.assertionId}/verify`,
        {
          method: 'GET',
          headers: {
            'X-API-Key': API_KEY,
          },
        }
      );

      expect(response.status).toBe(200);
      const verificationResult = await response.json();
      expect(verificationResult.isValid).toBe(false);
      // Note: The verification result structure may vary, so we check for revocation indication
      expect(verificationResult.details || verificationResult.reason).toContain(
        'revoked'
      );
    });
  });
});
