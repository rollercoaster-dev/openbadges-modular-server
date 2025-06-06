/**
 * API tests for credential status update endpoints
 *
 * This file focuses on end-to-end testing of credential status updates
 * including integration with status lists and proper BitstringStatusListEntry format.
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { Hono } from 'hono';
import { createVersionedRouter } from '@/api/api.router';
import { BadgeVersion } from '@/utils/version/badge-version';
import { StatusPurpose } from '../../src/domains/status-list/status-list.types';
import type { IssuerController } from '@/api/controllers/issuer.controller';
import type { BadgeClassController } from '@/api/controllers/badgeClass.controller';
import type { AssertionController } from '@/api/controllers/assertion.controller';
import type { StatusListController } from '@/api/controllers/status-list.controller';
import {
  StatusUpdateResponseDto,
  BitstringStatusListCredentialResponseDto,
} from '@/api/dtos';

// Error response interface for validation errors
interface ErrorResponse {
  success: boolean;
  error: string;
}

// Mock controllers
const mockIssuerController = {
  createIssuer: mock(async () => ({ id: 'test-issuer-id' })),
  getIssuerById: mock(async () => ({
    id: 'test-issuer-id',
    name: 'Test Issuer',
    url: 'https://example.com',
  })),
} as unknown as IssuerController;

const mockBadgeClassController = {
  createBadgeClass: mock(async () => ({ id: 'test-achievement-id' })),
  getBadgeClassById: mock(async () => ({ id: 'test-achievement-id' })),
} as unknown as BadgeClassController;

const mockAssertionController = {
  createAssertion: mock(async () => ({
    id: 'test-credential-id',
    credentialStatus: {
      id: 'https://example.com/status-lists/test-status-list-1#12345',
      type: 'BitstringStatusListEntry',
      statusPurpose: StatusPurpose.REVOCATION,
      statusListIndex: '12345',
      statusListCredential:
        'https://example.com/status-lists/test-status-list-1',
    },
  })),
  getAssertionById: mock(async () => ({
    id: 'test-credential-id',
    credentialStatus: {
      id: 'https://example.com/status-lists/test-status-list-1#12345',
      type: 'BitstringStatusListEntry',
      statusPurpose: StatusPurpose.REVOCATION,
      statusListIndex: '12345',
      statusListCredential:
        'https://example.com/status-lists/test-status-list-1',
    },
  })),
} as unknown as AssertionController;

const mockStatusListController = {
  createStatusList: mock(async () => ({
    id: 'test-status-list-1',
    issuerId: 'test-issuer-1',
    purpose: StatusPurpose.REVOCATION,
    statusSize: 1,
    totalEntries: 100000,
    usedEntries: 1,
    encodedList:
      'H4sIAAAAAAAAA-3BMQEAAADCoPVPbQwfoAAAAAAAAAAAAAAAAAAAAIC3AYbSVKsAQAAA',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })),
  getStatusListById: mock(async () => ({
    id: 'test-status-list-1',
    issuerId: 'test-issuer-1',
    purpose: StatusPurpose.REVOCATION,
    statusSize: 1,
    totalEntries: 100000,
    usedEntries: 1,
    encodedList:
      'H4sIAAAAAAAAA-3BMQEAAADCoPVPbQwfoAAAAAAAAAAAAAAAAAAAAIC3AYbSVKsAQAAA',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })),
  getStatusListCredential: mock(async () => ({
    '@context': [
      'https://www.w3.org/2018/credentials/v1',
      'https://w3id.org/vc/status-list/2021/v1',
    ],
    id: 'https://example.com/status-lists/test-status-list-1',
    type: ['VerifiableCredential', 'BitstringStatusListCredential'],
    issuer: 'https://example.com/issuers/test-issuer-1',
    validFrom: new Date().toISOString(),
    credentialSubject: {
      id: 'https://example.com/status-lists/test-status-list-1',
      type: 'BitstringStatusList',
      statusPurpose: 'revocation',
      encodedList:
        'H4sIAAAAAAAAA-3BMQEAAADCoPVPbQwfoAAAAAAAAAAAAAAAAAAAAIC3AYbSVKsAQAAA',
    },
  })),
  updateCredentialStatus: mock(async () => ({
    success: true,
    statusEntry: {
      id: 'test-status-entry-id',
      credentialId: 'test-credential-id',
      statusListId: 'test-status-list-1',
      statusListIndex: 12345,
      statusSize: 1,
      purpose: StatusPurpose.REVOCATION,
      currentStatus: 1,
      statusReason: 'Credential revoked for testing',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  })),
} as unknown as StatusListController;

describe('Credential Status Update API', () => {
  let app: Hono;
  const authToken = 'Bearer test-token';

  beforeEach(() => {
    app = new Hono();

    // Add mock authentication middleware that bypasses auth
    app.use('*', async (c, next) => {
      const authHeader = c.req.header('Authorization');
      if (!authHeader) {
        return c.json({ error: 'Unauthorized' }, 401);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (c as any).set('isAuthenticated', true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (c as any).set('user', { id: 'test-user', provider: 'test', claims: {} });
      await next();
    });

    // Create v3 router with mocked dependencies
    const v3Router = createVersionedRouter(
      BadgeVersion.V3,
      mockIssuerController,
      mockBadgeClassController,
      mockAssertionController,
      mockStatusListController
    );

    app.route('/v3', v3Router);
  });

  describe('POST /v3/credentials/:id/status - Comprehensive Status Updates', () => {
    it('should successfully revoke a credential', async () => {
      const response = await app.request(
        '/v3/credentials/test-credential-id/status',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: authToken,
          },
          body: JSON.stringify({
            status: 1,
            reason: 'Credential revoked due to policy violation',
            purpose: StatusPurpose.REVOCATION,
          }),
        }
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toMatchObject({
        success: true,
        statusEntry: {
          id: expect.any(String),
          credentialId: 'test-credential-id',
          statusListId: 'test-status-list-1',
          statusListIndex: 12345,
          statusSize: 1,
          purpose: StatusPurpose.REVOCATION,
          currentStatus: 1,
          statusReason: 'Credential revoked for testing',
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        },
      });
    });

    it('should successfully suspend a credential', async () => {
      const response = await app.request(
        '/v3/credentials/test-credential-id/status',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: authToken,
          },
          body: JSON.stringify({
            status: 1,
            reason: 'Credential suspended pending investigation',
            purpose: StatusPurpose.SUSPENSION,
          }),
        }
      );

      expect(response.status).toBe(200);

      const data = (await response.json()) as StatusUpdateResponseDto;
      expect(data.success).toBe(true);
      expect(data.statusEntry).toBeDefined();
    });

    it('should handle status restoration (status: 0)', async () => {
      const response = await app.request(
        '/v3/credentials/test-credential-id/status',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: authToken,
          },
          body: JSON.stringify({
            status: 0,
            reason: 'Credential status restored',
            purpose: StatusPurpose.REVOCATION,
          }),
        }
      );

      expect(response.status).toBe(200);

      const data = (await response.json()) as StatusUpdateResponseDto;
      expect(data.success).toBe(true);
    });

    it('should reject invalid status values', async () => {
      const response = await app.request(
        '/v3/credentials/test-credential-id/status',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: authToken,
          },
          body: JSON.stringify({
            status: -1, // Invalid negative status
            purpose: StatusPurpose.REVOCATION,
          }),
        }
      );

      expect(response.status).toBe(400);
      const data = (await response.json()) as ErrorResponse;
      expect(data.success).toBe(false);
      expect(data.error).toBe('Validation error');
    });

    it('should reject invalid purpose values', async () => {
      const response = await app.request(
        '/v3/credentials/test-credential-id/status',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: authToken,
          },
          body: JSON.stringify({
            status: 1,
            purpose: 'invalid-purpose',
          }),
        }
      );

      expect(response.status).toBe(400);
      const data = (await response.json()) as ErrorResponse;
      expect(data.success).toBe(false);
      expect(data.error).toBe('Validation error');
    });

    it('should require authentication', async () => {
      const response = await app.request(
        '/v3/credentials/test-credential-id/status',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: 1,
            purpose: StatusPurpose.REVOCATION,
          }),
        }
      );

      expect(response.status).toBe(401);
    });

    it('should require all mandatory fields', async () => {
      const response = await app.request(
        '/v3/credentials/test-credential-id/status',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: authToken,
          },
          body: JSON.stringify({
            status: 1,
            // Missing required 'purpose' field
          }),
        }
      );

      expect(response.status).toBe(400);
      const data = (await response.json()) as ErrorResponse;
      expect(data.success).toBe(false);
      expect(data.error).toBe('Validation error');
    });
  });

  describe('BitstringStatusListCredential Format Validation', () => {
    it('should return properly formatted BitstringStatusListCredential', async () => {
      const response = await app.request(
        '/v3/status-lists/test-status-list-1',
        {
          headers: {
            Authorization: authToken,
          },
        }
      );

      expect(response.status).toBe(200);

      const credential = (await response.json()) as BitstringStatusListCredentialResponseDto;

      // Validate BitstringStatusListCredential structure
      expect(credential).toMatchObject({
        '@context': expect.arrayContaining([
          'https://www.w3.org/2018/credentials/v1',
          'https://w3id.org/vc/status-list/2021/v1',
        ]),
        id: expect.stringMatching(/^https?:\/\/.+/),
        type: expect.arrayContaining([
          'VerifiableCredential',
          'BitstringStatusListCredential',
        ]),
        issuer: expect.stringMatching(/^https?:\/\/.+/),
        validFrom: expect.stringMatching(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
        ),
        credentialSubject: {
          id: expect.stringMatching(/^https?:\/\/.+/),
          type: 'BitstringStatusList',
          statusPurpose: 'revocation',
          encodedList: expect.any(String),
        },
      });

      // Validate that encodedList is a valid base64url string (if it's a real string)
      if (typeof credential.credentialSubject.encodedList === 'string') {
        expect(credential.credentialSubject.encodedList).toMatch(
          /^[A-Za-z0-9_-]+$/
        );
      }

      // Validate statusPurpose is a valid enum value
      expect(Object.values(StatusPurpose)).toContain(
        credential.credentialSubject.statusPurpose
      );
    });
  });
});
