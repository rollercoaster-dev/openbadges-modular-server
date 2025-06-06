/**
 * Test to verify the fix for inconsistent middleware usage in credential status endpoint
 * 
 * This test ensures that the POST /credentials/:id/status endpoint uses the correct
 * validation middleware for single credential status updates, not batch operations.
 */

import { describe, expect, it, beforeEach } from 'bun:test';
import { Hono } from 'hono';
import { createVersionedRouter } from '@/api/api.router';
import { BadgeVersion } from '@/utils/version/badge-version';
import type { IssuerController } from '@/api/controllers/issuer.controller';
import type { BadgeClassController } from '@/api/controllers/badgeClass.controller';
import type { AssertionController } from '@/api/controllers/assertion.controller';
import type { StatusListController } from '@/api/controllers/status-list.controller';

// Mock controllers
const mockIssuerController = {
  createIssuer: async () => ({ id: 'test-issuer-id' }),
  getIssuerById: async () => ({ id: 'test-issuer-id' }),
} as unknown as IssuerController;

const mockBadgeClassController = {
  createBadgeClass: async () => ({ id: 'test-achievement-id' }),
  getBadgeClassById: async () => ({ id: 'test-achievement-id' }),
} as unknown as BadgeClassController;

const mockAssertionController = {
  createAssertion: async () => ({ id: 'test-credential-id' }),
  getAssertionById: async () => ({ id: 'test-credential-id' }),
} as unknown as AssertionController;

const mockStatusListController = {
  createStatusList: async () => ({ id: 'test-status-list-id' }),
  getStatusList: async () => ({ id: 'test-status-list-id' }),
  updateCredentialStatus: async () => ({ 
    success: true,
    statusEntry: {
      id: 'test-status-entry-id',
      credentialId: 'test-credential-id',
      currentStatus: 1,
    }
  }),
} as unknown as StatusListController;

describe('Credential Status Middleware Fix', () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();

    // Add mock authentication middleware that bypasses auth
    app.use('*', async (c, next) => {
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

  describe('POST /v3/credentials/:id/status', () => {
    it('should accept valid single credential status update data', async () => {
      const validStatusUpdate = {
        status: 1,
        reason: 'Test revocation',
        purpose: 'revocation',
      };

      const response = await app.request('/v3/credentials/test-credential-id/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validStatusUpdate),
      });

      expect(response.status).toBe(200);
      const data = await response.json() as Record<string, unknown>;
      expect(data.success).toBe(true);
    });

    it('should reject invalid status update data (negative status)', async () => {
      const invalidStatusUpdate = {
        status: -1, // Invalid negative status
        purpose: 'revocation',
      };

      const response = await app.request('/v3/credentials/test-credential-id/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidStatusUpdate),
      });

      expect(response.status).toBe(400);
      const data = await response.json() as Record<string, unknown>;
      expect(data.success).toBe(false);
      expect(data.error).toBe('Validation error');
    });

    it('should reject invalid purpose', async () => {
      const invalidStatusUpdate = {
        status: 1,
        purpose: 'invalid-purpose', // Invalid purpose
      };

      const response = await app.request('/v3/credentials/test-credential-id/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidStatusUpdate),
      });

      expect(response.status).toBe(400);
      const data = await response.json() as Record<string, unknown>;
      expect(data.success).toBe(false);
      expect(data.error).toBe('Validation error');
    });

    it('should reject batch update format (this was the bug)', async () => {
      // This is the format that would be valid for batch operations
      // but should be rejected for single credential status updates
      const batchFormatData = {
        updates: [
          {
            id: 'test-credential-id',
            status: 'revoked',
            reason: 'Test revocation',
            purpose: 'revocation',
          }
        ]
      };

      const response = await app.request('/v3/credentials/test-credential-id/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batchFormatData),
      });

      expect(response.status).toBe(400);
      const data = await response.json() as Record<string, unknown>;
      expect(data.success).toBe(false);
      expect(data.error).toBe('Validation error');
    });

    it('should require all mandatory fields', async () => {
      const incompleteData = {
        status: 1,
        // Missing required 'purpose' field
      };

      const response = await app.request('/v3/credentials/test-credential-id/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(incompleteData),
      });

      expect(response.status).toBe(400);
      const data = await response.json() as Record<string, unknown>;
      expect(data.success).toBe(false);
      expect(data.error).toBe('Validation error');
    });
  });
});
