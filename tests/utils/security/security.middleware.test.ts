/**
 * Tests for security middleware
 *
 * This file contains tests for the security middleware to ensure
 * it correctly applies rate limiting and security headers.
 */

import { describe, test, expect, beforeEach, afterEach, spyOn } from 'bun:test';
import { Hono } from 'hono';
import { createSecurityMiddleware } from '@/utils/security/security.middleware';
import * as rateLimitModule from '@/utils/security/middleware/rate-limit.middleware';
import * as securityHeadersModule from '@/utils/security/middleware/security-headers.middleware';

describe('Security Middleware', () => {
  let app: Hono;
  let rateLimitSpy: ReturnType<typeof spyOn>;
  let securityHeadersSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    // Create mock middleware functions
    const mockRateLimitMiddleware = async (c: any, next: any) => {
      c.header('X-Rate-Limit-Test', 'true');
      await next();
    };

    const mockSecurityHeadersMiddleware = async (c: any, next: any) => {
      c.header('X-Security-Headers-Test', 'true');
      await next();
    };

    // Spy on the middleware creation functions
    rateLimitSpy = spyOn(rateLimitModule, 'createRateLimitMiddleware');
    rateLimitSpy.mockImplementation(() => mockRateLimitMiddleware);

    securityHeadersSpy = spyOn(securityHeadersModule, 'createSecurityHeadersMiddleware');
    securityHeadersSpy.mockImplementation(() => mockSecurityHeadersMiddleware);

    // Create a test app with the security middleware
    app = new Hono();
    app.use('*', createSecurityMiddleware());
    app.get('/', (c) => c.text('Hello World'));
  });

  afterEach(() => {
    // Restore original spies
    rateLimitSpy.mockRestore();
    securityHeadersSpy.mockRestore();
  });

  test('should apply rate limiting middleware', async () => {
    const res = await app.request('/');
    expect(res.headers.get('X-Rate-Limit-Test')).toBe('true');
    expect(rateLimitSpy).toHaveBeenCalled();
  });

  test('should apply security headers middleware', async () => {
    const res = await app.request('/');
    expect(res.headers.get('X-Security-Headers-Test')).toBe('true');
    expect(securityHeadersSpy).toHaveBeenCalled();
  });

  test('should return the expected response', async () => {
    const res = await app.request('/');
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('Hello World');
  });
});
