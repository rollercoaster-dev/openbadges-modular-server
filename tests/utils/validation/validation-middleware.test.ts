/**
 * Unit tests for the validation middleware
 *
 * This file contains tests for the validation middleware to ensure
 * it correctly formats validation errors.
 */

import { describe, expect, it } from 'bun:test';
import { validateIssuerMiddleware } from '../../../src/utils/validation/validation-middleware';
import { Context } from 'elysia';

// Define the ValidationResponse interface to match the one in the source file
interface ValidationResponse {
  success: boolean;
  error?: string;
  details?: Record<string, string[]>;
}

describe('Validation Middleware', () => {
  describe('validateIssuerMiddleware', () => {
    it('should return validation errors grouped by field', () => {
      // Create a mock context with invalid issuer data
      const mockContext = {
        body: {
          // Missing name and URL to trigger validation errors
          email: 'not-an-email' // Invalid email to trigger another error
        },
        set: { status: 200 }
      } as unknown as Context;

      // Call the middleware
      const result = validateIssuerMiddleware(mockContext) as ValidationResponse;

      // Check that the result has the expected structure
      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.error).toBe('Validation error');
      expect(result.details).toBeDefined();

      // Check that errors are grouped by field
      const details = result.details as Record<string, string[]>;
      
      // We expect name and url errors at minimum
      expect(Object.keys(details).length).toBeGreaterThan(0);
      
      // Check if we have field-specific errors
      const hasFieldSpecificErrors = 
        Object.keys(details).some(key => ['name', 'url', 'email'].includes(key));
      
      expect(hasFieldSpecificErrors).toBe(true);
    });

    it('should return success for valid data', () => {
      // Create a mock context with valid issuer data
      const mockContext = {
        body: {
          name: 'Test Issuer',
          url: 'https://example.com',
          email: 'valid@example.com'
        },
        set: { status: 200 }
      } as unknown as Context;

      // Call the middleware
      const result = validateIssuerMiddleware(mockContext) as ValidationResponse;

      // Check that the result indicates success
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.details).toBeUndefined();
    });
  });
});
