/**
 * Unit tests for the AchievementRelationshipService
 *
 * This file contains tests for the AchievementRelationshipService to ensure
 * it correctly validates relationships and prevents circular dependencies.
 */

import { describe, expect, it, mock, beforeEach } from 'bun:test';
import { AchievementRelationshipService } from '@/services/achievement-relationship.service';
import { BadgeClass, Related } from '@/domains/badgeClass/badgeClass.entity';
import { BadgeClassRepository } from '@/domains/badgeClass/badgeClass.repository';
import { Shared } from 'openbadges-types';

describe('AchievementRelationshipService', () => {
  let service: AchievementRelationshipService;
  let mockRepository: BadgeClassRepository;

  // Test data
  const achievementA: BadgeClass = BadgeClass.create({
    id: 'urn:uuid:achievement-a' as Shared.IRI,
    issuer: 'urn:uuid:issuer-1' as Shared.IRI,
    name: 'Achievement A',
    description: 'First achievement',
    image: 'https://example.com/badge-a.png' as Shared.IRI,
    criteria: { narrative: 'Complete task A' },
  });

  const achievementB: BadgeClass = BadgeClass.create({
    id: 'urn:uuid:achievement-b' as Shared.IRI,
    issuer: 'urn:uuid:issuer-1' as Shared.IRI,
    name: 'Achievement B',
    description: 'Second achievement',
    image: 'https://example.com/badge-b.png' as Shared.IRI,
    criteria: { narrative: 'Complete task B' },
  });

  const achievementC: BadgeClass = BadgeClass.create({
    id: 'urn:uuid:achievement-c' as Shared.IRI,
    issuer: 'urn:uuid:issuer-1' as Shared.IRI,
    name: 'Achievement C',
    description: 'Third achievement',
    image: 'https://example.com/badge-c.png' as Shared.IRI,
    criteria: { narrative: 'Complete task C' },
  });

  beforeEach(() => {
    // Create mock repository
    mockRepository = {
      findById: mock(),
      update: mock(),
      create: mock(),
      delete: mock(),
      findAll: mock(),
      findByIssuer: mock(),
    } as BadgeClassRepository;

    service = new AchievementRelationshipService(mockRepository);
  });

  describe('validateRelationship', () => {
    it('should validate a valid relationship', async () => {
      // Mock repository to return achievements
      (mockRepository.findById as ReturnType<typeof mock>)
        .mockResolvedValueOnce(achievementB) // Related achievement exists
        .mockResolvedValueOnce(achievementA); // Source achievement for graph building

      const result = await service.validateRelationship(
        achievementA.id,
        achievementB.id
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject relationship when related achievement does not exist', async () => {
      // Mock repository to return null for non-existent achievement
      (
        mockRepository.findById as ReturnType<typeof mock>
      ).mockResolvedValueOnce(null);

      const result = await service.validateRelationship(
        achievementA.id,
        'urn:uuid:non-existent' as Shared.IRI
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Related achievement 'urn:uuid:non-existent' does not exist"
      );
    });

    it('should detect direct circular relationship', async () => {
      // Create achievement B that already relates to A
      const achievementBWithRelation = BadgeClass.create({
        id: achievementB.id,
        issuer: achievementB.issuer,
        name: achievementB.name,
        description: achievementB.description,
        image: achievementB.image,
        criteria: achievementB.criteria,
        related: [
          {
            id: achievementA.id,
            type: ['Related'],
          },
        ],
      });

      (
        mockRepository.findById as ReturnType<typeof mock>
      ).mockResolvedValueOnce(achievementBWithRelation);

      const result = await service.validateRelationship(
        achievementA.id,
        achievementB.id
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        `Circular relationship detected: ${achievementA.id} and ${achievementB.id} would reference each other`
      );
    });

    it('should handle repository errors gracefully', async () => {
      // Mock repository to throw an error
      (
        mockRepository.findById as ReturnType<typeof mock>
      ).mockRejectedValueOnce(new Error('Database error'));

      const result = await service.validateRelationship(
        achievementA.id,
        achievementB.id
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Internal error during relationship validation'
      );
    });
  });

  describe('validateVersionChain', () => {
    it('should validate a valid version chain', async () => {
      // Mock repository to return the previous version
      (
        mockRepository.findById as ReturnType<typeof mock>
      ).mockResolvedValueOnce(achievementA);

      const result = await service.validateVersionChain(
        achievementB.id,
        achievementA.id
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject version chain when previous version does not exist', async () => {
      // Mock repository to return null for non-existent achievement
      (
        mockRepository.findById as ReturnType<typeof mock>
      ).mockResolvedValueOnce(null);

      const result = await service.validateVersionChain(
        achievementB.id,
        'urn:uuid:non-existent' as Shared.IRI
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Previous version 'urn:uuid:non-existent' does not exist"
      );
    });

    it('should detect circular version chain', async () => {
      // Create a version chain: B -> A -> B (circular)
      const achievementAWithPrevious = BadgeClass.create({
        id: achievementA.id,
        issuer: achievementA.issuer,
        name: achievementA.name,
        description: achievementA.description,
        image: achievementA.image,
        criteria: achievementA.criteria,
        previousVersion: achievementB.id,
      });

      (mockRepository.findById as ReturnType<typeof mock>)
        .mockResolvedValueOnce(achievementA) // Previous version exists
        .mockResolvedValueOnce(achievementAWithPrevious) // For chain traversal
        .mockResolvedValueOnce(achievementB); // Chain continues

      const result = await service.validateVersionChain(
        achievementB.id,
        achievementA.id
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        `Circular version chain detected: ${achievementB.id} would create a cycle in version history`
      );
    });

    it('should handle repository errors gracefully', async () => {
      // Mock repository to throw an error
      (
        mockRepository.findById as ReturnType<typeof mock>
      ).mockRejectedValueOnce(new Error('Database error'));

      const result = await service.validateVersionChain(
        achievementB.id,
        achievementA.id
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Internal error during version chain validation'
      );
    });
  });

  describe('getVersionChain', () => {
    it('should return a simple version chain', async () => {
      // Create achievement B with previous version pointing to A
      const achievementBWithPrevious = BadgeClass.create({
        id: achievementB.id,
        issuer: achievementB.issuer,
        name: achievementB.name,
        description: achievementB.description,
        image: achievementB.image,
        criteria: achievementB.criteria,
        previousVersion: achievementA.id,
      });

      // Mock repository calls for version chain traversal
      (mockRepository.findById as ReturnType<typeof mock>)
        .mockResolvedValueOnce(achievementBWithPrevious) // Current achievement with previousVersion
        .mockResolvedValueOnce(achievementA); // Previous version

      const chain = await service.getVersionChain(achievementB.id);

      expect(chain.achievements).toHaveLength(2);
      expect(chain.achievements[0].id).toBe(achievementB.id);
      expect(chain.achievements[1].id).toBe(achievementA.id);
      expect(chain.hasCircularReference).toBe(false);
      expect(chain.depth).toBe(2);
    });

    it('should detect circular reference in version chain', async () => {
      // Create circular chain: B -> A -> B
      const achievementBWithPrevious = BadgeClass.create({
        id: achievementB.id,
        issuer: achievementB.issuer,
        name: achievementB.name,
        description: achievementB.description,
        image: achievementB.image,
        criteria: achievementB.criteria,
        previousVersion: achievementA.id,
      });
      const achievementAWithPrevious = BadgeClass.create({
        id: achievementA.id,
        issuer: achievementA.issuer,
        name: achievementA.name,
        description: achievementA.description,
        image: achievementA.image,
        criteria: achievementA.criteria,
        previousVersion: achievementB.id,
      });

      (mockRepository.findById as ReturnType<typeof mock>)
        .mockResolvedValueOnce(achievementBWithPrevious)
        .mockResolvedValueOnce(achievementAWithPrevious);

      const chain = await service.getVersionChain(achievementB.id);

      expect(chain.hasCircularReference).toBe(true);
      expect(chain.achievements).toHaveLength(2);
    });

    it('should handle missing achievements in chain', async () => {
      // Mock repository to return null for missing achievement
      (
        mockRepository.findById as ReturnType<typeof mock>
      ).mockResolvedValueOnce(null);

      const chain = await service.getVersionChain(
        'urn:uuid:non-existent' as Shared.IRI
      );

      expect(chain.achievements).toHaveLength(0);
      expect(chain.hasCircularReference).toBe(false);
      expect(chain.depth).toBe(0);
    });
  });

  describe('addRelatedAchievement', () => {
    it('should add a valid related achievement', async () => {
      const relatedData: Related = {
        id: achievementB.id,
        type: ['Related'],
        inLanguage: 'en-US',
      };

      // Mock validation to pass
      (mockRepository.findById as ReturnType<typeof mock>)
        .mockResolvedValueOnce(achievementB) // Related achievement exists
        .mockResolvedValueOnce(achievementA) // Source achievement for graph building
        .mockResolvedValueOnce(achievementA) // Get existing achievement
        .mockResolvedValueOnce(achievementA); // For graph traversal

      const updatedAchievement = BadgeClass.create({
        id: achievementA.id,
        issuer: achievementA.issuer,
        name: achievementA.name,
        description: achievementA.description,
        image: achievementA.image,
        criteria: achievementA.criteria,
        related: [relatedData],
      });

      (mockRepository.update as ReturnType<typeof mock>).mockResolvedValueOnce(
        updatedAchievement
      );

      const result = await service.addRelatedAchievement(
        achievementA.id,
        relatedData
      );

      expect(result).toBeDefined();
      expect(result?.related).toHaveLength(1);
      expect(result?.related?.[0]).toEqual(relatedData);
    });

    it('should reject invalid relationship', async () => {
      const relatedData: Related = {
        id: 'urn:uuid:non-existent' as Shared.IRI,
        type: ['Related'],
      };

      // Mock validation to fail
      (
        mockRepository.findById as ReturnType<typeof mock>
      ).mockResolvedValueOnce(null);

      await expect(
        service.addRelatedAchievement(achievementA.id, relatedData)
      ).rejects.toThrow('Invalid relationship');
    });

    it('should return null when achievement does not exist', async () => {
      const relatedData: Related = {
        id: achievementB.id,
        type: ['Related'],
      };

      // Mock validation to pass but achievement not found
      (mockRepository.findById as ReturnType<typeof mock>)
        .mockResolvedValueOnce(achievementB) // Related achievement exists
        .mockResolvedValueOnce(achievementA) // Source achievement for graph building
        .mockResolvedValueOnce(null); // Achievement not found

      const result = await service.addRelatedAchievement(
        achievementA.id,
        relatedData
      );

      expect(result).toBeNull();
    });
  });

  describe('removeRelatedAchievement', () => {
    it('should remove a related achievement', async () => {
      const achievementWithRelation = BadgeClass.create({
        id: achievementA.id,
        issuer: achievementA.issuer,
        name: achievementA.name,
        description: achievementA.description,
        image: achievementA.image,
        criteria: achievementA.criteria,
        related: [
          {
            id: achievementB.id,
            type: ['Related'],
          },
          {
            id: achievementC.id,
            type: ['Related'],
          },
        ],
      });

      const updatedAchievement = BadgeClass.create({
        id: achievementA.id,
        issuer: achievementA.issuer,
        name: achievementA.name,
        description: achievementA.description,
        image: achievementA.image,
        criteria: achievementA.criteria,
        related: [
          {
            id: achievementC.id,
            type: ['Related'],
          },
        ],
      });

      (
        mockRepository.findById as ReturnType<typeof mock>
      ).mockResolvedValueOnce(achievementWithRelation);
      (mockRepository.update as ReturnType<typeof mock>).mockResolvedValueOnce(
        updatedAchievement
      );

      const result = await service.removeRelatedAchievement(
        achievementA.id,
        achievementB.id
      );

      expect(result).toBeDefined();
      expect(result?.related).toHaveLength(1);
      expect(result?.related?.[0].id).toBe(achievementC.id);
    });

    it('should return null when achievement does not exist', async () => {
      (
        mockRepository.findById as ReturnType<typeof mock>
      ).mockResolvedValueOnce(null);

      const result = await service.removeRelatedAchievement(
        achievementA.id,
        achievementB.id
      );

      expect(result).toBeNull();
    });
  });
});
