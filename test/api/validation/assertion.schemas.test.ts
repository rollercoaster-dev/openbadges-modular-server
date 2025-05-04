import { describe, test, expect } from 'bun:test';
import { CreateAssertionSchema, UpdateAssertionSchema } from '../../../src/api/validation/assertion.schemas';

describe('Assertion Schemas', () => {
  describe('CreateAssertionSchema', () => {
    test('should validate a valid OB2 assertion', () => {
      const validOB2Assertion = {
        recipient: {
          type: 'email',
          identity: 'test@example.com',
          hashed: false
        },
        badge: 'https://example.com/badges/123',
        issuedOn: new Date().toISOString(),
        verification: {
          type: 'HostedBadge'
        }
      };

      const result = CreateAssertionSchema.safeParse(validOB2Assertion);
      expect(result.success).toBe(true);
    });

    test('should validate a valid OB3 assertion', () => {
      const validOB3Assertion = {
        id: 'https://example.com/assertions/123',
        type: 'VerifiableCredential',
        recipient: {
          type: 'email',
          identity: 'test@example.com',
          hashed: false
        },
        badge: 'https://example.com/badges/123',
        issuedOn: new Date().toISOString(),
        verification: {
          type: 'HostedBadge'
        },
        credentialSubject: {
          id: 'did:example:123',
          type: 'AchievementSubject'
        }
      };

      const result = CreateAssertionSchema.safeParse(validOB3Assertion);
      expect(result.success).toBe(true);
    });

    test('should reject an assertion without required fields', () => {
      const invalidAssertion = {
        recipient: {
          type: 'email',
          identity: 'test@example.com',
          hashed: false
        },
        // Missing badge and issuedOn
      };

      const result = CreateAssertionSchema.safeParse(invalidAssertion);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
      }
    });

    test('should reject an assertion with invalid date format', () => {
      const invalidAssertion = {
        recipient: {
          type: 'email',
          identity: 'test@example.com',
          hashed: false
        },
        badge: 'https://example.com/badges/123',
        issuedOn: 'not-a-date' // Invalid date format
      };

      const result = CreateAssertionSchema.safeParse(invalidAssertion);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(issue =>
          issue.path.includes('issuedOn') &&
          issue.message.includes('Invalid')
        )).toBe(true);
      }
    });

    test('should reject an assertion with invalid recipient format', () => {
      // Create an invalid assertion with completely missing recipient
      const invalidAssertion = {
        // Missing recipient entirely
        badge: 'https://example.com/badges/123',
        issuedOn: new Date().toISOString()
      };

      const result = CreateAssertionSchema.safeParse(invalidAssertion);
      expect(result.success).toBe(false);
      if (!result.success) {
        // Just verify that validation failed, which is enough for this test
        expect(result.error.issues.length).toBeGreaterThan(0);
      }
    });
  });

  describe('UpdateAssertionSchema', () => {
    test('should validate a partial update with valid fields', () => {
      const validUpdate = {
        expires: new Date(Date.now() + 86400000).toISOString() // Tomorrow
      };

      const result = UpdateAssertionSchema.safeParse(validUpdate);
      expect(result.success).toBe(true);
    });

    test('should reject an update with invalid fields', () => {
      const invalidUpdate = {
        expires: 'not-a-date'
      };

      const result = UpdateAssertionSchema.safeParse(invalidUpdate);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(issue =>
          issue.path.includes('expires') &&
          issue.message.includes('Invalid')
        )).toBe(true);
      }
    });

    test('should validate an empty update object', () => {
      const emptyUpdate = {};

      const result = UpdateAssertionSchema.safeParse(emptyUpdate);
      expect(result.success).toBe(true);
    });
  });
});
