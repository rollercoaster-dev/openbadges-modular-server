/**
 * Unit tests for the validation middleware
 *
 * This file contains tests for the validation middleware to ensure
 * it correctly formats validation errors.
 */

import { describe, expect, it } from 'bun:test';
import { validateIssuerMiddleware } from '../../../src/utils/validation/validation-middleware';

// Define the ValidationResponse type for testing
type ValidationResponse = {
  success: boolean;
  error?: string;
  details?: Record<string, string[]>;
};
import { Context } from 'hono';

// Since formatValidationErrors is not exported, we'll test it indirectly through validateIssuerMiddleware

describe('Validation Middleware', () => {
  describe('validateIssuerMiddleware', () => {
    it('should return validation errors grouped by field', async () => {
      // Create a mock context with invalid issuer data
      const mockContext = {
        req: {
          json: async () => ({
            // Missing name and URL to trigger validation errors
            email: 'not-an-email' // Invalid email to trigger another error
          })
        },
         
        json: (body: unknown, status?: number) => {
          return { body, status } as unknown as Context;
        }
      } as unknown as Context;

      // Get the middleware handler
      const handler = validateIssuerMiddleware();

      // Call the middleware
      const result = await handler(mockContext, async () => {}) as unknown as { body: ValidationResponse, status: number };

      // Check that the result has the expected structure
      expect(result).toBeDefined();
      expect(result.body).toBeDefined();
      expect(result.status).toBe(400);
      expect(result.body.success).toBe(false);
      expect(result.body.error).toBe('Validation error');
      expect(result.body.details).toBeDefined();

      // Check that errors are grouped by field
      const details = result.body.details as Record<string, string[]>;

      // We expect name and url errors at minimum
      expect(Object.keys(details).length).toBeGreaterThan(0);

      // Check if we have field-specific errors
      const hasFieldSpecificErrors =
        Object.keys(details).some(key => ['name', 'url', 'email'].includes(key));

      expect(hasFieldSpecificErrors).toBe(true);
    });

    it('should return success for valid data', async () => {
      // Create a mock context with valid issuer data
      const mockContext = {
        req: {
          json: async () => ({
            name: 'Test Issuer',
            url: 'https://example.com',
            email: 'valid@example.com'
          })
        },
         
        json: (body: unknown, status?: number) => {
          return { body, status } as unknown as Context;
        }
      } as unknown as Context;

      // Create a next function that will be called if validation passes
      let nextCalled = false;
      const next = async () => { nextCalled = true; };

      // Get the middleware handler
      const handler = validateIssuerMiddleware();

      // Call the middleware
      await handler(mockContext, next);

      // Check that next was called, indicating validation passed
      expect(nextCalled).toBe(true);
    });
  });
});
