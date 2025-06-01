/**
 * Tests for v3.0 compliant API endpoint naming
 * 
 * This file tests the new /achievements and /credentials endpoints
 * as well as the deprecation warnings for legacy endpoints.
 */

import { describe, expect, it, beforeEach } from 'bun:test';
import { Hono } from 'hono';
import type { Context } from 'hono';
import { createVersionedRouter } from '@/api/api.router';
import { BadgeVersion } from '@/utils/version/badge-version';

// Mock controllers
const mockIssuerController = {
  createIssuer: async () => ({ id: 'test-issuer-id', name: 'Test Issuer' }),
  getIssuerById: async () => ({ id: 'test-issuer-id', name: 'Test Issuer' }),
  getAllIssuers: async () => [{ id: 'test-issuer-id', name: 'Test Issuer' }],
  updateIssuer: async () => ({ id: 'test-issuer-id', name: 'Updated Issuer' }),
  deleteIssuer: async () => true,
};

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
};

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
    recipient: { type: 'email', identity: 'test@example.com', hashed: false }
  }),
  revokeAssertion: async () => ({ revoked: true, reason: 'Test revocation' }),
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
};

// Mock auth middleware
const mockRequireAuth = () => async (c: Context, next: () => Promise<void>) => {
  c.set('user', { id: 'test-user' });
  await next();
};

// Mock validation middleware
const mockValidateBadgeClassMiddleware = () => async (c: Context, next: () => Promise<void>) => {
  c.set('validatedBody', await c.req.json());
  await next();
};

const mockValidateAssertionMiddleware = () => async (c: Context, next: () => Promise<void>) => {
  c.set('validatedBody', await c.req.json());
  await next();
};

describe('V3.0 Compliant API Endpoint Naming', () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    
    // Create v3 router with mocked dependencies
    const v3Router = createVersionedRouter(
      BadgeVersion.V3,
      mockIssuerController as any,
      mockBadgeClassController as any,
      mockAssertionController as any,
      mockRequireAuth as any,
      mockValidateBadgeClassMiddleware as any,
      mockValidateAssertionMiddleware as any
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
          issuer: 'test-issuer-id'
        })
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.id).toBe('test-achievement-id');
      expect(data.name).toBe('Test Achievement');
    });

    it('should handle GET /v3/achievements', async () => {
      const response = await app.request('/v3/achievements');
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data[0].id).toBe('test-achievement-id');
    });

    it('should handle GET /v3/achievements/:id', async () => {
      const response = await app.request('/v3/achievements/test-achievement-id');
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.id).toBe('test-achievement-id');
      expect(data.name).toBe('Test Achievement');
    });

    it('should handle GET /v3/issuers/:id/achievements', async () => {
      const response = await app.request('/v3/issuers/test-issuer-id/achievements');
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data[0].issuer).toBe('test-issuer-id');
    });

    it('should handle PUT /v3/achievements/:id', async () => {
      const response = await app.request('/v3/achievements/test-achievement-id', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Updated Achievement',
          description: 'An updated achievement'
        })
      });

      expect(response.status).toBe(200);
      const data = await response.json();
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
          recipient: { type: 'email', identity: 'test@example.com', hashed: false }
        })
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.id).toBe('test-credential-id');
      expect(data.badgeClass).toBe('test-achievement-id');
    });

    it('should handle GET /v3/credentials', async () => {
      const response = await app.request('/v3/credentials');
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data[0].id).toBe('test-credential-id');
    });

    it('should handle GET /v3/credentials/:id', async () => {
      const response = await app.request('/v3/credentials/test-credential-id');
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.id).toBe('test-credential-id');
    });

    it('should handle GET /v3/achievements/:id/credentials', async () => {
      const response = await app.request('/v3/achievements/test-achievement-id/credentials');
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data[0].badgeClass).toBe('test-achievement-id');
    });

    it('should handle PUT /v3/credentials/:id', async () => {
      const response = await app.request('/v3/credentials/test-credential-id', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: { type: 'email', identity: 'updated@example.com', hashed: false }
        })
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.id).toBe('test-credential-id');
    });

    it('should handle POST /v3/credentials/:id/revoke', async () => {
      const response = await app.request('/v3/credentials/test-credential-id/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Test revocation' })
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.revoked).toBe(true);
    });

    it('should handle GET /v3/credentials/:id/verify', async () => {
      const response = await app.request('/v3/credentials/test-credential-id/verify');
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.isValid).toBe(true);
    });

    it('should handle POST /v3/credentials/:id/sign', async () => {
      const response = await app.request('/v3/credentials/test-credential-id/sign', {
        method: 'POST'
      });

      expect(response.status).toBe(200);
      const data = await response.json();
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
            issuer: 'test-issuer-id'
          })
        });

        expect(response.status).toBe(201);

        // Check deprecation headers
        expect(response.headers.get('Deprecation')).toBe('true');
        expect(response.headers.get('Link')).toContain('/achievements');
        expect(response.headers.get('Sunset')).toBeTruthy();

        const data = await response.json();
        expect(data.id).toBe('test-achievement-id');

        // Check deprecation warning in response body
        expect(data._deprecation).toBeDefined();
        expect(data._deprecation.warning).toContain('deprecated');
        expect(data._deprecation.successor).toBe('/achievements');
      });

      it('should handle GET /v3/badge-classes with deprecation warnings', async () => {
        const response = await app.request('/v3/badge-classes');

        expect(response.status).toBe(200);
        expect(response.headers.get('Deprecation')).toBe('true');
        expect(response.headers.get('Link')).toContain('/achievements');

        const data = await response.json();
        expect(data._deprecation).toBeDefined();
        expect(data._deprecation.successor).toBe('/achievements');
      });

      it('should handle GET /v3/badge-classes/:id with deprecation warnings', async () => {
        const response = await app.request('/v3/badge-classes/test-achievement-id');

        expect(response.status).toBe(200);
        expect(response.headers.get('Deprecation')).toBe('true');
        expect(response.headers.get('Link')).toContain('/achievements/:id');

        const data = await response.json();
        expect(data._deprecation).toBeDefined();
        expect(data._deprecation.successor).toBe('/achievements/:id');
      });

      it('should handle GET /v3/issuers/:id/badge-classes with deprecation warnings', async () => {
        const response = await app.request('/v3/issuers/test-issuer-id/badge-classes');

        expect(response.status).toBe(200);
        expect(response.headers.get('Deprecation')).toBe('true');
        expect(response.headers.get('Link')).toContain('/issuers/:id/achievements');

        const data = await response.json();
        expect(data._deprecation).toBeDefined();
        expect(data._deprecation.successor).toBe('/issuers/:id/achievements');
      });

      it('should handle PUT /v3/badge-classes/:id with deprecation warnings', async () => {
        const response = await app.request('/v3/badge-classes/test-achievement-id', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Updated Badge Class'
          })
        });

        expect(response.status).toBe(200);
        expect(response.headers.get('Deprecation')).toBe('true');
        expect(response.headers.get('Link')).toContain('/achievements/:id');

        const data = await response.json();
        expect(data._deprecation).toBeDefined();
        expect(data._deprecation.successor).toBe('/achievements/:id');
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
            recipient: { type: 'email', identity: 'test@example.com', hashed: false }
          })
        });

        expect(response.status).toBe(201);
        expect(response.headers.get('Deprecation')).toBe('true');
        expect(response.headers.get('Link')).toContain('/credentials');

        const data = await response.json();
        expect(data._deprecation).toBeDefined();
        expect(data._deprecation.successor).toBe('/credentials');
      });

      it('should handle GET /v3/assertions with deprecation warnings', async () => {
        const response = await app.request('/v3/assertions');

        expect(response.status).toBe(200);
        expect(response.headers.get('Deprecation')).toBe('true');
        expect(response.headers.get('Link')).toContain('/credentials');

        const data = await response.json();
        expect(data._deprecation).toBeDefined();
        expect(data._deprecation.successor).toBe('/credentials');
      });

      it('should handle GET /v3/assertions/:id with deprecation warnings', async () => {
        const response = await app.request('/v3/assertions/test-credential-id');

        expect(response.status).toBe(200);
        expect(response.headers.get('Deprecation')).toBe('true');
        expect(response.headers.get('Link')).toContain('/credentials/:id');

        const data = await response.json();
        expect(data._deprecation).toBeDefined();
        expect(data._deprecation.successor).toBe('/credentials/:id');
      });

      it('should handle GET /v3/badge-classes/:id/assertions with deprecation warnings', async () => {
        const response = await app.request('/v3/badge-classes/test-achievement-id/assertions');

        expect(response.status).toBe(200);
        expect(response.headers.get('Deprecation')).toBe('true');
        expect(response.headers.get('Link')).toContain('/achievements/:id/credentials');

        const data = await response.json();
        expect(data._deprecation).toBeDefined();
        expect(data._deprecation.successor).toBe('/achievements/:id/credentials');
      });

      it('should handle PUT /v3/assertions/:id with deprecation warnings', async () => {
        const response = await app.request('/v3/assertions/test-credential-id', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipient: { type: 'email', identity: 'updated@example.com', hashed: false }
          })
        });

        expect(response.status).toBe(200);
        expect(response.headers.get('Deprecation')).toBe('true');
        expect(response.headers.get('Link')).toContain('/credentials/:id');

        const data = await response.json();
        expect(data._deprecation).toBeDefined();
        expect(data._deprecation.successor).toBe('/credentials/:id');
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

        const data = await response.json();
        expect(data._deprecation).toBeDefined();
        expect(data._deprecation.successor).toBe('/credentials/:id/revoke');
      });

      it('should handle GET /v3/assertions/:id/verify with deprecation warnings', async () => {
        const response = await app.request('/v3/assertions/test-credential-id/verify');

        expect(response.status).toBe(200);
        expect(response.headers.get('Deprecation')).toBe('true');
        expect(response.headers.get('Link')).toContain('/credentials/:id/verify');

        const data = await response.json();
        expect(data._deprecation).toBeDefined();
        expect(data._deprecation.successor).toBe('/credentials/:id/verify');
      });

      it('should handle POST /v3/assertions/:id/sign with deprecation warnings', async () => {
        const response = await app.request('/v3/assertions/test-credential-id/sign', {
          method: 'POST'
        });

        expect(response.status).toBe(200);
        expect(response.headers.get('Deprecation')).toBe('true');
        expect(response.headers.get('Link')).toContain('/credentials/:id/sign');

        const data = await response.json();
        expect(data._deprecation).toBeDefined();
        expect(data._deprecation.successor).toBe('/credentials/:id/sign');
      });
    });
  });

  describe('Endpoint Equivalence', () => {
    it('should return equivalent responses for /achievements and /badge-classes', async () => {
      const achievementResponse = await app.request('/v3/achievements');
      const badgeClassResponse = await app.request('/v3/badge-classes');

      expect(achievementResponse.status).toBe(badgeClassResponse.status);

      const achievementData = await achievementResponse.json();
      const badgeClassData = await badgeClassResponse.json();

      // Remove deprecation warning from legacy response for comparison
      const { _deprecation: _, ...normalizedBadgeClassData } = badgeClassData;

      expect(achievementData).toEqual(normalizedBadgeClassData);
    });

    it('should return equivalent responses for /credentials and /assertions', async () => {
      const credentialResponse = await app.request('/v3/credentials');
      const assertionResponse = await app.request('/v3/assertions');

      expect(credentialResponse.status).toBe(assertionResponse.status);

      const credentialData = await credentialResponse.json();
      const assertionData = await assertionResponse.json();

      // Remove deprecation warning from legacy response for comparison
      const { _deprecation: __, ...normalizedAssertionData } = assertionData;

      expect(credentialData).toEqual(normalizedAssertionData);
    });
  });
});
