/**
 * Unit tests for the BadgeClass entity
 *
 * This file contains tests for the BadgeClass domain entity to ensure
 * it behaves correctly according to the Open Badges 3.0 specification.
 */

import { describe, expect, it } from 'bun:test';
import { BadgeClass } from '../../../src/domains/badgeClass/badgeClass.entity';
import { Shared } from 'openbadges-types';

describe('BadgeClass Entity', () => {
  // Test data
  const validBadgeClassData = {
    id: '123e4567-e89b-12d3-a456-426614174001' as Shared.IRI,
    issuer: '123e4567-e89b-12d3-a456-426614174000' as Shared.IRI,
    name: 'Introduction to Programming',
    description: 'This badge is awarded to students who complete the Introduction to Programming course',
    image: 'https://example.edu/badges/intro-to-programming.png' as Shared.IRI,
    criteria: {
      narrative: 'The recipient must complete all course modules with a score of at least 70%'
    },
    alignment: [
      {
        targetName: 'ISTE Standard 1',
        targetUrl: 'https://www.iste.org/standards/iste-standards/standards-for-students' as Shared.IRI,
        targetDescription: 'Empowered Learner'
      }
    ],
    tags: ['programming', 'computer science', 'beginner']
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
        narrative: 'Complete the requirements'
      }
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
      customField2: 'Custom Value 2'
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
    expect(obj.alignment).toEqual(validBadgeClassData.alignment);
    expect(obj.tags).toEqual(validBadgeClassData.tags);
  });

  it('should convert to JSON-LD format', () => {
    const badgeClass = BadgeClass.create(validBadgeClassData);
    const jsonLd = badgeClass.toJsonLd();

    expect(jsonLd).toBeDefined();
    expect(jsonLd['@context']).toBe('https://w3id.org/openbadges/v3');
    expect(jsonLd.type).toBe('BadgeClass');
    expect(jsonLd.id).toBe(validBadgeClassData.id);
    expect(jsonLd.issuer).toBe(validBadgeClassData.issuer);
    expect(jsonLd.name).toBe(validBadgeClassData.name);
    expect(jsonLd.description).toBe(validBadgeClassData.description);
    expect(jsonLd.image).toBe(validBadgeClassData.image);
    expect(jsonLd.criteria).toEqual(validBadgeClassData.criteria);
    expect(jsonLd.alignment).toEqual(validBadgeClassData.alignment);
    expect(jsonLd.tags).toEqual(validBadgeClassData.tags);
  });

  it('should get property values', () => {
    const badgeClass = BadgeClass.create(validBadgeClassData);

    expect(badgeClass.getProperty('id')).toBe(validBadgeClassData.id);
    expect(badgeClass.getProperty('issuer')).toBe(validBadgeClassData.issuer);
    expect(badgeClass.getProperty('name')).toBe(validBadgeClassData.name);
    expect(badgeClass.getProperty('description')).toBe(validBadgeClassData.description);
    expect(badgeClass.getProperty('image')).toBe(validBadgeClassData.image);
    expect(badgeClass.getProperty('criteria')).toEqual(validBadgeClassData.criteria);
    expect(badgeClass.getProperty('alignment')).toEqual(validBadgeClassData.alignment);
    expect(badgeClass.getProperty('tags')).toEqual(validBadgeClassData.tags);
    expect(badgeClass.getProperty('nonExistentProperty')).toBeUndefined();
  });
});
