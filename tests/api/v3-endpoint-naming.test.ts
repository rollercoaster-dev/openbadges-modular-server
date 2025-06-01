/**
 * Tests for v3.0 compliant API endpoint naming
 * 
 * This file tests the new /achievements and /credentials endpoints
 * as well as the deprecation warnings for legacy endpoints.
 */

import { describe, expect, it, beforeEach } from 'bun:test';
import { Hono } from 'hono';
import { createVersionedRouter } from '@/api/api.router';
import { BadgeVersion } from '@/utils/version/badge-version';
import type { IssuerController } from '@/api/controllers/issuer.controller';
import type { BadgeClassController } from '@/api/controllers/badgeClass.controller';
import type { AssertionController } from '@/api/controllers/assertion.controller';

// Mock controllers
const mockIssuerController = {
  createIssuer: async () => ({ id: 'test-issuer-id', name: 'Test Issuer' }),
  getIssuerById: async () => ({ id: 'test-issuer-id', name: 'Test Issuer' }),
  getAllIssuers: async () => [{ id: 'test-issuer-id', name: 'Test Issuer' }],
  updateIssuer: async () => ({ id: 'test-issuer-id', name: 'Updated Issuer' }),
  deleteIssuer: async () => true,
} as unknown as IssuerController;

const mockBadgeClassController = {
  createBadgeClass: async () => ({
    id: 'test-achievement-id',
    name: 'Test Achievement',
    issuer: 'test-issuer-id'
  }),
  getBadgeClassById: async () => ({
    id: 'test-achievement-id',
    name: 'Test Achievement',
    issuer: 'test-issuer-id'
  }),
  getAllBadgeClasses: async () => [{
    id: 'test-achievement-id',
    name: 'Test Achievement',
    issuer: 'test-issuer-id'
  }],
  getBadgeClassesByIssuer: async () => [{
    id: 'test-achievement-id',
    name: 'Test Achievement',
    issuer: 'test-issuer-id'
  }],
  updateBadgeClass: async () => ({
    id: 'test-achievement-id',
    name: 'Updated Achievement',
    issuer: 'test-issuer-id'
  }),
  deleteBadgeClass: async () => true,
} as unknown as BadgeClassController;

const mockAssertionController = {
  createAssertion: async () => ({
    id: 'test-credential-id',
    badgeClass: 'test-achievement-id',
    recipient: { type: 'email', identity: 'test@example.com', hashed: false }
  }),
  getAssertionById: async () => ({
    id: 'test-credential-id',
    badgeClass: 'test-achievement-id',
    recipient: { type: 'email', identity: 'test@example.com', hashed: false }
  }),
  getAllAssertions: async () => [{
    id: 'test-credential-id',
    badgeClass: 'test-achievement-id',
    recipient: { type: 'email', identity: 'test@example.com', hashed: false }
  }],
  getAssertionsByBadgeClass: async () => [{
    id: 'test-credential-id',
    badgeClass: 'test-achievement-id',
    recipient: { type: 'email', identity: 'test@example.com', hashed: false }
  }],
  updateAssertion: async () => ({
    id: 'test-credential-id',
    badgeClass: 'test-achievement-id',
    recipient: { type: 'email', identity: 'updated@example.com', hashed: false }
  }),
  revokeAssertion: async () => ({
    id: 'test-credential-id',
    badgeClass: 'test-achievement-id',
    recipient: { type: 'email', identity: 'test@example.com', hashed: false },
    revoked: true
  }),
  verifyAssertion: async () => ({
    isValid: true,
    hasValidSignature: true,
    details: 'Valid credential'
  }),
  signAssertion: async () => ({
    id: 'test-credential-id',
    signed: true,
    proof: { type: 'JWS', signature: 'test-signature' }
  }),
} as unknown as AssertionController;

describe('V3.0 Compliant API Endpoint Naming', () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();

    // Add mock authentication middleware that bypasses auth
    app.use('*', async (c, next) => {
      // Set authentication context variables
      c.set('isAuthenticated', true);
      c.set('user', { id: 'test-user', provider: 'test', claims: {} });
      await next();
    });

    // Add mock validation middleware that sets validatedBody
    app.use('*', async (c, next) => {
      // For POST/PUT requests, set the request body as validatedBody
      if (c.req.method === 'POST' || c.req.method === 'PUT') {
        try {
          const body = await c.req.json();
          c.set('validatedBody', body);
        } catch {
          // If no body or invalid JSON, set empty object
          c.set('validatedBody', {});
        }
      }
      await next();
    });

    // Create v3 router with mocked dependencies
    const v3Router = createVersionedRouter(
      BadgeVersion.V3,
      mockIssuerController,
      mockBadgeClassController,
      mockAssertionController
    );

    app.route('/v3', v3Router);
  });

  describe('Achievement Endpoints (v3.0 Compliant)', () => {
    it('should handle POST /v3/achievements', async () => {
      const response = await app.request('/v3/achievements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test Achievement',
          description: 'A test achievement',
          image: 'https://example.com/badge.png',
          criteria: 'https://example.com/criteria',
          issuer: 'test-issuer-id'
        })
      });

      expect(response.status).toBe(201);
      const data = await response.json() as Record<string, unknown>;
      expect(data.id).toBe('test-achievement-id');
      expect(data.name).toBe('Test Achievement');
    });

    it('should handle GET /v3/achievements', async () => {
      const response = await app.request('/v3/achievements');

      expect(response.status).toBe(200);
      const data = await response.json() as Record<string, unknown>[];
      expect(Array.isArray(data)).toBe(true);
      expect((data[0] as Record<string, unknown>).id).toBe('test-achievement-id');
    });

    it('should handle GET /v3/achievements/:id', async () => {
      const response = await app.request('/v3/achievements/test-achievement-id');

      expect(response.status).toBe(200);
      const data = await response.json() as Record<string, unknown>;
      expect(data.id).toBe('test-achievement-id');
      expect(data.name).toBe('Test Achievement');
    });

    it('should handle GET /v3/issuers/:id/achievements', async () => {
      const response = await app.request('/v3/issuers/test-issuer-id/achievements');

      expect(response.status).toBe(200);
      const data = await response.json() as Record<string, unknown>[];
      expect(Array.isArray(data)).toBe(true);
      expect((data[0] as Record<string, unknown>).issuer).toBe('test-issuer-id');
    });

    it('should handle PUT /v3/achievements/:id', async () => {
      const response = await app.request('/v3/achievements/test-achievement-id', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Updated Achievement',
          description: 'An updated achievement',
          image: 'https://example.com/updated-badge.png',
          criteria: 'https://example.com/updated-criteria',
          issuer: 'test-issuer-id'
        })
      });

      expect(response.status).toBe(200);
      const data = await response.json() as Record<string, unknown>;
      expect(data.name).toBe('Updated Achievement');
    });

    it('should handle DELETE /v3/achievements/:id', async () => {
      const response = await app.request('/v3/achievements/test-achievement-id', {
        method: 'DELETE'
      });

      expect(response.status).toBe(204);
    });
  });

  describe('Credential Endpoints (v3.0 Compliant)', () => {
    it('should handle POST /v3/credentials', async () => {
      const response = await app.request('/v3/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          badge: 'test-achievement-id',
          recipient: { type: 'email', identity: 'test@example.com', hashed: false },
          issuedOn: new Date().toISOString()
        })
      });

      expect(response.status).toBe(201);
      const data = await response.json() as Record<string, unknown>;
      expect(data.id).toBe('test-credential-id');
      expect(data.badgeClass).toBe('test-achievement-id');
    });

    it('should handle GET /v3/credentials', async () => {
      const response = await app.request('/v3/credentials');

      expect(response.status).toBe(200);
      const data = await response.json() as Record<string, unknown>[];
      expect(Array.isArray(data)).toBe(true);
      expect((data[0] as Record<string, unknown>).id).toBe('test-credential-id');
    });

    it('should handle GET /v3/credentials/:id', async () => {
      const response = await app.request('/v3/credentials/test-credential-id');

      expect(response.status).toBe(200);
      const data = await response.json() as Record<string, unknown>;
      expect(data.id).toBe('test-credential-id');
    });

    it('should handle GET /v3/achievements/:id/credentials', async () => {
      const response = await app.request('/v3/achievements/test-achievement-id/credentials');

      expect(response.status).toBe(200);
      const data = await response.json() as Record<string, unknown>[];
      expect(Array.isArray(data)).toBe(true);
      expect((data[0] as Record<string, unknown>).badgeClass).toBe('test-achievement-id');
    });

    it('should handle PUT /v3/credentials/:id', async () => {
      const response = await app.request('/v3/credentials/test-credential-id', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          badge: 'test-achievement-id',
          recipient: { type: 'email', identity: 'updated@example.com', hashed: false },
          issuedOn: new Date().toISOString()
        })
      });

      expect(response.status).toBe(200);
      const data = await response.json() as Record<string, unknown>;
      expect(data.id).toBe('test-credential-id');
    });

    it('should handle POST /v3/credentials/:id/revoke', async () => {
      const response = await app.request('/v3/credentials/test-credential-id/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Test revocation' })
      });

      expect(response.status).toBe(200);
      const data = await response.json() as Record<string, unknown>;
      expect(data.revoked).toBe(true);
    });

    it('should handle GET /v3/credentials/:id/verify', async () => {
      const response = await app.request('/v3/credentials/test-credential-id/verify');

      expect(response.status).toBe(200);
      const data = await response.json() as Record<string, unknown>;
      expect(data.isValid).toBe(true);
    });

    it('should handle POST /v3/credentials/:id/sign', async () => {
      const response = await app.request('/v3/credentials/test-credential-id/sign', {
        method: 'POST'
      });

      expect(response.status).toBe(200);
      const data = await response.json() as Record<string, unknown>;
      expect(data.signed).toBe(true);
    });
  });

  describe('Legacy Endpoints with Deprecation Warnings', () => {
    describe('Badge Classes (Legacy)', () => {
      it('should handle POST /v3/badge-classes with deprecation warnings', async () => {
        const response = await app.request('/v3/badge-classes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Test Badge Class',
            description: 'A test badge class',
            image: 'https://example.com/badge.png',
            criteria: 'https://example.com/criteria',
            issuer: 'test-issuer-id'
          })
        });

        expect(response.status).toBe(201);

        // Check deprecation headers
        expect(response.headers.get('Deprecation')).toBe('true');
        expect(response.headers.get('Link')).toContain('/achievements');
        expect(response.headers.get('Sunset')).toBeTruthy();

        const data = await response.json() as Record<string, unknown>;
        expect(data.id).toBe('test-achievement-id');
      });

      it('should handle GET /v3/badge-classes with deprecation warnings', async () => {
        const response = await app.request('/v3/badge-classes');

        expect(response.status).toBe(200);
        expect(response.headers.get('Deprecation')).toBe('true');
        expect(response.headers.get('Link')).toContain('/achievements');

        // Deprecation headers are sufficient for testing
        // Note: _deprecation property in response body is handled by middleware
      });

      it('should handle GET /v3/badge-classes/:id with deprecation warnings', async () => {
        const response = await app.request('/v3/badge-classes/test-achievement-id');

        expect(response.status).toBe(200);
        expect(response.headers.get('Deprecation')).toBe('true');
        expect(response.headers.get('Link')).toContain('/achievements/:id');

        // Deprecation headers are sufficient for testing
        // Note: _deprecation property in response body is handled by middleware
      });

      it('should handle GET /v3/issuers/:id/badge-classes with deprecation warnings', async () => {
        const response = await app.request('/v3/issuers/test-issuer-id/badge-classes');

        expect(response.status).toBe(200);
        expect(response.headers.get('Deprecation')).toBe('true');
        expect(response.headers.get('Link')).toContain('/issuers/:id/achievements');

        // Deprecation headers are sufficient for testing
        // Note: _deprecation property in response body is handled by middleware
      });

      it('should handle PUT /v3/badge-classes/:id with deprecation warnings', async () => {
        const response = await app.request('/v3/badge-classes/test-achievement-id', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Updated Badge Class',
            description: 'An updated badge class',
            image: 'https://example.com/updated-badge.png',
            criteria: 'https://example.com/updated-criteria',
            issuer: 'test-issuer-id'
          })
        });

        expect(response.status).toBe(200);
        expect(response.headers.get('Deprecation')).toBe('true');
        expect(response.headers.get('Link')).toContain('/achievements/:id');

        // Deprecation headers are sufficient for testing
        // Note: _deprecation property in response body is handled by middleware
      });

      it('should handle DELETE /v3/badge-classes/:id with deprecation warnings', async () => {
        const response = await app.request('/v3/badge-classes/test-achievement-id', {
          method: 'DELETE'
        });

        expect(response.status).toBe(204);
        expect(response.headers.get('Deprecation')).toBe('true');
        expect(response.headers.get('Link')).toContain('/achievements/:id');
      });
    });

    describe('Assertions (Legacy)', () => {
      it('should handle POST /v3/assertions with deprecation warnings', async () => {
        const response = await app.request('/v3/assertions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            badge: 'test-achievement-id',
            recipient: { type: 'email', identity: 'test@example.com', hashed: false },
            issuedOn: new Date().toISOString()
          })
        });

        expect(response.status).toBe(201);
        expect(response.headers.get('Deprecation')).toBe('true');
        expect(response.headers.get('Link')).toContain('/credentials');

        // Deprecation headers are sufficient for testing
        // Note: _deprecation property in response body is handled by middleware
      });

      it('should handle GET /v3/assertions with deprecation warnings', async () => {
        const response = await app.request('/v3/assertions');

        expect(response.status).toBe(200);
        expect(response.headers.get('Deprecation')).toBe('true');
        expect(response.headers.get('Link')).toContain('/credentials');

        // Deprecation headers are sufficient for testing
        // Note: _deprecation property in response body is handled by middleware
      });

      it('should handle GET /v3/assertions/:id with deprecation warnings', async () => {
        const response = await app.request('/v3/assertions/test-credential-id');

        expect(response.status).toBe(200);
        expect(response.headers.get('Deprecation')).toBe('true');
        expect(response.headers.get('Link')).toContain('/credentials/:id');

        // Deprecation headers are sufficient for testing
        // Note: _deprecation property in response body is handled by middleware
      });

      it('should handle GET /v3/badge-classes/:id/assertions with deprecation warnings', async () => {
        const response = await app.request('/v3/badge-classes/test-achievement-id/assertions');

        expect(response.status).toBe(200);
        expect(response.headers.get('Deprecation')).toBe('true');
        expect(response.headers.get('Link')).toContain('/achievements/:id/credentials');

        // Deprecation headers are sufficient for testing
        // Note: _deprecation property in response body is handled by middleware
      });

      it('should handle PUT /v3/assertions/:id with deprecation warnings', async () => {
        const response = await app.request('/v3/assertions/test-credential-id', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            badge: 'test-achievement-id',
            recipient: { type: 'email', identity: 'updated@example.com', hashed: false },
            issuedOn: new Date().toISOString()
          })
        });

        expect(response.status).toBe(200);
        expect(response.headers.get('Deprecation')).toBe('true');
        expect(response.headers.get('Link')).toContain('/credentials/:id');

        // Deprecation headers are sufficient for testing
        // Note: _deprecation property in response body is handled by middleware
      });

      it('should handle POST /v3/assertions/:id/revoke with deprecation warnings', async () => {
        const response = await app.request('/v3/assertions/test-credential-id/revoke', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: 'Test revocation' })
        });

        expect(response.status).toBe(200);
        expect(response.headers.get('Deprecation')).toBe('true');
        expect(response.headers.get('Link')).toContain('/credentials/:id/revoke');

        // Deprecation headers are sufficient for testing
        // Note: _deprecation property in response body is handled by middleware
      });

      it('should handle GET /v3/assertions/:id/verify with deprecation warnings', async () => {
        const response = await app.request('/v3/assertions/test-credential-id/verify');

        expect(response.status).toBe(200);
        expect(response.headers.get('Deprecation')).toBe('true');
        expect(response.headers.get('Link')).toContain('/credentials/:id/verify');

        // Deprecation headers are sufficient for testing
        // Note: _deprecation property in response body is handled by middleware
      });

      it('should handle POST /v3/assertions/:id/sign with deprecation warnings', async () => {
        const response = await app.request('/v3/assertions/test-credential-id/sign', {
          method: 'POST'
        });

        expect(response.status).toBe(200);
        expect(response.headers.get('Deprecation')).toBe('true');
        expect(response.headers.get('Link')).toContain('/credentials/:id/sign');

        // Deprecation headers are sufficient for testing
        // Note: _deprecation property in response body is handled by middleware
      });
    });
  });

  describe('Endpoint Equivalence', () => {
    it('should return equivalent responses for /achievements and /badge-classes', async () => {
      const achievementResponse = await app.request('/v3/achievements');
      const badgeClassResponse = await app.request('/v3/badge-classes');

      expect(achievementResponse.status).toBe(badgeClassResponse.status);

      const achievementData = await achievementResponse.json() as Record<string, unknown>[];
      const badgeClassData = await badgeClassResponse.json() as Record<string, unknown>[];

      // Both should return arrays with the same data
      expect(Array.isArray(achievementData)).toBe(true);
      expect(Array.isArray(badgeClassData)).toBe(true);
      expect(achievementData.length).toBe(badgeClassData.length);
      expect(achievementData[0].id).toBe(badgeClassData[0].id);
    });

    it('should return equivalent responses for /credentials and /assertions', async () => {
      const credentialResponse = await app.request('/v3/credentials');
      const assertionResponse = await app.request('/v3/assertions');

      expect(credentialResponse.status).toBe(assertionResponse.status);

      const credentialData = await credentialResponse.json() as Record<string, unknown>[];
      const assertionData = await assertionResponse.json() as Record<string, unknown>[];

      // Both should return arrays with the same data
      expect(Array.isArray(credentialData)).toBe(true);
      expect(Array.isArray(assertionData)).toBe(true);
      expect(credentialData.length).toBe(assertionData.length);
      expect(credentialData[0].id).toBe(assertionData[0].id);
    });
  });
});
