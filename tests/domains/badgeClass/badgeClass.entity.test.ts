/**
 * Unit tests for the BadgeClass entity
 *
 * This file contains tests for the BadgeClass domain entity to ensure
 * it behaves correctly according to the Open Badges 3.0 specification.
 * Includes tests for versioning and relationship features.
 */

import { describe, expect, it } from 'bun:test';
import {
  BadgeClass,
  Related,
  EndorsementCredential,
} from '@/domains/badgeClass/badgeClass.entity';
import { Shared } from 'openbadges-types';
import { BadgeVersion } from '@/utils/version/badge-version';

describe('BadgeClass Entity', () => {
  // Test data
  const validBadgeClassData = {
    id: '123e4567-e89b-12d3-a456-426614174001' as Shared.IRI,
    issuer: '123e4567-e89b-12d3-a456-426614174000' as Shared.IRI,
    name: 'Introduction to Programming',
    description:
      'This badge is awarded to students who complete the Introduction to Programming course',
    image: 'https://example.edu/badges/intro-to-programming.png' as Shared.IRI,
    criteria: {
      narrative:
        'The recipient must complete all course modules with a score of at least 70%',
    },
    alignment: [
      {
        targetName: 'ISTE Standard 1',
        targetUrl:
          'https://www.iste.org/standards/iste-standards/standards-for-students' as Shared.IRI,
        targetDescription: 'Empowered Learner',
      },
    ],
    tags: ['programming', 'computer science', 'beginner'],
  };

  it('should create a valid badge class', () => {
    const badgeClass = BadgeClass.create(validBadgeClassData);

    expect(badgeClass).toBeDefined();
    expect(badgeClass.id).toBe(validBadgeClassData.id);
    expect(badgeClass.issuer).toBe(validBadgeClassData.issuer);
    expect(badgeClass.name).toBe(validBadgeClassData.name);
    expect(badgeClass.description).toBe(validBadgeClassData.description);
    expect(badgeClass.image).toBe(validBadgeClassData.image);
    expect(badgeClass.criteria).toEqual(validBadgeClassData.criteria);
    expect(badgeClass.alignment).toEqual(validBadgeClassData.alignment);
    expect(badgeClass.tags).toEqual(validBadgeClassData.tags);
  });

  it('should create a badge class with only required fields', () => {
    const minimalBadgeClassData = {
      issuer: '123e4567-e89b-12d3-a456-426614174000' as Shared.IRI,
      name: 'Minimal Badge',
      description: 'A minimal badge class',
      image: 'https://example.edu/badges/minimal.png' as Shared.IRI,
      criteria: {
        narrative: 'Complete the requirements',
      },
    };

    const badgeClass = BadgeClass.create(minimalBadgeClassData);

    expect(badgeClass).toBeDefined();
    expect(badgeClass.issuer).toBe(minimalBadgeClassData.issuer);
    expect(badgeClass.name).toBe(minimalBadgeClassData.name);
    expect(badgeClass.description).toBe(minimalBadgeClassData.description);
    expect(badgeClass.image).toBe(minimalBadgeClassData.image);
    expect(badgeClass.criteria).toEqual(minimalBadgeClassData.criteria);
    expect(badgeClass.alignment).toBeUndefined();
    expect(badgeClass.tags).toBeUndefined();
  });

  it('should handle additional properties', () => {
    const badgeClassWithAdditionalProps = {
      ...validBadgeClassData,
      customField1: 'Custom Value 1',
      customField2: 'Custom Value 2',
    };

    const badgeClass = BadgeClass.create(badgeClassWithAdditionalProps);

    expect(badgeClass).toBeDefined();
    expect(badgeClass.getProperty('customField1')).toBe('Custom Value 1');
    expect(badgeClass.getProperty('customField2')).toBe('Custom Value 2');
  });

  it('should convert to a plain object', () => {
    const badgeClass = BadgeClass.create(validBadgeClassData);
    const obj = badgeClass.toObject();

    expect(obj).toBeDefined();
    expect(obj.id).toBe(validBadgeClassData.id);
    expect(obj.issuer).toBe(validBadgeClassData.issuer);
    expect(obj.name).toBe(validBadgeClassData.name);
    expect(obj.description).toBe(validBadgeClassData.description);
    expect(obj.image).toBe(validBadgeClassData.image);
    expect(obj.criteria).toEqual(validBadgeClassData.criteria);
    // In OB3, alignment is renamed to alignments
    expect(obj.alignments).toEqual(validBadgeClassData.alignment);
    expect(obj.tags).toEqual(validBadgeClassData.tags);
    // Verify it's an Achievement in OB3 output
    expect(obj.type).toBe('Achievement');
  });

  it('should convert to JSON-LD format', () => {
    const badgeClass = BadgeClass.create(validBadgeClassData);
    const jsonLd = badgeClass.toJsonLd();

    expect(jsonLd).toBeDefined();
    expect(jsonLd['@context']).toBeDefined();
    // Type should be Achievement for OB3 (as an array in OB3)
    expect(
      Array.isArray(jsonLd.type)
        ? jsonLd.type.includes('Achievement')
        : jsonLd.type === 'Achievement'
    ).toBe(true);
    expect(jsonLd.id).toBe(validBadgeClassData.id);
    expect(jsonLd.issuer).toBe(validBadgeClassData.issuer);
    expect(jsonLd.name).toBe(validBadgeClassData.name);
    expect(jsonLd.description).toBe(validBadgeClassData.description);
    expect(jsonLd.image).toBe(validBadgeClassData.image);
    expect(jsonLd.criteria).toEqual(validBadgeClassData.criteria);
    // In OB3, alignment is renamed to alignments
    expect(jsonLd.alignments).toEqual(validBadgeClassData.alignment);
    expect(jsonLd.tags).toEqual(validBadgeClassData.tags);
  });

  it('should get property values', () => {
    const badgeClass = BadgeClass.create(validBadgeClassData);

    expect(badgeClass.getProperty('id')).toBe(validBadgeClassData.id);
    expect(badgeClass.getProperty('issuer')).toBe(validBadgeClassData.issuer);
    expect(badgeClass.getProperty('name')).toBe(validBadgeClassData.name);
    expect(badgeClass.getProperty('description')).toBe(
      validBadgeClassData.description
    );
    expect(badgeClass.getProperty('image')).toBe(validBadgeClassData.image);
    expect(badgeClass.getProperty('criteria')).toEqual(
      validBadgeClassData.criteria
    );
    expect(badgeClass.getProperty('alignment')).toEqual(
      validBadgeClassData.alignment
    );
    expect(badgeClass.getProperty('tags')).toEqual(validBadgeClassData.tags);
    expect(badgeClass.getProperty('nonExistentProperty')).toBeUndefined();
  });

  // Tests for versioning features (OB 3.0)
  describe('Versioning Features', () => {
    const versionedBadgeClassData = {
      ...validBadgeClassData,
      id: '123e4567-e89b-12d3-a456-426614174002' as Shared.IRI,
      version: '2.0',
      previousVersion: '123e4567-e89b-12d3-a456-426614174001' as Shared.IRI,
    };

    it('should create a badge class with version fields', () => {
      const badgeClass = BadgeClass.create(versionedBadgeClassData);

      expect(badgeClass).toBeDefined();
      expect(badgeClass.version).toBe('2.0');
      expect(badgeClass.previousVersion).toBe(
        versionedBadgeClassData.previousVersion
      );
    });

    it('should include version field in OB 3.0 JSON-LD output', () => {
      const badgeClass = BadgeClass.create(versionedBadgeClassData);
      const jsonLd = badgeClass.toJsonLd(BadgeVersion.V3);

      expect(jsonLd.version).toBe('2.0');
      // previousVersion is for internal tracking only, not in JSON-LD output
      expect(jsonLd.previousVersion).toBeUndefined();
    });

    it('should exclude version field from OB 2.0 output', () => {
      const badgeClass = BadgeClass.create(versionedBadgeClassData);
      const jsonLd = badgeClass.toJsonLd(BadgeVersion.V2);

      expect(jsonLd.version).toBeUndefined();
      expect(jsonLd.previousVersion).toBeUndefined();
    });

    it('should include version field in OB 3.0 object output', () => {
      const badgeClass = BadgeClass.create(versionedBadgeClassData);
      const obj = badgeClass.toObject(BadgeVersion.V3);

      expect(obj.version).toBe('2.0');
      // previousVersion is for internal tracking only
      expect(obj.previousVersion).toBeUndefined();
    });

    it('should exclude version field from OB 2.0 object output', () => {
      const badgeClass = BadgeClass.create(versionedBadgeClassData);
      const obj = badgeClass.toObject(BadgeVersion.V2);

      expect(obj.version).toBeUndefined();
      expect(obj.previousVersion).toBeUndefined();
    });
  });

  // Tests for relationship features (OB 3.0)
  describe('Relationship Features', () => {
    const relatedAchievement: Related = {
      id: '123e4567-e89b-12d3-a456-426614174003' as Shared.IRI,
      type: ['Related'],
      inLanguage: 'en-US',
      version: '1.0',
    };

    const endorsementCredential: EndorsementCredential = {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        'https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json',
      ],
      id: '123e4567-e89b-12d3-a456-426614174004' as Shared.IRI,
      type: ['VerifiableCredential', 'EndorsementCredential'],
      issuer: '123e4567-e89b-12d3-a456-426614174005' as Shared.IRI,
      validFrom: '2023-01-01T00:00:00Z',
      credentialSubject: {
        id: validBadgeClassData.id,
        type: ['Achievement'],
        endorsementComment: 'This is an excellent achievement program.',
      },
    };

    const relationshipBadgeClassData = {
      ...validBadgeClassData,
      id: '123e4567-e89b-12d3-a456-426614174006' as Shared.IRI,
      related: [relatedAchievement],
      endorsement: [endorsementCredential],
    };

    it('should create a badge class with relationship fields', () => {
      const badgeClass = BadgeClass.create(relationshipBadgeClassData);

      expect(badgeClass).toBeDefined();
      expect(badgeClass.related).toHaveLength(1);
      expect(badgeClass.related?.[0]).toEqual(relatedAchievement);
      expect(badgeClass.endorsement).toHaveLength(1);
      expect(badgeClass.endorsement?.[0]).toEqual(endorsementCredential);
    });

    it('should include relationship fields in OB 3.0 JSON-LD output', () => {
      const badgeClass = BadgeClass.create(relationshipBadgeClassData);
      const jsonLd = badgeClass.toJsonLd(BadgeVersion.V3);

      expect(jsonLd.related).toHaveLength(1);
      expect(jsonLd.related?.[0]).toEqual(relatedAchievement);
      expect(jsonLd.endorsement).toHaveLength(1);
      expect(jsonLd.endorsement?.[0]).toEqual(endorsementCredential);
    });

    it('should exclude relationship fields from OB 2.0 output', () => {
      const badgeClass = BadgeClass.create(relationshipBadgeClassData);
      const jsonLd = badgeClass.toJsonLd(BadgeVersion.V2);

      expect(jsonLd.related).toBeUndefined();
      expect(jsonLd.endorsement).toBeUndefined();
    });

    it('should include relationship fields in OB 3.0 object output', () => {
      const badgeClass = BadgeClass.create(relationshipBadgeClassData);
      const obj = badgeClass.toObject(BadgeVersion.V3);

      expect(obj.related).toHaveLength(1);
      expect(obj.related?.[0]).toEqual(relatedAchievement);
      expect(obj.endorsement).toHaveLength(1);
      expect(obj.endorsement?.[0]).toEqual(endorsementCredential);
    });

    it('should exclude relationship fields from OB 2.0 object output', () => {
      const badgeClass = BadgeClass.create(relationshipBadgeClassData);
      const obj = badgeClass.toObject(BadgeVersion.V2);

      expect(obj.related).toBeUndefined();
      expect(obj.endorsement).toBeUndefined();
    });
  });

  // Tests for backward compatibility
  describe('Backward Compatibility', () => {
    it('should maintain OB 2.0 compatibility when new fields are present', () => {
      const fullFeaturedData = {
        ...validBadgeClassData,
        version: '1.0',
        previousVersion: '123e4567-e89b-12d3-a456-426614174000' as Shared.IRI,
        related: [
          {
            id: '123e4567-e89b-12d3-a456-426614174003' as Shared.IRI,
            type: ['Related'] as ['Related'],
          },
        ],
        endorsement: [
          {
            '@context': ['https://www.w3.org/2018/credentials/v1'],
            id: '123e4567-e89b-12d3-a456-426614174004' as Shared.IRI,
            type: ['VerifiableCredential', 'EndorsementCredential'] as [
              'VerifiableCredential',
              'EndorsementCredential'
            ],
            issuer: '123e4567-e89b-12d3-a456-426614174005' as Shared.IRI,
            validFrom: '2023-01-01T00:00:00Z',
            credentialSubject: {
              id: validBadgeClassData.id,
              type: ['Achievement'],
            },
          },
        ],
      };

      const badgeClass = BadgeClass.create(fullFeaturedData);
      const ob2Output = badgeClass.toJsonLd(BadgeVersion.V2);

      // Should be valid OB 2.0 output without new fields
      expect(ob2Output.type).toBe('BadgeClass');
      expect(ob2Output.version).toBeUndefined();
      expect(ob2Output.related).toBeUndefined();
      expect(ob2Output.endorsement).toBeUndefined();
      expect(ob2Output.previousVersion).toBeUndefined();

      // Should still have all required OB 2.0 fields
      expect(ob2Output.id).toBe(validBadgeClassData.id);
      expect(ob2Output.name).toBe(validBadgeClassData.name);
      expect(ob2Output.description).toBe(validBadgeClassData.description);
      expect(ob2Output.issuer).toBe(validBadgeClassData.issuer);
      expect(ob2Output.criteria).toEqual(validBadgeClassData.criteria);
    });
  });
});
