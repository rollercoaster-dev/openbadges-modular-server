/**
 * Unit tests for batch operations
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { Shared, OB2 } from 'openbadges-types';
import { AssertionController } from '../../src/api/controllers/assertion.controller';
import { AssertionRepository } from '../../src/domains/assertion/assertion.repository';
import { BadgeClassRepository } from '../../src/domains/badgeClass/badgeClass.repository';
import { IssuerRepository } from '../../src/domains/issuer/issuer.repository';
import { Assertion } from '../../src/domains/assertion/assertion.entity';
import { BadgeClass } from '../../src/domains/badgeClass/badgeClass.entity';
import { BadgeVersion } from '../../src/utils/version/badge-version';
import {
  BatchCreateCredentialsDto,
  BatchRetrieveCredentialsDto,
  BatchUpdateCredentialStatusDto,
  CreateAssertionDto,
} from '../../src/api/dtos';
import { StatusPurpose } from '../../src/domains/status-list/status-list.types';

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

const mockIssuerRepository: Partial<IssuerRepository> = {
  findById: mock(),
};

describe('Batch Operations Unit Tests', () => {
  let assertionController: AssertionController;

  beforeEach(() => {
    // Reset all mocks
    Object.values(mockAssertionRepository).forEach((mockFn) => {
      if (typeof mockFn === 'function' && 'mockReset' in mockFn) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (mockFn as any).mockReset();
      }
    });
    Object.values(mockBadgeClassRepository).forEach((mockFn) => {
      if (typeof mockFn === 'function' && 'mockReset' in mockFn) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (mockFn as any).mockReset();
      }
    });

    // Create controller with mocked dependencies
    assertionController = new AssertionController(
      mockAssertionRepository as AssertionRepository,
      mockBadgeClassRepository as BadgeClassRepository,
      mockIssuerRepository as IssuerRepository
    );

    // Mock the getAssertionById method
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (assertionController as any).getAssertionById = mock().mockResolvedValue({
      '@context': 'https://www.w3.org/2018/credentials/v1',
      type: ['VerifiableCredential', 'OpenBadgeCredential'],
      id: 'test-id',
      issuer: 'test-issuer',
      issuanceDate: '2023-01-01T00:00:00Z',
      credentialSubject: {
        id: 'test-recipient',
        achievement: {
          id: 'test-badge-class',
          type: 'Achievement',
          name: 'Test Badge',
        },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
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
            issuedOn: '2023-01-01T00:00:00Z',
            evidence: [{ id: 'evidence-1' }],
          },
          {
            recipient: {
              identity: 'user2@example.com',
              type: 'email',
              hashed: false,
            },
            badge: 'badge-class-1',
            issuedOn: '2023-01-01T00:00:00Z',
            evidence: [{ id: 'evidence-2' }],
          },
        ] as CreateAssertionDto[],
      };

      const mockBadgeClass = BadgeClass.create({
        name: 'Test Badge',
        description: 'Test Description',
        image: 'test-image.png' as Shared.IRI,
        criteria: { narrative: 'Test criteria' },
        issuer: 'test-issuer' as Shared.IRI,
      });

      const mockAssertions = [
        Assertion.create({
          recipient: {
            identity: 'user1@example.com',
            type: 'email',
            hashed: false,
          } as OB2.IdentityObject,
          badgeClass: 'badge-class-1' as Shared.IRI,
          evidence: [{ id: 'evidence-1' as Shared.IRI }],
          issuer: 'test-issuer' as Shared.IRI,
        }),
        Assertion.create({
          recipient: {
            identity: 'user2@example.com',
            type: 'email',
            hashed: false,
          } as OB2.IdentityObject,
          badgeClass: 'badge-class-1' as Shared.IRI,
          evidence: [{ id: 'evidence-2' as Shared.IRI }],
          issuer: 'test-issuer' as Shared.IRI,
        }),
      ];

      // Mock repository responses
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockBadgeClassRepository.findById as any).mockResolvedValue(
        mockBadgeClass
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockAssertionRepository.createBatch as any).mockResolvedValue([
        { success: true, assertion: mockAssertions[0] },
        { success: true, assertion: mockAssertions[1] },
      ]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockAssertionRepository.findByIds as any).mockResolvedValue(
        mockAssertions
      );

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
            issuedOn: '2023-01-01T00:00:00Z',
            evidence: [{ id: 'evidence-1' }],
          },
          {
            recipient: {
              identity: 'user2@example.com',
              type: 'email',
              hashed: false,
            },
            badge: 'nonexistent-badge-class',
            issuedOn: '2023-01-01T00:00:00Z',
            evidence: [{ id: 'evidence-2' }],
          },
        ] as CreateAssertionDto[],
      };

      const mockBadgeClass = BadgeClass.create({
        name: 'Test Badge',
        description: 'Test Description',
        image: 'test-image.png' as Shared.IRI,
        criteria: { narrative: 'Test criteria' },
        issuer: 'test-issuer' as Shared.IRI,
      });

      const mockAssertion = Assertion.create({
        recipient: {
          identity: 'user1@example.com',
          type: 'email',
          hashed: false,
        } as OB2.IdentityObject,
        badgeClass: 'badge-class-1' as Shared.IRI,
        evidence: [{ id: 'evidence-1' as Shared.IRI }],
        issuer: 'test-issuer' as Shared.IRI,
      });

      // Mock repository responses
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockBadgeClassRepository.findById as any)
        .mockResolvedValueOnce(mockBadgeClass)
        .mockResolvedValueOnce(null); // Second badge class doesn't exist

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockAssertionRepository.createBatch as any).mockResolvedValue([
        { success: true, assertion: mockAssertion },
      ]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockAssertionRepository.findByIds as any).mockResolvedValue([
        mockAssertion,
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
      expect(result.results[1].error?.message).toContain('does not exist');
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
          } as OB2.IdentityObject,
          badgeClass: 'badge-class-1' as Shared.IRI,
          evidence: [{ id: 'evidence-1' as Shared.IRI }],
          issuer: 'test-issuer' as Shared.IRI,
        }),
        Assertion.create({
          recipient: {
            identity: 'user2@example.com',
            type: 'email',
            hashed: false,
          } as OB2.IdentityObject,
          badgeClass: 'badge-class-1' as Shared.IRI,
          evidence: [{ id: 'evidence-2' as Shared.IRI }],
          issuer: 'test-issuer' as Shared.IRI,
        }),
      ];

      // Mock repository response
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockAssertionRepository.findByIds as any).mockResolvedValue(
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
        } as OB2.IdentityObject,
        badgeClass: 'badge-class-1' as Shared.IRI,
        evidence: [{ id: 'evidence-1' as Shared.IRI }],
        issuer: 'test-issuer' as Shared.IRI,
      });

      // Mock repository response (second assertion is null)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockAssertionRepository.findByIds as any).mockResolvedValue([
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
      expect(result.results[1].error?.message).toBe('Assertion not found');
    });
  });

  describe('updateAssertionStatusBatch', () => {
    it('should successfully update multiple assertion statuses', async () => {
      // Arrange
      const batchData: BatchUpdateCredentialStatusDto = {
        updates: [
          {
            id: 'assertion-1',
            status: 'revoked',
            reason: 'Test revocation',
            purpose: StatusPurpose.REVOCATION,
          },
          {
            id: 'assertion-2',
            status: 'active',
            purpose: StatusPurpose.REVOCATION,
          },
        ],
      };

      const mockUpdatedAssertions = [
        Assertion.create({
          recipient: {
            identity: 'user1@example.com',
            type: 'email',
            hashed: false,
          } as OB2.IdentityObject,
          badgeClass: 'badge-class-1' as Shared.IRI,
          evidence: [{ id: 'evidence-1' as Shared.IRI }],
          revoked: true,
          revocationReason: 'Test revocation',
          issuer: 'test-issuer' as Shared.IRI,
        }),
        Assertion.create({
          recipient: {
            identity: 'user2@example.com',
            type: 'email',
            hashed: false,
          } as OB2.IdentityObject,
          badgeClass: 'badge-class-1' as Shared.IRI,
          evidence: [{ id: 'evidence-2' as Shared.IRI }],
          revoked: false,
          issuer: 'test-issuer' as Shared.IRI,
        }),
      ];

      // Mock repository response
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockAssertionRepository.updateStatusBatch as any).mockResolvedValue([
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
          {
            id: 'assertion-1',
            status: 'revoked',
            purpose: StatusPurpose.REVOCATION,
          },
          {
            id: 'nonexistent-assertion',
            status: 'active',
            purpose: StatusPurpose.REVOCATION,
          },
        ],
      };

      const mockUpdatedAssertion = Assertion.create({
        recipient: {
          identity: 'user1@example.com',
          type: 'email',
          hashed: false,
        } as OB2.IdentityObject,
        badgeClass: 'badge-class-1' as Shared.IRI,
        evidence: [{ id: 'evidence-1' as Shared.IRI }],
        revoked: true,
        issuer: 'test-issuer' as Shared.IRI,
      });

      // Mock repository response
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockAssertionRepository.updateStatusBatch as any).mockResolvedValue([
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
      expect(result.results[1].error.message).toBe('Assertion not found');
    });
  });
});
