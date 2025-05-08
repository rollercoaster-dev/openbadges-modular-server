/**
 * Authentication Middleware Tests
 *
 * This file contains tests for the authentication middleware.
 */

import { describe, test, expect, beforeAll, afterAll, mock } from 'bun:test';
import { createAuthMiddleware, registerAuthAdapter } from '../../../src/auth/middleware/auth.middleware';
import { AuthAdapter } from '../../../src/auth/adapters/auth-adapter.interface';
import { JwtService } from '../../../src/auth/services/jwt.service';
import { Context } from 'hono';

describe('Authentication Middleware', () => {
  // Mock JWT service
  const originalGenerateToken = JwtService.generateToken;
  const originalVerifyToken = JwtService.verifyToken;
  const originalExtractTokenFromHeader = JwtService.extractTokenFromHeader;

  beforeAll(() => {
    // Mock JWT service methods
    JwtService.generateToken = mock(async (_payload: unknown) => {
      return 'mock-jwt-token';
    });

    JwtService.verifyToken = mock(async (token: string) => {
      if (token === 'valid-token') {
        return {
          sub: 'test-user',
          provider: 'test-provider',
          claims: { roles: ['user'] }
        };
      } else {
        throw new Error('Invalid token');
      }
    });

    JwtService.extractTokenFromHeader = mock((header?: string) => {
      if (header?.startsWith('Bearer ')) {
        return header.substring(7);
      }
      return null;
    });
  });

  afterAll(() => {
    // Restore original methods
    JwtService.generateToken = originalGenerateToken;
    JwtService.verifyToken = originalVerifyToken;
    JwtService.extractTokenFromHeader = originalExtractTokenFromHeader;
  });

  test('should authenticate with a valid adapter', async () => {
    // Create a mock adapter that always authenticates successfully
    const mockAdapter: AuthAdapter = {
      getProviderName: () => 'test-provider',
      canHandle: () => true,
      authenticate: mock(async () => {
        return {
          isAuthenticated: true,
          userId: 'test-user',
          provider: 'test-provider',
          claims: { roles: ['user'] }
        };
      })
    };

    // Register the mock adapter
    registerAuthAdapter(mockAdapter);

    // Create a mock request
    const request = new Request('http://localhost/api/protected');

    // Create a mock context
    const mockContext = {
      req: request,
      header: (name: string) => request.headers.get(name),
      set: (_key: string, _value: any) => {}
    } as unknown as Context;

    // Create a next function that will be called if authentication passes
    let nextCalled = false;
    const next = async () => { nextCalled = true; };

    // Get the middleware handler
    const handler = createAuthMiddleware();

    // Call the middleware
    await handler(mockContext, next);

    // Check that next was called, indicating authentication passed
    expect(nextCalled).toBe(true);
  });

  test('should skip authentication for public paths', async () => {
    // Create a mock adapter
    const mockAdapter: AuthAdapter = {
      getProviderName: () => 'test-provider',
      canHandle: () => true,
      authenticate: mock(async () => {
        return {
          isAuthenticated: true,
          userId: 'test-user',
          provider: 'test-provider'
        };
      })
    };

    // Register the mock adapter
    registerAuthAdapter(mockAdapter);

    // Create a mock request to a public path
    const request = new Request('http://localhost/public/resource');

    // Create a mock context
    const mockContext = {
      req: request,
      header: (name: string) => request.headers.get(name),
      set: (_key: string, _value: any) => {}
    } as unknown as Context;

    // Create a next function that will be called if authentication passes
    let nextCalled = false;
    const next = async () => { nextCalled = true; };

    // Get the middleware handler
    const handler = createAuthMiddleware();

    // Call the middleware
    await handler(mockContext, next);

    // Check that next was called, indicating authentication was skipped
    expect(nextCalled).toBe(true);
  });

  test('should authenticate with JWT token', async () => {
    // Create a mock adapter
    const mockAdapter: AuthAdapter = {
      getProviderName: () => 'test-provider',
      canHandle: () => false, // This adapter won't handle the request
      authenticate: mock(async () => {
        return {
          isAuthenticated: false,
          error: 'No credentials provided',
          provider: 'test-provider'
        };
      })
    };

    // Register the mock adapter
    registerAuthAdapter(mockAdapter);

    // Create a mock request with a JWT token
    const request = new Request('http://localhost/api/protected', {
      headers: {
        'Authorization': 'Bearer valid-token'
      }
    });

    // Create a mock context
    const mockContext = {
      req: request,
      header: (name: string) => request.headers.get(name),
      set: (_key: string, _value: any) => {}
    } as unknown as Context;

    // Create a next function that will be called if authentication passes
    let nextCalled = false;
    const next = async () => { nextCalled = true; };

    // Get the middleware handler
    const handler = createAuthMiddleware();

    // Call the middleware
    await handler(mockContext, next);

    // Check that next was called, indicating authentication passed
    expect(nextCalled).toBe(true);
  });

  test('should fail authentication with invalid JWT token and no valid adapter', async () => {
    // Create a mock adapter that always fails
    const mockAdapter: AuthAdapter = {
      getProviderName: () => 'test-provider',
      canHandle: () => true,
      authenticate: mock(async () => {
        return {
          isAuthenticated: false,
          error: 'No credentials provided',
          provider: 'test-provider'
        };
      })
    };

    // Register the mock adapter
    registerAuthAdapter(mockAdapter);

    // Create a mock request with an invalid JWT token
    const request = new Request('http://localhost/api/protected', {
      headers: {
        'Authorization': 'Bearer invalid-token'
      }
    });

    // Create a mock context
    const mockContext = {
      req: request,
      header: (name: string) => request.headers.get(name),
      set: (_key: string, _value: any) => {},
      json: (body: any, status?: number) => {
        return { body, status } as any;
      }
    } as unknown as Context;

    // Create a next function that will be called if authentication passes
    let nextCalled = false;
    const next = async () => { nextCalled = true; };

    // Get the middleware handler
    const handler = createAuthMiddleware();

    // Call the middleware
    const result = await handler(mockContext, next);

    // Check that next was not called, indicating authentication failed
    expect(nextCalled).toBe(false);
    // Check that a response was returned
    expect(result).toBeDefined();
  });
});
