/**
 * API tests for assertion schema validation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AssertionController } from '@/api/controllers/assertion.controller';
import { SchemaValidationService } from '@core/schema-validation.service';
import { AssertionRepository } from '@domains/assertion/assertion.repository';
import { BadgeClassRepository } from '@domains/badgeClass/badgeClass.repository';
import { IssuerRepository } from '@domains/issuer/issuer.repository';
import { BadRequestError } from '@infrastructure/errors/bad-request.error';
import { BadgeVersion } from '@utils/version/badge-version';
import { Assertion } from '@domains/assertion/assertion.entity';
import { BadgeClass } from '@domains/badgeClass/badgeClass.entity';
import { Issuer } from '@domains/issuer/issuer.entity';
import type { CreateAssertionDto } from '@/api/dtos';

// Mock fetch globally
global.fetch = vi.fn();

describe('Assertion Schema Validation API Tests', () => {
  let controller: AssertionController;
  let mockAssertionRepository: AssertionRepository;
  let mockBadgeClassRepository: BadgeClassRepository;
  let mockIssuerRepository: IssuerRepository;
  let mockSchemaValidationService: SchemaValidationService;

  const mockBadgeClass = {
    id: 'https://example.com/badges/test-badge',
    name: 'Test Badge',
    description: 'A test badge',
    issuer: 'https://example.com/issuers/test-issuer'
  } as BadgeClass;

  const mockIssuer = {
    id: 'https://example.com/issuers/test-issuer',
    name: 'Test Issuer',
    email: 'test@example.com'
  } as Issuer;

  beforeEach(() => {
    // Create mock repositories
    mockAssertionRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      update: vi.fn(),
      findAll: vi.fn(),
      findByBadgeClass: vi.fn(),
      revoke: vi.fn()
    } as any;

    mockBadgeClassRepository = {
      findById: vi.fn().mockResolvedValue(mockBadgeClass)
    } as any;

    mockIssuerRepository = {
      findById: vi.fn().mockResolvedValue(mockIssuer)
    } as any;

    mockSchemaValidationService = new SchemaValidationService();

    controller = new AssertionController(
      mockAssertionRepository,
      mockBadgeClassRepository,
      mockIssuerRepository,
      mockSchemaValidationService
    );

    vi.clearAllMocks();
  });

  afterEach(() => {
    mockSchemaValidationService.clearCaches();
  });

  describe('createAssertion with credentialSchema', () => {
    const baseAssertionData: CreateAssertionDto = {
      recipient: {
        type: 'email',
        identity: 'test@example.com',
        hashed: false
      },
      badge: 'https://example.com/badges/test-badge',
      issuedOn: '2023-01-01T00:00:00Z'
    };

    it('should create assertion successfully with valid credentialSchema', async () => {
      const validSchema = {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          '@context': { type: 'array' },
          id: { type: 'string' },
          type: { type: 'array' },
          issuer: { type: 'object' },
          issuanceDate: { type: 'string' },
          credentialSubject: { type: 'object' }
        },
        required: ['@context', 'id', 'type', 'issuer', 'issuanceDate', 'credentialSubject']
      };

      const assertionData = {
        ...baseAssertionData,
        credentialSchema: [{
          id: 'https://example.com/valid-schema.json',
          type: '1EdTechJsonSchemaValidator2019'
        }]
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(validSchema)
      });

      const mockCreatedAssertion = Assertion.create({
        id: 'https://example.com/assertions/123',
        badgeClass: assertionData.badge,
        recipient: assertionData.recipient,
        issuedOn: assertionData.issuedOn,
        credentialSchema: assertionData.credentialSchema
      });

      mockAssertionRepository.create = vi.fn().mockResolvedValue(mockCreatedAssertion);

      const result = await controller.createAssertion(assertionData, BadgeVersion.V3, false);

      expect(result).toBeDefined();
      expect(mockAssertionRepository.create).toHaveBeenCalled();
      expect(global.fetch).toHaveBeenCalledWith('https://example.com/valid-schema.json');
    });

    it('should reject assertion with unsupported schema type', async () => {
      const assertionData = {
        ...baseAssertionData,
        credentialSchema: [{
          id: 'https://example.com/schema.json',
          type: 'UnsupportedSchemaType'
        }]
      };

      await expect(controller.createAssertion(assertionData, BadgeVersion.V3, false))
        .rejects.toThrow(BadRequestError);
    });

    it('should reject assertion when schema fetch fails', async () => {
      const assertionData = {
        ...baseAssertionData,
        credentialSchema: [{
          id: 'https://example.com/nonexistent-schema.json',
          type: '1EdTechJsonSchemaValidator2019'
        }]
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      await expect(controller.createAssertion(assertionData, BadgeVersion.V3, false))
        .rejects.toThrow(BadRequestError);

      try {
        await controller.createAssertion(assertionData, BadgeVersion.V3, false);
      } catch (error) {
        expect(error.message).toContain('Credential schema validation failed');
        expect(error.message).toContain('Failed to fetch schema');
      }
    });

    it('should reject assertion when credential does not match schema', async () => {
      const strictSchema = {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          '@context': { type: 'array' },
          id: { type: 'string' },
          type: { type: 'array' },
          issuer: { type: 'object' },
          issuanceDate: { type: 'string' },
          credentialSubject: {
            type: 'object',
            properties: {
              requiredCustomField: { type: 'string' }
            },
            required: ['requiredCustomField']
          }
        },
        required: ['@context', 'id', 'type', 'issuer', 'issuanceDate', 'credentialSubject']
      };

      const assertionData = {
        ...baseAssertionData,
        credentialSchema: [{
          id: 'https://example.com/strict-schema.json',
          type: '1EdTechJsonSchemaValidator2019'
        }]
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(strictSchema)
      });

      await expect(controller.createAssertion(assertionData, BadgeVersion.V3, false))
        .rejects.toThrow(BadRequestError);

      try {
        await controller.createAssertion(assertionData, BadgeVersion.V3, false);
      } catch (error) {
        expect(error.message).toContain('Credential schema validation failed');
        expect(error.message).toContain('validation failed');
      }
    });

    it('should reject assertion with invalid schema format', async () => {
      const invalidSchema = {
        this: 'is not a valid JSON schema',
        missing: 'required properties'
      };

      const assertionData = {
        ...baseAssertionData,
        credentialSchema: [{
          id: 'https://example.com/invalid-schema.json',
          type: '1EdTechJsonSchemaValidator2019'
        }]
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(invalidSchema)
      });

      await expect(controller.createAssertion(assertionData, BadgeVersion.V3, false))
        .rejects.toThrow(BadRequestError);

      try {
        await controller.createAssertion(assertionData, BadgeVersion.V3, false);
      } catch (error) {
        expect(error.message).toContain('Credential schema validation failed');
      }
    });

    it('should reject assertion when custom validation rules fail', async () => {
      const validSchema = {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          '@context': { type: 'array' },
          id: { type: 'string' },
          type: { type: 'array' },
          issuer: { type: 'object' },
          issuanceDate: { type: 'string' },
          credentialSubject: { type: 'object' }
        }
      };

      // Create assertion with future issuance date (should fail custom validation)
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const assertionData = {
        ...baseAssertionData,
        issuedOn: futureDate.toISOString(),
        credentialSchema: [{
          id: 'https://example.com/schema.json',
          type: '1EdTechJsonSchemaValidator2019'
        }]
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(validSchema)
      });

      await expect(controller.createAssertion(assertionData, BadgeVersion.V3, false))
        .rejects.toThrow(BadRequestError);

      try {
        await controller.createAssertion(assertionData, BadgeVersion.V3, false);
      } catch (error) {
        expect(error.message).toContain('Credential schema validation failed');
        expect(error.message).toContain('issuanceDate cannot be in the future');
      }
    });

    it('should handle schema validation timeout', async () => {
      const assertionData = {
        ...baseAssertionData,
        credentialSchema: [{
          id: 'https://example.com/slow-schema.json',
          type: '1EdTechJsonSchemaValidator2019'
        }]
      };

      // Mock fetch to never resolve (simulate timeout)
      (global.fetch as any).mockImplementation(() => new Promise(() => {}));

      await expect(controller.createAssertion(assertionData, BadgeVersion.V3, false))
        .rejects.toThrow(BadRequestError);

      try {
        await controller.createAssertion(assertionData, BadgeVersion.V3, false);
      } catch (error) {
        expect(error.message).toContain('Credential schema validation failed');
      }
    });
  });

  describe('updateAssertion with credentialSchema', () => {
    const existingAssertion = Assertion.create({
      id: 'https://example.com/assertions/123',
      badgeClass: 'https://example.com/badges/test-badge',
      recipient: {
        type: 'email',
        identity: 'test@example.com',
        hashed: false
      },
      issuedOn: '2023-01-01T00:00:00Z'
    });

    it('should update assertion successfully with valid credentialSchema', async () => {
      const validSchema = {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          '@context': { type: 'array' },
          id: { type: 'string' },
          type: { type: 'array' },
          issuer: { type: 'object' },
          issuanceDate: { type: 'string' },
          credentialSubject: { type: 'object' }
        }
      };

      const updateData = {
        credentialSchema: [{
          id: 'https://example.com/valid-schema.json',
          type: '1EdTechJsonSchemaValidator2019'
        }]
      };

      mockAssertionRepository.findById = vi.fn().mockResolvedValue(existingAssertion);
      mockAssertionRepository.update = vi.fn().mockResolvedValue({
        ...existingAssertion,
        ...updateData
      });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(validSchema)
      });

      const result = await controller.updateAssertion(
        'https://example.com/assertions/123',
        updateData,
        BadgeVersion.V3
      );

      expect(result).toBeDefined();
      expect(mockAssertionRepository.update).toHaveBeenCalled();
    });

    it('should reject update when credentialSchema validation fails', async () => {
      const strictSchema = {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          '@context': { type: 'array' },
          id: { type: 'string' },
          type: { type: 'array' },
          issuer: { type: 'object' },
          issuanceDate: { type: 'string' },
          credentialSubject: {
            type: 'object',
            properties: {
              requiredField: { type: 'string' }
            },
            required: ['requiredField']
          }
        },
        required: ['@context', 'id', 'type', 'issuer', 'issuanceDate', 'credentialSubject']
      };

      const updateData = {
        credentialSchema: [{
          id: 'https://example.com/strict-schema.json',
          type: '1EdTechJsonSchemaValidator2019'
        }]
      };

      mockAssertionRepository.findById = vi.fn().mockResolvedValue(existingAssertion);

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(strictSchema)
      });

      await expect(controller.updateAssertion(
        'https://example.com/assertions/123',
        updateData,
        BadgeVersion.V3
      )).rejects.toThrow(BadRequestError);
    });
  });
});
