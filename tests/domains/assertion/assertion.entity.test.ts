/**
 * Unit tests for the Assertion entity
 *
 * This file contains tests for the Assertion domain entity to ensure
 * it behaves correctly according to the Open Badges 3.0 specification.
 */

import { describe, expect, it } from 'bun:test';
import { Assertion } from '../../../src/domains/assertion/assertion.entity';
import { Shared } from 'openbadges-types';

describe('Assertion Entity', () => {
  // Test data
  const validAssertionData = {
    id: '123e4567-e89b-12d3-a456-426614174002' as Shared.IRI,
    badgeClass: '123e4567-e89b-12d3-a456-426614174001' as Shared.IRI,
    recipient: {
      type: 'email',
      identity: 'student@example.edu',
      hashed: false
    },
    issuedOn: '2023-01-01T00:00:00Z',
    expires: '2024-01-01T00:00:00Z',
    issuer: 'https://example.edu/issuer/1' as Shared.IRI,
    evidence: [
      {
        type: 'Evidence',
        id: 'https://example.edu/evidence/123' as Shared.IRI,
        name: 'Course Completion Certificate',
        description: 'Certificate of completion for the Introduction to Programming course',
        genre: 'Certificate',
        audience: 'Public'
      }
    ],
    verification: {
      type: 'SignedBadge',
      creator: 'https://example.edu/keys/1' as Shared.IRI,
      created: '2023-01-01T00:00:00Z',
      signatureValue: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...'
    }
  };

  it('should create a valid assertion', () => {
    const assertion = Assertion.create(validAssertionData);

    expect(assertion).toBeDefined();
    expect(assertion.id).toBe(validAssertionData.id);
    expect(assertion.badgeClass).toBe(validAssertionData.badgeClass);
    expect(assertion.recipient).toEqual(validAssertionData.recipient);
    expect(assertion.issuedOn).toBe(validAssertionData.issuedOn);
    expect(assertion.expires).toBe(validAssertionData.expires);
    expect(assertion.evidence).toEqual(validAssertionData.evidence);
    expect(assertion.verification).toEqual(validAssertionData.verification);
  });

  it('should create an assertion with only required fields', () => {
    const minimalAssertionData = {
      badgeClass: '123e4567-e89b-12d3-a456-426614174001' as Shared.IRI,
      recipient: {
        type: 'email',
        identity: 'student@example.edu',
        hashed: false
      },
      issuedOn: '2023-01-01T00:00:00Z',
      issuer: 'https://example.edu/issuer/1' as Shared.IRI
    };

    const assertion = Assertion.create(minimalAssertionData);

    expect(assertion).toBeDefined();
    expect(assertion.badgeClass).toBe(minimalAssertionData.badgeClass);
    expect(assertion.recipient).toEqual(minimalAssertionData.recipient);
    expect(assertion.issuedOn).toBe(minimalAssertionData.issuedOn);
    expect(assertion.expires).toBeUndefined();
    expect(assertion.evidence).toBeUndefined();
    // Default verification is now added in the create method
    expect(assertion.verification).toEqual({ type: 'hosted' });
  });

  it('should handle additional properties', () => {
    const assertionWithAdditionalProps = {
      ...validAssertionData,
      customField1: 'Custom Value 1',
      customField2: 'Custom Value 2'
    };

    const assertion = Assertion.create(assertionWithAdditionalProps);

    expect(assertion).toBeDefined();
    expect(assertion.getProperty('customField1')).toBe('Custom Value 1');
    expect(assertion.getProperty('customField2')).toBe('Custom Value 2');
  });

  it('should convert to a plain object', () => {
    const assertion = Assertion.create(validAssertionData);
    const obj = assertion.toObject();

    expect(obj).toBeDefined();
    expect(obj.id).toBe(validAssertionData.id);
    expect(obj.recipient).toEqual(validAssertionData.recipient);
    expect(obj.issuedOn).toBe(validAssertionData.issuedOn);
    expect(obj.expires).toBe(validAssertionData.expires);
    expect(obj.evidence).toEqual(validAssertionData.evidence);
    expect(obj.issuer).toBe(validAssertionData.issuer);

    // In OB2, badge is the IRI of the BadgeClass
    expect(obj.badge).toBe(validAssertionData.badgeClass);

    // Check verification property
    expect(obj.verification).toBeDefined();
  });

  it('should convert to JSON-LD format', () => {
    const assertion = Assertion.create(validAssertionData);
    const jsonLd = assertion.toJsonLd();

    expect(jsonLd).toBeDefined();
    expect(jsonLd['@context']).toBe('https://w3id.org/openbadges/v3');
    expect(jsonLd.type).toBe('Assertion');
    expect(jsonLd.id).toBe(validAssertionData.id);
    expect(jsonLd.badge).toBe(validAssertionData.badgeClass);
    expect(jsonLd.recipient).toEqual(validAssertionData.recipient);
    expect(jsonLd.issuedOn).toBe(validAssertionData.issuedOn);
    expect(jsonLd.expires).toBe(validAssertionData.expires);
    expect(jsonLd.evidence).toEqual(validAssertionData.evidence);
    expect(jsonLd.verification).toEqual(validAssertionData.verification);
  });

  it('should get property values', () => {
    const assertion = Assertion.create(validAssertionData);

    expect(assertion.getProperty('id')).toBe(validAssertionData.id);
    expect(assertion.getProperty('badgeClass')).toBe(validAssertionData.badgeClass);
    expect(assertion.getProperty('recipient')).toEqual(validAssertionData.recipient);
    expect(assertion.getProperty('issuedOn')).toBe(validAssertionData.issuedOn);
    expect(assertion.getProperty('expires')).toBe(validAssertionData.expires);
    expect(assertion.getProperty('issuer')).toBe(validAssertionData.issuer);
    expect(assertion.getProperty('evidence')).toEqual(validAssertionData.evidence);
    expect(assertion.getProperty('verification')).toEqual(validAssertionData.verification);
    expect(assertion.getProperty('nonExistentProperty')).toBeUndefined();
  });

  it('should check if assertion is valid', () => {
    // Valid assertion (not expired, not revoked)
    const validAssertion = Assertion.create({
      ...validAssertionData,
      expires: new Date(Date.now() + 86400000).toISOString() // 1 day in the future
    });
    expect(validAssertion.isValid()).toBe(true);

    // Expired assertion
    const expiredAssertion = Assertion.create({
      ...validAssertionData,
      expires: new Date(Date.now() - 86400000).toISOString() // 1 day in the past
    });
    expect(expiredAssertion.isValid()).toBe(false);

    // Revoked assertion
    const revokedAssertion = Assertion.create({
      ...validAssertionData,
      revoked: true,
      revocationReason: 'Badge awarded in error'
    });
    expect(revokedAssertion.isValid()).toBe(false);
  });
});
