/**
 * Unit tests for Schema Validation Service
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SchemaValidationService, type CredentialSchema } from '../../src/core/schema-validation.service';
import {
  SchemaValidationError,
  SchemaFetchError,
  InvalidSchemaError,
  CredentialSchemaValidationError,
  UnsupportedSchemaTypeError,
  SchemaValidationTimeoutError
} from '../../src/utils/errors/schema-validation.errors';

// Mock fetch globally
global.fetch = vi.fn();

describe('SchemaValidationService', () => {
  let service: SchemaValidationService;

  beforeEach(() => {
    service = new SchemaValidationService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    service.clearCaches();
  });

  describe('validateCredential', () => {
    it('should skip validation when no schemas provided', async () => {
      const credential = { id: 'test', type: 'VerifiableCredential' };
      
      await expect(service.validateCredential(credential, [])).resolves.toBeUndefined();
    });

    it('should validate credential against valid schema', async () => {
      const validSchema = {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          id: { type: 'string' },
          type: { type: 'string' }
        },
        required: ['id', 'type']
      };

      const credential = { id: 'test', type: 'VerifiableCredential' };
      const credentialSchemas: CredentialSchema[] = [{
        id: 'https://example.com/schema.json',
        type: '1EdTechJsonSchemaValidator2019'
      }];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(validSchema)
      });

      await expect(service.validateCredential(credential, credentialSchemas)).resolves.toBeUndefined();
    });

    it('should throw error for unsupported schema type', async () => {
      const credential = { id: 'test', type: 'VerifiableCredential' };
      const credentialSchemas: CredentialSchema[] = [{
        id: 'https://example.com/schema.json',
        type: 'UnsupportedSchemaType'
      }];

      await expect(service.validateCredential(credential, credentialSchemas))
        .rejects.toThrow(UnsupportedSchemaTypeError);
    });

    it('should throw error when schema fetch fails', async () => {
      const credential = { id: 'test', type: 'VerifiableCredential' };
      const credentialSchemas: CredentialSchema[] = [{
        id: 'https://example.com/schema.json',
        type: '1EdTechJsonSchemaValidator2019'
      }];

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      await expect(service.validateCredential(credential, credentialSchemas))
        .rejects.toThrow(SchemaFetchError);
    });

    it('should throw validation error when credential does not match schema', async () => {
      const validSchema = {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          id: { type: 'string' },
          type: { type: 'string' },
          requiredField: { type: 'string' }
        },
        required: ['id', 'type', 'requiredField']
      };

      const credential = { id: 'test', type: 'VerifiableCredential' }; // Missing requiredField
      const credentialSchemas: CredentialSchema[] = [{
        id: 'https://example.com/schema.json',
        type: '1EdTechJsonSchemaValidator2019'
      }];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(validSchema)
      });

      await expect(service.validateCredential(credential, credentialSchemas))
        .rejects.toThrow(CredentialSchemaValidationError);
    });

    it('should apply custom validation rules', async () => {
      const validSchema = {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          id: { type: 'string' },
          type: { type: 'string' }
        },
        required: ['id', 'type']
      };

      const credential = { id: 'test', type: 'VerifiableCredential' };
      const credentialSchemas: CredentialSchema[] = [{
        id: 'https://example.com/schema.json',
        type: '1EdTechJsonSchemaValidator2019'
      }];

      const customRule = vi.fn().mockResolvedValue({ isValid: false, errors: ['Custom validation failed'] });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(validSchema)
      });

      await expect(service.validateCredential(credential, credentialSchemas, {
        customRules: [customRule]
      })).rejects.toThrow(SchemaValidationError);

      expect(customRule).toHaveBeenCalledWith(credential, expect.objectContaining({
        credentialType: 'VerifiableCredential',
        schemaUrl: 'https://example.com/schema.json'
      }));
    });

    it('should handle timeout during validation', async () => {
      const credential = { id: 'test', type: 'VerifiableCredential' };
      const credentialSchemas: CredentialSchema[] = [{
        id: 'https://example.com/schema.json',
        type: '1EdTechJsonSchemaValidator2019'
      }];

      // Mock fetch to never resolve
      (global.fetch as any).mockImplementation(() => new Promise(() => {}));

      await expect(service.validateCredential(credential, credentialSchemas, {
        timeoutMs: 100
      })).rejects.toThrow(SchemaValidationTimeoutError);
    });
  });

  describe('Custom Validation Rules', () => {
    describe('validateIssuanceDate', () => {
      it('should pass for valid issuance date', async () => {
        const credential = {
          issuanceDate: new Date().toISOString()
        };

        const result = await SchemaValidationService.CustomRules.validateIssuanceDate(credential, {});
        expect(result.isValid).toBe(true);
      });

      it('should fail for missing issuance date', async () => {
        const credential = {};

        const result = await SchemaValidationService.CustomRules.validateIssuanceDate(credential, {});
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Missing issuanceDate');
      });

      it('should fail for future issuance date', async () => {
        const futureDate = new Date();
        futureDate.setFullYear(futureDate.getFullYear() + 1);
        
        const credential = {
          issuanceDate: futureDate.toISOString()
        };

        const result = await SchemaValidationService.CustomRules.validateIssuanceDate(credential, {});
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('issuanceDate cannot be in the future');
      });

      it('should fail for invalid date format', async () => {
        const credential = {
          issuanceDate: 'invalid-date'
        };

        const result = await SchemaValidationService.CustomRules.validateIssuanceDate(credential, {});
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Invalid issuanceDate format');
      });
    });

    describe('validateExpirationDate', () => {
      it('should pass when no expiration date', async () => {
        const credential = {};

        const result = await SchemaValidationService.CustomRules.validateExpirationDate(credential, {});
        expect(result.isValid).toBe(true);
      });

      it('should pass for future expiration date', async () => {
        const futureDate = new Date();
        futureDate.setFullYear(futureDate.getFullYear() + 1);
        
        const credential = {
          expirationDate: futureDate.toISOString()
        };

        const result = await SchemaValidationService.CustomRules.validateExpirationDate(credential, {});
        expect(result.isValid).toBe(true);
      });

      it('should fail for expired credential', async () => {
        const pastDate = new Date();
        pastDate.setFullYear(pastDate.getFullYear() - 1);
        
        const credential = {
          expirationDate: pastDate.toISOString()
        };

        const result = await SchemaValidationService.CustomRules.validateExpirationDate(credential, {});
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Credential has expired');
      });

      it('should fail for invalid expiration date format', async () => {
        const credential = {
          expirationDate: 'invalid-date'
        };

        const result = await SchemaValidationService.CustomRules.validateExpirationDate(credential, {});
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Invalid expirationDate format');
      });
    });

    describe('validateIssuer', () => {
      it('should pass for valid issuer URL string', async () => {
        const credential = {
          issuer: 'https://example.com/issuer'
        };

        const result = await SchemaValidationService.CustomRules.validateIssuer(credential, {});
        expect(result.isValid).toBe(true);
      });

      it('should pass for valid issuer object with id', async () => {
        const credential = {
          issuer: {
            id: 'https://example.com/issuer',
            name: 'Test Issuer'
          }
        };

        const result = await SchemaValidationService.CustomRules.validateIssuer(credential, {});
        expect(result.isValid).toBe(true);
      });

      it('should fail for missing issuer', async () => {
        const credential = {};

        const result = await SchemaValidationService.CustomRules.validateIssuer(credential, {});
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Missing issuer');
      });

      it('should fail for invalid issuer URL', async () => {
        const credential = {
          issuer: 'not-a-url'
        };

        const result = await SchemaValidationService.CustomRules.validateIssuer(credential, {});
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Issuer URL is invalid');
      });

      it('should fail for issuer object with invalid id', async () => {
        const credential = {
          issuer: {
            id: 'not-a-url',
            name: 'Test Issuer'
          }
        };

        const result = await SchemaValidationService.CustomRules.validateIssuer(credential, {});
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Issuer id is not a valid URL');
      });
    });
  });

  describe('Cache Management', () => {
    it('should cache schemas and validation functions', async () => {
      const validSchema = {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          id: { type: 'string' }
        }
      };

      const credential = { id: 'test' };
      const credentialSchemas: CredentialSchema[] = [{
        id: 'https://example.com/schema.json',
        type: '1EdTechJsonSchemaValidator2019'
      }];

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(validSchema)
      });

      // First call
      await service.validateCredential(credential, credentialSchemas);

      // Second call should use cache
      await service.validateCredential(credential, credentialSchemas);

      // Fetch should only be called once due to caching
      expect(global.fetch).toHaveBeenCalledTimes(1);

      const stats = service.getCacheStats();
      expect(stats.schemas).toBe(1);
      expect(stats.validationFunctions).toBe(1);
    });

    it('should clear caches', async () => {
      const validSchema = {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object'
      };

      const credential = { id: 'test' };
      const credentialSchemas: CredentialSchema[] = [{
        id: 'https://example.com/schema.json',
        type: '1EdTechJsonSchemaValidator2019'
      }];

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(validSchema)
      });

      await service.validateCredential(credential, credentialSchemas);

      let stats = service.getCacheStats();
      expect(stats.schemas).toBe(1);
      expect(stats.validationFunctions).toBe(1);

      service.clearCaches();

      stats = service.getCacheStats();
      expect(stats.schemas).toBe(0);
      expect(stats.validationFunctions).toBe(0);
    });
  });

  describe('Integration Tests with Real Schemas', () => {
    it('should validate against Open Badges 3.0 Achievement Credential schema', async () => {
      const validCredential = {
        "@context": [
          "https://www.w3.org/2018/credentials/v1",
          "https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json"
        ],
        "id": "https://example.com/credentials/123",
        "type": ["VerifiableCredential", "OpenBadgeCredential"],
        "issuer": {
          "id": "https://example.com/issuers/1",
          "type": "Profile",
          "name": "Example University"
        },
        "issuanceDate": "2023-01-01T00:00:00Z",
        "credentialSubject": {
          "id": "https://example.com/students/456",
          "type": "AchievementSubject",
          "achievement": "https://example.com/achievements/math-101"
        }
      };

      const achievementSchema = await import('../fixtures/schemas/valid-achievement-credential-schema.json');

      const credentialSchemas: CredentialSchema[] = [{
        id: 'https://purl.imsglobal.org/spec/ob/v3p0/schema/json/ob_v3p0_achievementcredential_schema.json',
        type: '1EdTechJsonSchemaValidator2019'
      }];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(achievementSchema.default)
      });

      await expect(service.validateCredential(validCredential, credentialSchemas))
        .resolves.toBeUndefined();
    });

    it('should fail validation against strict schema with missing fields', async () => {
      const incompleteCredential = {
        "@context": ["https://www.w3.org/2018/credentials/v1"],
        "id": "https://example.com/credentials/123",
        "type": ["VerifiableCredential"],
        "issuer": "https://example.com/issuers/1", // Should be object
        "issuanceDate": "2023-01-01T00:00:00Z",
        "credentialSubject": {
          "id": "https://example.com/students/456",
          "type": "AchievementSubject",
          "achievement": "https://example.com/achievements/math-101"
          // Missing required customField
        }
        // Missing required evidence
      };

      const strictSchema = await import('../fixtures/schemas/strict-credential-schema.json');

      const credentialSchemas: CredentialSchema[] = [{
        id: 'https://example.com/strict-credential-schema.json',
        type: '1EdTechJsonSchemaValidator2019'
      }];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(strictSchema.default)
      });

      await expect(service.validateCredential(incompleteCredential, credentialSchemas))
        .rejects.toThrow(CredentialSchemaValidationError);
    });

    it('should handle invalid schema gracefully', async () => {
      const credential = { id: 'test', type: 'VerifiableCredential' };
      const credentialSchemas: CredentialSchema[] = [{
        id: 'https://example.com/invalid-schema.json',
        type: '1EdTechJsonSchemaValidator2019'
      }];

      const invalidSchema = await import('../fixtures/schemas/invalid-schema.json');

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(invalidSchema.default)
      });

      await expect(service.validateCredential(credential, credentialSchemas, {
        validateSchemaFormat: true
      })).rejects.toThrow(InvalidSchemaError);
    });
  });
});
