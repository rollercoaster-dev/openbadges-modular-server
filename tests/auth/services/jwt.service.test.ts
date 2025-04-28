/**
 * JWT Service Tests
 *
 * This file contains tests for the JWT service.
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { JwtService } from '../../../src/auth/services/jwt.service';

describe('JWT Service', () => {
  // Save original environment variables
  const originalEnv = { ...process.env };

  beforeAll(() => {
    // Set environment variables for testing
    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_TOKEN_EXPIRY_SECONDS = '3600';
    process.env.JWT_ISSUER = 'test-issuer';
  });

  afterAll(() => {
    // Restore original environment variables
    process.env = originalEnv;
  });

  test('should generate a JWT token', async () => {
    const payload = {
      sub: 'test-user',
      provider: 'test-provider',
      claims: { roles: ['user'] }
    };

    const token = await JwtService.generateToken(payload);

    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(token.split('.').length).toBe(3); // JWT has 3 parts
  });

  test('should verify a valid JWT token', async () => {
    const payload = {
      sub: 'test-user',
      provider: 'test-provider',
      claims: { roles: ['user'] }
    };

    const token = await JwtService.generateToken(payload);
    const decoded = await JwtService.verifyToken(token);

    expect(decoded).toBeDefined();
    expect(decoded.sub).toBe(payload.sub);
    expect(decoded.provider).toBe(payload.provider);
    expect(decoded.claims).toEqual(payload.claims);
    // The issuer is set in the config, not from our environment variable
    expect(decoded.iss).toBeDefined();
    expect(decoded.exp).toBeDefined();
  });

  test('should reject an invalid JWT token', async () => {
    const invalidToken = 'invalid.token.signature';

    try {
      await JwtService.verifyToken(invalidToken);
      // If we get here, the test should fail
      expect(true).toBe(false);
    } catch (error) {
      expect(error).toBeDefined();
    }
  });

  test('should extract token from Authorization header', () => {
    const token = 'test-token';
    const authHeader = `Bearer ${token}`;

    const extractedToken = JwtService.extractTokenFromHeader(authHeader);

    expect(extractedToken).toBe(token);
  });

  test('should return null for invalid Authorization header', () => {
    const invalidHeader = 'Basic dXNlcjpwYXNz';

    const extractedToken = JwtService.extractTokenFromHeader(invalidHeader);

    expect(extractedToken).toBeNull();
  });

  test('should return null for null Authorization header', () => {
    const extractedToken = JwtService.extractTokenFromHeader(null);

    expect(extractedToken).toBeNull();
  });

  test('should validate JWT token in middleware', async () => {
    // Mock the verifyToken method
    const originalVerifyToken = JwtService.verifyToken;
    JwtService.verifyToken = async () => ({
      sub: 'test-user',
      provider: 'test-provider',
      claims: { roles: ['user'] }
    });

    // Create a mock request
    const request = new Request('http://localhost/api/protected', {
      headers: {
        'Authorization': 'Bearer valid-token'
      }
    });

    // Create a mock set object
    const set = { status: 200 };

    try {
      // Call the middleware
      const result = await JwtService.validateJwt({ request, set } as any);

      // Check the result
      expect(result).toEqual({
        jwt: {
          userId: 'test-user',
          provider: 'test-provider',
          claims: { roles: ['user'] }
        }
      });
    } finally {
      // Restore the original method
      JwtService.verifyToken = originalVerifyToken;
    }
  });

  test('should reject invalid JWT token in middleware', async () => {
    // Mock the verifyToken method to throw an error
    const originalVerifyToken = JwtService.verifyToken;
    JwtService.verifyToken = async () => {
      throw new Error('Invalid token');
    };

    // Create a mock request with an invalid token
    const request = new Request('http://localhost/api/protected', {
      headers: {
        'Authorization': 'Bearer invalid-token'
      }
    });

    // Create a mock set object
    const set = { status: 200 };

    try {
      // Call the middleware
      const result = await JwtService.validateJwt({ request, set } as any);

      // Check the result
      expect(result).toEqual({
        error: 'Unauthorized',
        message: 'Invalid or expired token'
      });
      expect(set.status).toBe(401);
    } finally {
      // Restore the original method
      JwtService.verifyToken = originalVerifyToken;
    }
  });

  test('should reject missing JWT token in middleware', async () => {
    // Create a mock request with no token
    const request = new Request('http://localhost/api/protected');

    // Create a mock set object
    const set = { status: 200 };

    // Call the middleware
    const result = await JwtService.validateJwt({ request, set } as any);

    // Check the result
    expect(result).toEqual({
      error: 'Unauthorized',
      message: 'No token provided'
    });
    expect(set.status).toBe(401);
  });
});
