/**
 * Tests for DTO validators
 */

import { describe, expect, it } from 'bun:test';
import { 
  validateCreateIssuerDto,
  validateCreateBadgeClassDto,
  validateCreateAssertionDto,
  isUpdateIssuerDto,
  isUpdateBadgeClassDto,
  isUpdateAssertionDto
} from '../../../src/api/validation/dto.validator';
import { MissingRequiredFieldsError } from '../../../src/utils/errors/validation.errors';

describe('validateCreateIssuerDto', () => {
  it('should validate a valid CreateIssuerDto', () => {
    const validDto = {
      name: 'Test Issuer',
      url: 'https://example.com',
      email: 'test@example.com'
    };
    
    // Should not throw an error
    expect(() => validateCreateIssuerDto(validDto)).not.toThrow();
  });
  
  it('should throw MissingRequiredFieldsError for missing name', () => {
    const invalidDto = {
      url: 'https://example.com',
      email: 'test@example.com'
    };
    
    expect(() => validateCreateIssuerDto(invalidDto)).toThrow(MissingRequiredFieldsError);
    expect(() => validateCreateIssuerDto(invalidDto)).toThrow(/name/);
  });
  
  it('should throw MissingRequiredFieldsError for missing url', () => {
    const invalidDto = {
      name: 'Test Issuer',
      email: 'test@example.com'
    };
    
    expect(() => validateCreateIssuerDto(invalidDto)).toThrow(MissingRequiredFieldsError);
    expect(() => validateCreateIssuerDto(invalidDto)).toThrow(/url/);
  });
  
  it('should throw MissingRequiredFieldsError for missing all required fields', () => {
    const invalidDto = {
      email: 'test@example.com'
    };
    
    expect(() => validateCreateIssuerDto(invalidDto)).toThrow(MissingRequiredFieldsError);
    expect(() => validateCreateIssuerDto(invalidDto)).toThrow(/name.*url/);
  });
});

describe('validateCreateBadgeClassDto', () => {
  it('should validate a valid CreateBadgeClassDto', () => {
    const validDto = {
      name: 'Test Badge',
      description: 'A test badge',
      image: 'https://example.com/badge.png',
      issuer: 'https://example.com/issuer'
    };
    
    // Should not throw an error
    expect(() => validateCreateBadgeClassDto(validDto)).not.toThrow();
  });
  
  it('should throw MissingRequiredFieldsError for missing required fields', () => {
    const invalidDto = {
      name: 'Test Badge',
      description: 'A test badge'
      // Missing image and issuer
    };
    
    expect(() => validateCreateBadgeClassDto(invalidDto)).toThrow(MissingRequiredFieldsError);
    expect(() => validateCreateBadgeClassDto(invalidDto)).toThrow(/image.*issuer/);
  });
});

describe('validateCreateAssertionDto', () => {
  it('should validate a valid CreateAssertionDto', () => {
    const validDto = {
      badge: 'https://example.com/badge',
      recipient: {
        type: 'email',
        identity: 'recipient@example.com',
        hashed: false
      },
      issuedOn: '2023-01-01T00:00:00Z'
    };
    
    // Should not throw an error
    expect(() => validateCreateAssertionDto(validDto)).not.toThrow();
  });
  
  it('should throw MissingRequiredFieldsError for missing badge', () => {
    const invalidDto = {
      recipient: {
        type: 'email',
        identity: 'recipient@example.com',
        hashed: false
      },
      issuedOn: '2023-01-01T00:00:00Z'
    };
    
    expect(() => validateCreateAssertionDto(invalidDto)).toThrow(MissingRequiredFieldsError);
    expect(() => validateCreateAssertionDto(invalidDto)).toThrow(/badge/);
  });
  
  it('should throw MissingRequiredFieldsError for incomplete recipient', () => {
    const invalidDto = {
      badge: 'https://example.com/badge',
      recipient: {
        // Missing type
        identity: 'recipient@example.com',
        // Missing hashed
      },
      issuedOn: '2023-01-01T00:00:00Z'
    };
    
    expect(() => validateCreateAssertionDto(invalidDto)).toThrow(MissingRequiredFieldsError);
    expect(() => validateCreateAssertionDto(invalidDto)).toThrow(/recipient.type.*recipient.hashed/);
  });
});

describe('isUpdateIssuerDto', () => {
  it('should return true for valid objects', () => {
    expect(isUpdateIssuerDto({ name: 'Updated Name' })).toBe(true);
    expect(isUpdateIssuerDto({})).toBe(true); // Empty objects are valid for updates
  });
  
  it('should return false for non-objects', () => {
    expect(isUpdateIssuerDto(null)).toBe(false);
    expect(isUpdateIssuerDto(undefined)).toBe(false);
    expect(isUpdateIssuerDto('string')).toBe(false);
    expect(isUpdateIssuerDto(123)).toBe(false);
  });
});

describe('isUpdateBadgeClassDto', () => {
  it('should return true for valid objects', () => {
    expect(isUpdateBadgeClassDto({ description: 'Updated description' })).toBe(true);
    expect(isUpdateBadgeClassDto({})).toBe(true);
  });
  
  it('should return false for non-objects', () => {
    expect(isUpdateBadgeClassDto(null)).toBe(false);
    expect(isUpdateBadgeClassDto(undefined)).toBe(false);
  });
});

describe('isUpdateAssertionDto', () => {
  it('should return true for valid objects', () => {
    expect(isUpdateAssertionDto({ revoked: true })).toBe(true);
    expect(isUpdateAssertionDto({})).toBe(true);
  });
  
  it('should return false for non-objects', () => {
    expect(isUpdateAssertionDto(null)).toBe(false);
    expect(isUpdateAssertionDto(undefined)).toBe(false);
  });
});
