/**
 * Authentication Middleware Tests
 *
 * This file contains tests for the authentication middleware.
 */

import { describe, test, expect, beforeAll, afterAll, mock } from 'bun:test';
import { authMiddleware, registerAuthAdapter } from '../../../src/auth/middleware/auth.middleware';
import { AuthAdapter, AuthenticationResult } from '../../../src/auth/adapters/auth-adapter.interface';
import { JwtService } from '../../../src/auth/services/jwt.service';

describe('Authentication Middleware', () => {
  // Mock JWT service
  const originalGenerateToken = JwtService.generateToken;
  const originalVerifyToken = JwtService.verifyToken;
  const originalExtractTokenFromHeader = JwtService.extractTokenFromHeader;

  beforeAll(() => {
    // Mock JWT service methods
    JwtService.generateToken = mock(async (payload) => {
      return 'mock-jwt-token';
    });

    JwtService.verifyToken = mock(async (token) => {
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

    JwtService.extractTokenFromHeader = mock((header) => {
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

    // Create a mock set object
    const set = { headers: {} };

    // Call the middleware
    const result = await authMiddleware.derive({ request, set } as any);

    // Check that the middleware authenticated successfully
    expect(result).toEqual({
      isAuthenticated: true,
      user: {
        id: 'test-user',
        provider: 'test-provider',
        claims: { roles: ['user'] }
      }
    });
    expect(set.headers['X-Auth-Token']).toBe('mock-jwt-token');

    // Check that the adapter was called
    expect(mockAdapter.authenticate).toHaveBeenCalledTimes(1);
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

    // Create a mock set object
    const set = { headers: {} };

    // Call the middleware
    const result = await authMiddleware.derive({ request, set } as any);

    // Check that the middleware skipped authentication
    expect(result).toEqual({
      isAuthenticated: false,
      user: null
    });

    // Check that the adapter was not called
    expect(mockAdapter.authenticate).toHaveBeenCalledTimes(0);
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

    // Create a mock set object
    const set = { headers: {} };

    // Call the middleware
    const result = await authMiddleware.derive({ request, set } as any);

    // Check that the middleware authenticated successfully
    expect(result).toEqual({
      isAuthenticated: true,
      user: {
        id: 'test-user',
        provider: 'test-provider',
        claims: { roles: ['user'] }
      }
    });

    // Check that the adapter was not called (JWT auth succeeded first)
    expect(mockAdapter.authenticate).toHaveBeenCalledTimes(0);
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

    // Create a mock set object
    const set = { headers: {} };

    // Call the middleware
    const result = await authMiddleware.derive({ request, set } as any);

    // Check that the middleware failed authentication
    expect(result).toEqual({
      isAuthenticated: false,
      user: null
    });

    // Check that the adapter was called (JWT auth failed)
    expect(mockAdapter.authenticate).toHaveBeenCalledTimes(1);
  });
});
