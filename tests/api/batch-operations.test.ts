/**
 * Unit tests for batch operations
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { mock } from 'bun:test';
import { toIRI } from '../../src/utils/types/iri-utils';
import { toDateTime } from '../../src/utils/types/type-utils';

// Type definitions for test data
type TestRecipient = {
  identity: string;
  type: string;
  hashed: boolean;
};

type TestCreateAssertionDto = {
  recipient: TestRecipient;
  badge: string;
  issuedOn: string;
  evidence: Array<{ id: string }>;
};
import { AssertionController } from '../../src/api/controllers/assertion.controller';
import { AssertionRepository } from '../../src/domains/assertion/assertion.repository';
import { BadgeClassRepository } from '../../src/domains/badgeClass/badgeClass.repository';
import { Assertion } from '../../src/domains/assertion/assertion.entity';
import { BadgeClass } from '../../src/domains/badgeClass/badgeClass.entity';
import { BadgeVersion } from '../../src/utils/version/badge-version';
import {
  BatchCreateCredentialsDto,
  BatchRetrieveCredentialsDto,
  BatchUpdateCredentialStatusDto,
} from '../../src/api/dtos';

// Mock dependencies
const mockAssertionRepository: Partial<AssertionRepository> = {
  createBatch: mock(),
  findByIds: mock(),
  updateStatusBatch: mock(),
  findById: mock(),
};

const mockBadgeClassRepository: Partial<BadgeClassRepository> = {
  findById: mock(),
};

describe('Batch Operations Unit Tests', () => {
  let assertionController: AssertionController;

  beforeEach(() => {
    // Reset all mocks
    Object.values(mockAssertionRepository).forEach((mockFn) => {
      if (typeof mockFn === 'function' && 'mockReset' in mockFn) {
        (mockFn as unknown as { mockReset: () => void }).mockReset();
      }
    });
    Object.values(mockBadgeClassRepository).forEach((mockFn) => {
      if (typeof mockFn === 'function' && 'mockReset' in mockFn) {
        (mockFn as unknown as { mockReset: () => void }).mockReset();
      }
    });

    // Create controller with mocked dependencies
    assertionController = new AssertionController(
      mockAssertionRepository as AssertionRepository,
      mockBadgeClassRepository as BadgeClassRepository,
      null as unknown as never // issuerRepository - not needed for these tests
    );

    // Mock the getAssertionById method
    assertionController.getAssertionById = mock(async () => ({
      '@context': 'https://www.w3.org/2018/credentials/v1',
      type: ['VerifiableCredential', 'OpenBadgeCredential'],
      id: toIRI('test-id'),
      issuer: toIRI('test-issuer'),
      issuanceDate: toDateTime('2023-01-01T00:00:00Z'),
      credentialSubject: {
        id: toIRI('test-recipient'),
        achievement: {
          id: toIRI('test-badge-class'),
          type: 'Achievement',
          name: 'Test Badge',
        },
      },
    }));
  });

  describe('createAssertionsBatch', () => {
    it('should successfully create multiple assertions', async () => {
      // Arrange
      const batchData: BatchCreateCredentialsDto = {
        credentials: [
          {
            recipient: {
              identity: 'user1@example.com',
              type: 'email',
              hashed: false,
            },
            badge: 'badge-class-1',
            issuedOn: new Date().toISOString(),
            evidence: [{ id: 'evidence-1' }],
          },
          {
            recipient: {
              identity: 'user2@example.com',
              type: 'email',
              hashed: false,
            },
            badge: 'badge-class-1',
            issuedOn: new Date().toISOString(),
            evidence: [{ id: 'evidence-2' }],
          },
        ] as TestCreateAssertionDto[],
      };

      const mockBadgeClass = BadgeClass.create({
        name: 'Test Badge',
        description: 'Test Description',
        image: toIRI('test-image.png'),
        criteria: { narrative: 'Test criteria' },
        issuer: toIRI('test-issuer'),
      });

      const mockAssertions = [
        Assertion.create({
          recipient: {
            identity: 'user1@example.com',
            type: 'email',
            hashed: false,
          },
          badgeClass: toIRI('badge-class-1'),
          evidence: [{ id: toIRI('evidence-1') }],
        }),
        Assertion.create({
          recipient: {
            identity: 'user2@example.com',
            type: 'email',
            hashed: false,
          },
          badgeClass: toIRI('badge-class-1'),
          evidence: [{ id: toIRI('evidence-2') }],
        }),
      ];

      // Mock repository responses
      (mockBadgeClassRepository.findById as unknown as { mockResolvedValue: (value: unknown) => void }).mockResolvedValue(
        mockBadgeClass
      );
      (mockAssertionRepository.createBatch as unknown as { mockResolvedValue: (value: unknown) => void }).mockResolvedValue([
        { success: true, assertion: mockAssertions[0] },
        { success: true, assertion: mockAssertions[1] },
      ]);

      // Act
      const result = await assertionController.createAssertionsBatch(
        batchData,
        BadgeVersion.V3,
        false // Don't sign for testing
      );

      // Assert
      expect(result.summary.total).toBe(2);
      expect(result.summary.successful).toBe(2);
      expect(result.summary.failed).toBe(0);
      expect(result.results).toHaveLength(2);
      expect(result.results[0].success).toBe(true);
      expect(result.results[1].success).toBe(true);
    });

    it('should handle partial failures in batch creation', async () => {
      // Arrange
      const batchData: BatchCreateCredentialsDto = {
        credentials: [
          {
            recipient: {
              identity: 'user1@example.com',
              type: 'email',
              hashed: false,
            },
            badge: 'badge-class-1',
            issuedOn: new Date().toISOString(),
            evidence: [{ id: 'evidence-1' }],
          },
          {
            recipient: {
              identity: 'user2@example.com',
              type: 'email',
              hashed: false,
            },
            badge: 'nonexistent-badge-class',
            issuedOn: new Date().toISOString(),
            evidence: [{ id: 'evidence-2' }],
          },
        ] as TestCreateAssertionDto[],
      };

      const mockBadgeClass = BadgeClass.create({
        name: 'Test Badge',
        description: 'Test Description',
        image: toIRI('test-image.png'),
        criteria: { narrative: 'Test criteria' },
        issuer: toIRI('test-issuer'),
      });

      const mockAssertion = Assertion.create({
        recipient: {
          identity: 'user1@example.com',
          type: 'email',
          hashed: false,
        },
        badgeClass: toIRI('badge-class-1'),
        evidence: [{ id: toIRI('evidence-1') }],
      });

      // Mock repository responses
      (mockBadgeClassRepository.findById as unknown as { mockResolvedValueOnce: (value: unknown) => { mockResolvedValueOnce: (value: unknown) => void } })
        .mockResolvedValueOnce(mockBadgeClass)
        .mockResolvedValueOnce(null); // Second badge class doesn't exist

      (mockAssertionRepository.createBatch as unknown as { mockResolvedValue: (value: unknown) => void }).mockResolvedValue([
        { success: true, assertion: mockAssertion },
      ]);

      // Act
      const result = await assertionController.createAssertionsBatch(
        batchData,
        BadgeVersion.V3,
        false
      );

      // Assert
      expect(result.summary.total).toBe(2);
      expect(result.summary.successful).toBe(1);
      expect(result.summary.failed).toBe(1);
      expect(result.results[0].success).toBe(true);
      expect(result.results[1].success).toBe(false);
      expect(result.results[1].error).toContain('does not exist');
    });

    it('should handle empty batch gracefully', async () => {
      // Arrange
      const batchData: BatchCreateCredentialsDto = {
        credentials: [],
      };

      // Act
      const result = await assertionController.createAssertionsBatch(
        batchData,
        BadgeVersion.V3,
        false
      );

      // Assert
      expect(result.summary.total).toBe(0);
      expect(result.summary.successful).toBe(0);
      expect(result.summary.failed).toBe(0);
      expect(result.results).toHaveLength(0);
    });
  });

  describe('getAssertionsBatch', () => {
    it('should successfully retrieve multiple assertions', async () => {
      // Arrange
      const batchData: BatchRetrieveCredentialsDto = {
        ids: ['assertion-1', 'assertion-2'],
      };

      const mockAssertions = [
        Assertion.create({
          recipient: {
            identity: 'user1@example.com',
            type: 'email',
            hashed: false,
          },
          badgeClass: toIRI('badge-class-1'),
          evidence: [{ id: toIRI('evidence-1') }],
        }),
        Assertion.create({
          recipient: {
            identity: 'user2@example.com',
            type: 'email',
            hashed: false,
          },
          badgeClass: toIRI('badge-class-1'),
          evidence: [{ id: toIRI('evidence-2') }],
        }),
      ];

      // Mock repository response
      (mockAssertionRepository.findByIds as unknown as { mockResolvedValue: (value: unknown) => void }).mockResolvedValue(
        mockAssertions
      );

      // Act
      const result = await assertionController.getAssertionsBatch(
        batchData,
        BadgeVersion.V3
      );

      // Assert
      expect(result.summary.total).toBe(2);
      expect(result.summary.successful).toBe(2);
      expect(result.summary.failed).toBe(0);
      expect(result.results).toHaveLength(2);
      expect(result.results[0].success).toBe(true);
      expect(result.results[1].success).toBe(true);
    });

    it('should handle missing assertions gracefully', async () => {
      // Arrange
      const batchData: BatchRetrieveCredentialsDto = {
        ids: ['assertion-1', 'nonexistent-assertion'],
      };

      const mockAssertion = Assertion.create({
        recipient: {
          identity: 'user1@example.com',
          type: 'email',
          hashed: false,
        },
        badgeClass: toIRI('badge-class-1'),
        evidence: [{ id: toIRI('evidence-1') }],
      });

      // Mock repository response (second assertion is null)
      (mockAssertionRepository.findByIds as unknown as { mockResolvedValue: (value: unknown) => void }).mockResolvedValue([
        mockAssertion,
        null,
      ]);

      // Act
      const result = await assertionController.getAssertionsBatch(
        batchData,
        BadgeVersion.V3
      );

      // Assert
      expect(result.summary.total).toBe(2);
      expect(result.summary.successful).toBe(1);
      expect(result.summary.failed).toBe(1);
      expect(result.results[0].success).toBe(true);
      expect(result.results[1].success).toBe(false);
      expect(result.results[1].error).toBe('Assertion not found');
    });
  });

  describe('updateAssertionStatusBatch', () => {
    it('should successfully update multiple assertion statuses', async () => {
      // Arrange
      const batchData: BatchUpdateCredentialStatusDto = {
        updates: [
          { id: 'assertion-1', status: 'revoked', reason: 'Test revocation' },
          { id: 'assertion-2', status: 'active' },
        ],
      };

      const mockUpdatedAssertions = [
        Assertion.create({
          recipient: {
            identity: 'user1@example.com',
            type: 'email',
            hashed: false,
          },
          badgeClass: toIRI('badge-class-1'),
          evidence: [{ id: toIRI('evidence-1') }],
          revoked: true,
          revocationReason: 'Test revocation',
        }),
        Assertion.create({
          recipient: {
            identity: 'user2@example.com',
            type: 'email',
            hashed: false,
          },
          badgeClass: toIRI('badge-class-1'),
          evidence: [{ id: toIRI('evidence-2') }],
          revoked: false,
        }),
      ];

      // Mock repository response
      (mockAssertionRepository.updateStatusBatch as unknown as { mockResolvedValue: (value: unknown) => void }).mockResolvedValue([
        {
          id: 'assertion-1',
          success: true,
          assertion: mockUpdatedAssertions[0],
        },
        {
          id: 'assertion-2',
          success: true,
          assertion: mockUpdatedAssertions[1],
        },
      ]);

      // Act
      const result = await assertionController.updateAssertionStatusBatch(
        batchData,
        BadgeVersion.V3
      );

      // Assert
      expect(result.summary.total).toBe(2);
      expect(result.summary.successful).toBe(2);
      expect(result.summary.failed).toBe(0);
      expect(result.results).toHaveLength(2);
      expect(result.results[0].success).toBe(true);
      expect(result.results[1].success).toBe(true);
    });

    it('should handle update failures gracefully', async () => {
      // Arrange
      const batchData: BatchUpdateCredentialStatusDto = {
        updates: [
          { id: 'assertion-1', status: 'revoked' },
          { id: 'nonexistent-assertion', status: 'active' },
        ],
      };

      const mockUpdatedAssertion = Assertion.create({
        recipient: {
          identity: 'user1@example.com',
          type: 'email',
          hashed: false,
        },
        badgeClass: toIRI('badge-class-1'),
        evidence: [{ id: toIRI('evidence-1') }],
        revoked: true,
      });

      // Mock repository response
      (mockAssertionRepository.updateStatusBatch as unknown as { mockResolvedValue: (value: unknown) => void }).mockResolvedValue([
        { id: 'assertion-1', success: true, assertion: mockUpdatedAssertion },
        {
          id: 'nonexistent-assertion',
          success: false,
          error: 'Assertion not found',
        },
      ]);

      // Act
      const result = await assertionController.updateAssertionStatusBatch(
        batchData,
        BadgeVersion.V3
      );

      // Assert
      expect(result.summary.total).toBe(2);
      expect(result.summary.successful).toBe(1);
      expect(result.summary.failed).toBe(1);
      expect(result.results[0].success).toBe(true);
      expect(result.results[1].success).toBe(false);
      expect(result.results[1].error).toBe('Assertion not found');
    });
  });
});
