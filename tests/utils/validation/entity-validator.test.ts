/**
 * Unit tests for the entity validators
 *
 * This file contains tests for the entity validation utilities to ensure
 * they correctly validate entities according to the Open Badges 3.0 specification.
 */

import { describe, expect, it } from 'bun:test';
import { validateIssuer, validateBadgeClass, validateAssertion } from '../../../src/utils/validation/entity-validator';
import { Issuer } from '../../../src/domains/issuer/issuer.entity';
import { BadgeClass } from '../../../src/domains/badgeClass/badgeClass.entity';
import { Assertion } from '../../../src/domains/assertion/assertion.entity';
import { Shared } from 'openbadges-types';

// Define input types for accurate casting
type BadgeClassInput = Parameters<typeof BadgeClass.create>[0];
type AssertionInput = Parameters<typeof Assertion.create>[0];

describe('Entity Validators', () => {
  describe('Issuer Validator', () => {
    it('should validate a valid issuer', () => {
      const validIssuer = Issuer.create({
        name: 'Example University',
        url: EXAMPLE_EDU_URL as Shared.IRI,
        email: 'badges@example.edu'
      });

      const result = validateIssuer(validIssuer);

      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should reject an issuer without a name', () => {
      const invalidIssuer = Issuer.create({
        name: '',
        url: EXAMPLE_EDU_URL as Shared.IRI
      });

      const result = validateIssuer(invalidIssuer);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Issuer name is required');
    });

    it('should reject an issuer without a URL', () => {
      const invalidIssuer = Issuer.create({
        name: 'Example University',
        url: '' as Shared.IRI
      });

      const result = validateIssuer(invalidIssuer);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Issuer URL is required');
    });

    it('should reject an issuer with an invalid URL', () => {
      const invalidIssuer = Issuer.create({
        name: 'Example University',
        url: 'not-a-url' as Shared.IRI
      });

      const result = validateIssuer(invalidIssuer);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Issuer URL must be a valid URL');
    });

    it('should reject an issuer with an invalid email', () => {
      const invalidIssuer = Issuer.create({
        name: 'Example University',
        url: EXAMPLE_EDU_URL as Shared.IRI,
        email: 'not-an-email'
      });

      const result = validateIssuer(invalidIssuer);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Issuer email must be a valid email address');
    });
  });

  describe('BadgeClass Validator', () => {
    it('should validate a valid badge class', () => {
      const validBadgeClass = BadgeClass.create({
        issuer: '123e4567-e89b-12d3-a456-426614174000' as Shared.IRI,
        name: 'Introduction to Programming',
        description: 'This badge is awarded to students who complete the Introduction to Programming course',
        image: 'https://example.edu/badges/intro-to-programming.png' as Shared.IRI,
        criteria: {
          narrative: 'The recipient must complete all course modules with a score of at least 70%'
        }
      });

      const result = validateBadgeClass(validBadgeClass);

      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should reject a badge class without a name', () => {
      const invalidBadgeClass = BadgeClass.create({
        issuer: '123e4567-e89b-12d3-a456-426614174000' as Shared.IRI,
        name: '',
        description: 'This badge is awarded to students who complete the Introduction to Programming course',
        image: 'https://example.edu/badges/intro-to-programming.png' as Shared.IRI,
        criteria: {
          narrative: 'The recipient must complete all course modules with a score of at least 70%'
        }
      });

      const result = validateBadgeClass(invalidBadgeClass);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Badge class name is required');
    });

    it('should reject a badge class without a description', () => {
      const invalidBadgeClass = BadgeClass.create({
        issuer: '123e4567-e89b-12d3-a456-426614174000' as Shared.IRI,
        name: 'Introduction to Programming',
        description: '',
        image: 'https://example.edu/badges/intro-to-programming.png' as Shared.IRI,
        criteria: {
          narrative: 'The recipient must complete all course modules with a score of at least 70%'
        }
      });

      const result = validateBadgeClass(invalidBadgeClass);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Badge class description is required');
    });

    it('should reject a badge class without an image', () => {
      const invalidBadgeClass = BadgeClass.create({
        issuer: '123e4567-e89b-12d3-a456-426614174000' as Shared.IRI,
        name: 'Introduction to Programming',
        description: 'This badge is awarded to students who complete the Introduction to Programming course',
        image: '' as Shared.IRI,
        criteria: {
          narrative: 'The recipient must complete all course modules with a score of at least 70%'
        }
      });

      const result = validateBadgeClass(invalidBadgeClass);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Badge class image is required');
    });

    it('should reject a badge class without criteria', () => {
      const invalidBadgeClass = BadgeClass.create({
        issuer: '123e4567-e89b-12d3-a456-426614174000' as Shared.IRI,
        name: 'Introduction to Programming',
        description: 'This badge is awarded to students who complete the Introduction to Programming course',
        image: 'https://example.edu/badges/intro-to-programming.png' as Shared.IRI,
        criteria: null as unknown as BadgeClassInput['criteria']
      });

      const result = validateBadgeClass(invalidBadgeClass);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Badge class criteria is required');
    });

    it('should reject a badge class without an issuer', () => {
      const invalidBadgeClass = BadgeClass.create({
        issuer: '' as Shared.IRI,
        name: 'Introduction to Programming',
        description: 'This badge is awarded to students who complete the Introduction to Programming course',
        image: 'https://example.edu/badges/intro-to-programming.png' as Shared.IRI,
        criteria: {
          narrative: 'The recipient must complete all course modules with a score of at least 70%'
        }
      });

      const result = validateBadgeClass(invalidBadgeClass);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Badge class issuer is required');
    });
  });

  describe('Assertion Validator', () => {
    it('should validate a valid assertion', () => {
      const validAssertion = Assertion.create({
        badgeClass: '123e4567-e89b-12d3-a456-426614174001' as Shared.IRI,
        recipient: {
          type: 'email',
          identity: 'student@example.edu',
          hashed: false
        },
        issuedOn: new Date().toISOString()
      });

      const result = validateAssertion(validAssertion);

      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should reject an assertion without a badge class', () => {
      const invalidAssertion = Assertion.create({
        badgeClass: '' as Shared.IRI,
        recipient: {
          type: 'email',
          identity: 'student@example.edu',
          hashed: false
        },
        issuedOn: new Date().toISOString()
      });

      const result = validateAssertion(invalidAssertion);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Assertion badge class is required');
    });

    it('should reject an assertion without a recipient', () => {
      const invalidAssertion = Assertion.create({
        badgeClass: '123e4567-e89b-12d3-a456-426614174001' as Shared.IRI,
        recipient: null as unknown as AssertionInput['recipient'],
        issuedOn: new Date().toISOString()
      });

      const result = validateAssertion(invalidAssertion);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Assertion recipient is required');
    });

    it('should reject an assertion with an invalid recipient', () => {
      const invalidAssertion = Assertion.create({
        badgeClass: '123e4567-e89b-12d3-a456-426614174001' as Shared.IRI,
        recipient: {} as unknown as AssertionInput['recipient'],
        issuedOn: new Date().toISOString()
      });

      const result = validateAssertion(invalidAssertion);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Assertion recipient must be a valid recipient object with identity and type');
    });

    it('should reject an assertion without an issuedOn date', () => {
      const invalidAssertion = Assertion.create({
        badgeClass: '123e4567-e89b-12d3-a456-426614174001' as Shared.IRI,
        recipient: {
          type: 'email',
          identity: 'student@example.edu',
          hashed: false
        },
        issuedOn: ''
      });

      const result = validateAssertion(invalidAssertion);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Assertion issuedOn is required');
    });

    it('should reject an assertion with an invalid issuedOn date', () => {
      const invalidAssertion = Assertion.create({
        badgeClass: '123e4567-e89b-12d3-a456-426614174001' as Shared.IRI,
        recipient: {
          type: 'email',
          identity: 'student@example.edu',
          hashed: false
        },
        issuedOn: 'not-a-date'
      });

      const result = validateAssertion(invalidAssertion);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Assertion issuedOn must be a valid ISO date string');
    });

    it('should reject an assertion with an invalid expires date', () => {
      const invalidAssertion = Assertion.create({
        badgeClass: '123e4567-e89b-12d3-a456-426614174001' as Shared.IRI,
        recipient: {
          type: 'email',
          identity: 'student@example.edu',
          hashed: false
        },
        issuedOn: new Date().toISOString(),
        expires: 'not-a-date'
      });

      const result = validateAssertion(invalidAssertion);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Assertion expires must be a valid ISO date string');
    });

    it('should reject an assertion with expires before issuedOn', () => {
      const now = new Date();
      const past = new Date(now.getTime() - 86400000); // 1 day in the past

      const invalidAssertion = Assertion.create({
        badgeClass: '123e4567-e89b-12d3-a456-426614174001' as Shared.IRI,
        recipient: {
          type: 'email',
          identity: 'student@example.edu',
          hashed: false
        },
        issuedOn: now.toISOString(),
        expires: past.toISOString()
      });

      const result = validateAssertion(invalidAssertion);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Assertion expires must be after issuedOn');
    });
  });
});
