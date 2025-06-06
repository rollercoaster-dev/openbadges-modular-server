/**
 * API tests for status list endpoints
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

// Mock controllers
const mockIssuerController = {
  createIssuer: mock(async () => ({ id: 'test-issuer-id' })),
  getIssuerById: mock(async () => ({ id: 'test-issuer-id' })),
} as unknown as IssuerController;

const mockBadgeClassController = {
  createBadgeClass: mock(async () => ({ id: 'test-achievement-id' })),
  getBadgeClassById: mock(async () => ({ id: 'test-achievement-id' })),
} as unknown as BadgeClassController;

const mockAssertionController = {
  createAssertion: mock(async () => ({ id: 'test-credential-id' })),
  getAssertionById: mock(async () => ({ id: 'test-credential-id' })),
} as unknown as AssertionController;

const mockStatusListController = {
  createStatusList: mock(async () => ({
    id: 'test-status-list-1',
    issuerId: 'test-issuer-1',
    purpose: StatusPurpose.REVOCATION,
    statusSize: 1,
    totalEntries: 100000,
    usedEntries: 0,
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
    usedEntries: 0,
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
    id: 'test-status-list-1',
    type: ['VerifiableCredential', 'BitstringStatusListCredential'],
    issuer: 'test-issuer-1',
    validFrom: new Date().toISOString(),
    credentialSubject: {
      id: 'test-status-list-1',
      type: 'BitstringStatusList',
      statusPurpose: StatusPurpose.REVOCATION,
      encodedList:
        'H4sIAAAAAAAAA-3BMQEAAADCoPVPbQwfoAAAAAAAAAAAAAAAAAAAAIC3AYbSVKsAQAAA',
    },
  })),
  findStatusLists: mock(async () => [
    {
      id: 'test-status-list-1',
      issuerId: 'test-issuer-1',
      purpose: StatusPurpose.REVOCATION,
      statusSize: 1,
      totalEntries: 100000,
      usedEntries: 10,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ]),
  getStatusListStats: mock(async () => ({
    totalEntries: 100000,
    usedEntries: 1500,
    availableEntries: 98500,
    utilizationPercent: 1.5,
  })),
  updateCredentialStatus: mock(async () => ({
    success: true,
    credentialId: 'test-credential-1',
    newStatus: 1,
    reason: 'Credential revoked for testing',
  })),
} as unknown as StatusListController;

describe('Status List API', () => {
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

  describe('POST /v3/status-lists', () => {
    it('should create a new status list', async () => {
      const response = await app.request('/v3/status-lists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authToken,
        },
        body: JSON.stringify({
          issuerId: 'test-issuer-1',
          purpose: StatusPurpose.REVOCATION,
          statusSize: 1,
          totalEntries: 100000,
        }),
      });

      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data).toMatchObject({
        id: 'test-status-list-1',
        issuerId: 'test-issuer-1',
        purpose: StatusPurpose.REVOCATION,
        statusSize: 1,
        totalEntries: 100000,
        usedEntries: 0,
        encodedList: expect.any(String),
      });
    });

    it('should require authentication', async () => {
      const response = await app.request('/v3/status-lists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          issuerId: 'test-issuer-1',
          purpose: StatusPurpose.REVOCATION,
        }),
      });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /v3/status-lists/:id', () => {
    it('should return status list credential format', async () => {
      const response = await app.request(
        '/v3/status-lists/test-status-list-1',
        {
          headers: {
            Authorization: authToken,
          },
        }
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toMatchObject({
        '@context': expect.arrayContaining([
          'https://www.w3.org/2018/credentials/v1',
          'https://w3id.org/vc/status-list/2021/v1',
        ]),
        id: 'test-status-list-1',
        type: expect.arrayContaining([
          'VerifiableCredential',
          'BitstringStatusListCredential',
        ]),
        issuer: 'test-issuer-1',
        validFrom: expect.any(String),
        credentialSubject: {
          id: 'test-status-list-1',
          type: 'BitstringStatusList',
          statusPurpose: StatusPurpose.REVOCATION,
          encodedList: expect.any(String),
        },
      });
    });
  });
});
