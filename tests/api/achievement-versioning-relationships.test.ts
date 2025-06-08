/**
 * API tests for achievement versioning and relationship endpoints
 *
 * This file contains tests for the new OB 3.0 versioning and relationship
 * features including related achievements and endorsements.
 */

import { describe, expect, it, mock, beforeEach } from 'bun:test';
import { BadgeClassController } from '@/api/controllers/badgeClass.controller';
import { BadgeClassRepository } from '@/domains/badgeClass/badgeClass.repository';
import { IssuerRepository } from '@/domains/issuer/issuer.repository';
import { BadgeClass, Related, EndorsementCredential } from '@/domains/badgeClass/badgeClass.entity';
import { Shared } from 'openbadges-types';
import { BadgeVersion } from '@/utils/version/badge-version';
import { UserPermission } from '@/domains/user/user.entity';

describe('Achievement Versioning and Relationships API', () => {
  let controller: BadgeClassController;
  let mockBadgeClassRepository: Partial<BadgeClassRepository>;
  let mockIssuerRepository: Partial<IssuerRepository>;

  // Test data
  const testAchievement = BadgeClass.create({
    id: 'urn:uuid:achievement-1' as Shared.IRI,
    issuer: 'urn:uuid:issuer-1' as Shared.IRI,
    name: 'Test Achievement',
    description: 'A test achievement',
    image: 'https://example.com/badge.png' as Shared.IRI,
    criteria: { narrative: 'Complete the test' },
  });

  const relatedAchievement = BadgeClass.create({
    id: 'urn:uuid:achievement-2' as Shared.IRI,
    issuer: 'urn:uuid:issuer-1' as Shared.IRI,
    name: 'Related Achievement',
    description: 'A related achievement',
    image: 'https://example.com/related-badge.png' as Shared.IRI,
    criteria: { narrative: 'Complete the related test' },
  });

  const testUser = {
    claims: {
      sub: 'test-user-id',
      permissions: [UserPermission.UPDATE_BADGE_CLASS],
    },
  };

  const relatedData: Related = {
    id: relatedAchievement.id,
    type: ['Related'],
    inLanguage: 'en-US',
    version: '1.0',
  };

  const endorsementCredential: EndorsementCredential = {
    '@context': [
      'https://www.w3.org/2018/credentials/v1',
      'https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json',
    ],
    id: 'urn:uuid:endorsement-1' as Shared.IRI,
    type: ['VerifiableCredential', 'EndorsementCredential'],
    issuer: 'urn:uuid:endorser-1' as Shared.IRI,
    validFrom: '2023-01-01T00:00:00Z',
    credentialSubject: {
      id: testAchievement.id,
      type: ['Achievement'],
      endorsementComment: 'This is an excellent achievement program.',
    },
  };

  beforeEach(() => {
    // Create mock repositories
    mockBadgeClassRepository = {
      findById: mock(),
      update: mock(),
      create: mock(),
      delete: mock(),
      findAll: mock(),
      findByIssuer: mock(),
    };

    mockIssuerRepository = {
      findById: mock(),
      update: mock(),
      create: mock(),
      delete: mock(),
      findAll: mock(),
    };

    controller = new BadgeClassController(
      mockBadgeClassRepository as BadgeClassRepository,
      mockIssuerRepository as IssuerRepository
    );
  });

  describe('Related Achievements API', () => {
    describe('getRelatedAchievements', () => {
      it('should return related achievements', async () => {
        const achievementWithRelated = BadgeClass.create({
          id: testAchievement.id,
          issuer: testAchievement.issuer,
          name: testAchievement.name,
          description: testAchievement.description,
          image: testAchievement.image,
          criteria: testAchievement.criteria,
          related: [relatedData],
        });

        // Mock repository to return achievements
        (mockBadgeClassRepository.findById as ReturnType<typeof mock>)
          .mockResolvedValueOnce(achievementWithRelated)
          .mockResolvedValueOnce(relatedAchievement);

        const result = await controller.getRelatedAchievements(
          testAchievement.id,
          BadgeVersion.V3
        );

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe(relatedAchievement.id);
        expect(result[0].type).toEqual(['Achievement']);
      });

      it('should return empty array when no related achievements exist', async () => {
        (mockBadgeClassRepository.findById as ReturnType<typeof mock>).mockResolvedValueOnce(
          testAchievement
        );

        const result = await controller.getRelatedAchievements(
          testAchievement.id
        );

        expect(result).toHaveLength(0);
      });

      it('should return empty array when achievement does not exist', async () => {
        (mockBadgeClassRepository.findById as ReturnType<typeof mock>).mockResolvedValueOnce(null);

        const result = await controller.getRelatedAchievements(
          'urn:uuid:non-existent' as Shared.IRI
        );

        expect(result).toHaveLength(0);
      });
    });

    describe('addRelatedAchievement', () => {
      it('should add a related achievement successfully', async () => {
        // Mock validation to pass
        (mockBadgeClassRepository.findById as ReturnType<typeof mock>)
          .mockResolvedValueOnce(relatedAchievement) // Related achievement exists
          .mockResolvedValueOnce(testAchievement) // Source achievement for graph building
          .mockResolvedValueOnce(testAchievement) // Get existing achievement
          .mockResolvedValueOnce(testAchievement); // For graph traversal

        const updatedAchievement = BadgeClass.create({
          id: testAchievement.id,
          issuer: testAchievement.issuer,
          name: testAchievement.name,
          description: testAchievement.description,
          image: testAchievement.image,
          criteria: testAchievement.criteria,
          related: [relatedData],
        });

        (mockBadgeClassRepository.update as ReturnType<typeof mock>).mockResolvedValueOnce(
          updatedAchievement
        );

        const result = await controller.addRelatedAchievement(
          testAchievement.id,
          relatedData,
          BadgeVersion.V3,
          testUser
        );

        expect(result).toBeDefined();
        expect(result?.related).toHaveLength(1);
        expect(result?.related?.[0]).toEqual(relatedData);
      });

      it('should reject request without proper permissions', async () => {
        const unauthorizedUser = {
          claims: {
            sub: 'test-user-id',
            permissions: [], // No UPDATE_BADGE_CLASS permission
          },
        };

        await expect(
          controller.addRelatedAchievement(
            testAchievement.id,
            relatedData,
            BadgeVersion.V3,
            unauthorizedUser
          )
        ).rejects.toThrow('Insufficient permissions');
      });

      it('should return null when achievement does not exist', async () => {
        // Mock validation to pass but achievement not found
        (mockBadgeClassRepository.findById as ReturnType<typeof mock>)
          .mockResolvedValueOnce(relatedAchievement) // Related achievement exists
          .mockResolvedValueOnce(testAchievement) // Source achievement for graph building
          .mockResolvedValueOnce(null); // Achievement not found

        const result = await controller.addRelatedAchievement(
          testAchievement.id,
          relatedData,
          BadgeVersion.V3,
          testUser
        );

        expect(result).toBeNull();
      });
    });

    describe('removeRelatedAchievement', () => {
      it('should remove a related achievement successfully', async () => {
        const achievementWithRelated = BadgeClass.create({
          id: testAchievement.id,
          issuer: testAchievement.issuer,
          name: testAchievement.name,
          description: testAchievement.description,
          image: testAchievement.image,
          criteria: testAchievement.criteria,
          related: [relatedData],
        });

        const updatedAchievement = BadgeClass.create({
          id: testAchievement.id,
          issuer: testAchievement.issuer,
          name: testAchievement.name,
          description: testAchievement.description,
          image: testAchievement.image,
          criteria: testAchievement.criteria,
          related: [],
        });

        (mockBadgeClassRepository.findById as ReturnType<typeof mock>).mockResolvedValueOnce(
          achievementWithRelated
        );
        (mockBadgeClassRepository.update as ReturnType<typeof mock>).mockResolvedValueOnce(
          updatedAchievement
        );

        const result = await controller.removeRelatedAchievement(
          testAchievement.id,
          relatedAchievement.id,
          BadgeVersion.V3,
          testUser
        );

        expect(result).toBeDefined();
        expect(result?.related).toHaveLength(0);
      });

      it('should reject request without proper permissions', async () => {
        const unauthorizedUser = {
          claims: {
            sub: 'test-user-id',
            permissions: [], // No UPDATE_BADGE_CLASS permission
          },
        };

        await expect(
          controller.removeRelatedAchievement(
            testAchievement.id,
            relatedAchievement.id,
            BadgeVersion.V3,
            unauthorizedUser
          )
        ).rejects.toThrow('Insufficient permissions');
      });

      it('should return null when achievement does not exist', async () => {
        (mockBadgeClassRepository.findById as ReturnType<typeof mock>).mockResolvedValueOnce(null);

        const result = await controller.removeRelatedAchievement(
          testAchievement.id,
          relatedAchievement.id,
          BadgeVersion.V3,
          testUser
        );

        expect(result).toBeNull();
      });
    });
  });

  describe('Endorsements API', () => {
    describe('getEndorsements', () => {
      it('should return endorsements for an achievement', async () => {
        const achievementWithEndorsement = BadgeClass.create({
          id: testAchievement.id,
          issuer: testAchievement.issuer,
          name: testAchievement.name,
          description: testAchievement.description,
          image: testAchievement.image,
          criteria: testAchievement.criteria,
          endorsement: [endorsementCredential],
        });

        (mockBadgeClassRepository.findById as ReturnType<typeof mock>).mockResolvedValueOnce(
          achievementWithEndorsement
        );

        const result = await controller.getEndorsements(testAchievement.id);

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual(endorsementCredential);
      });

      it('should return empty array when no endorsements exist', async () => {
        (mockBadgeClassRepository.findById as ReturnType<typeof mock>).mockResolvedValueOnce(
          testAchievement
        );

        const result = await controller.getEndorsements(testAchievement.id);

        expect(result).toHaveLength(0);
      });

      it('should return empty array when achievement does not exist', async () => {
        (mockBadgeClassRepository.findById as ReturnType<typeof mock>).mockResolvedValueOnce(null);

        const result = await controller.getEndorsements(
          'urn:uuid:non-existent'
        );

        expect(result).toHaveLength(0);
      });
    });

    describe('addEndorsement', () => {
      it('should add an endorsement successfully', async () => {
        const updatedAchievement = BadgeClass.create({
          id: testAchievement.id,
          issuer: testAchievement.issuer,
          name: testAchievement.name,
          description: testAchievement.description,
          image: testAchievement.image,
          criteria: testAchievement.criteria,
          endorsement: [endorsementCredential],
        });

        (mockBadgeClassRepository.findById as ReturnType<typeof mock>).mockResolvedValueOnce(
          testAchievement
        );
        (mockBadgeClassRepository.update as ReturnType<typeof mock>).mockResolvedValueOnce(
          updatedAchievement
        );

        const result = await controller.addEndorsement(
          testAchievement.id,
          endorsementCredential,
          testUser
        );

        expect(result).toBeDefined();
        expect(result?.endorsement).toHaveLength(1);
        expect(result?.endorsement?.[0]).toEqual(endorsementCredential);
      });

      it('should reject request without proper permissions', async () => {
        const unauthorizedUser = {
          claims: {
            sub: 'test-user-id',
            permissions: [], // No UPDATE_BADGE_CLASS permission
          },
        };

        await expect(
          controller.addEndorsement(
            testAchievement.id,
            endorsementCredential,
            unauthorizedUser
          )
        ).rejects.toThrow('Insufficient permissions');
      });

      it('should return null when achievement does not exist', async () => {
        (mockBadgeClassRepository.findById as ReturnType<typeof mock>).mockResolvedValueOnce(null);

        const result = await controller.addEndorsement(
          testAchievement.id,
          endorsementCredential,
          testUser
        );

        expect(result).toBeNull();
      });
    });
  });
});
