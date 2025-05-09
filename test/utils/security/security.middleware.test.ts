/**
 * Tests for security middleware
 */

import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test';
import { Hono } from 'hono';
import { createSecurityMiddleware } from '../../../src/utils/security/security.middleware';
import * as rateLimitModule from '../../../src/utils/security/middleware/rate-limit.middleware';
import * as securityHeadersModule from '../../../src/utils/security/middleware/security-headers.middleware';

// Mock the rate limiter and security headers middleware
const mockRateLimitMiddleware = async (c: any, next: any) => {
  c.header('X-Rate-Limit-Test', 'true');
  await next();
};

const mockSecurityHeadersMiddleware = async (c: any, next: any) => {
  c.header('X-Security-Headers-Test', 'true');
  await next();
};

describe('Security Middleware', () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    app.use('*', createSecurityMiddleware());
    app.get('/', (c) => c.text('Hello World'));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should apply rate limiting middleware', async () => {
    const res = await app.request('/');
    expect(res.headers.get('X-Rate-Limit-Test')).toBe('true');
    expect(createRateLimitMiddleware).toHaveBeenCalled();
  });

  it('should apply security headers middleware', async () => {
    const res = await app.request('/');
    expect(res.headers.get('X-Security-Headers-Test')).toBe('true');
    expect(createSecurityHeadersMiddleware).toHaveBeenCalled();
  });

  it('should return the expected response', async () => {
    const res = await app.request('/');
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('Hello World');
  });
});
