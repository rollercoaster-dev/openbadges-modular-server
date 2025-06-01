/**
 * Unit tests for the Assertion entity
 *
 * This file contains tests for the Assertion domain entity to ensure
 * it behaves correctly according to the Open Badges 3.0 specification.
 */

import { describe, expect, it } from 'bun:test';
import { Assertion } from '@/domains/assertion/assertion.entity';
import { Shared } from 'openbadges-types';
import {
  EXAMPLE_EDU_EVIDENCE_URL,
  EXAMPLE_EDU_KEYS_URL,
  VC_V2_CONTEXT_URL,
} from '@/constants/urls';

describe('Assertion Entity', () => {
  // Test data
  const validAssertionData = {
    id: '123e4567-e89b-12d3-a456-426614174002' as Shared.IRI,
    badgeClass: '123e4567-e89b-12d3-a456-426614174001' as Shared.IRI,
    recipient: {
      type: 'email',
      identity: 'student@example.edu',
      hashed: false,
    },
    issuedOn: '2023-01-01T00:00:00Z',
    expires: '2024-01-01T00:00:00Z',
    issuer: 'https://example.edu/issuer/1' as Shared.IRI,
    evidence: [
      {
        type: 'Evidence',
        id: EXAMPLE_EDU_EVIDENCE_URL as Shared.IRI,
        name: 'Course Completion Certificate',
        description:
          'Certificate of completion for the Introduction to Programming course',
        genre: 'Certificate',
        audience: 'Public',
      },
    ],
    verification: {
      type: 'SignedBadge',
      creator: EXAMPLE_EDU_KEYS_URL as Shared.IRI,
      created: '2023-01-01T00:00:00Z',
      signatureValue: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
    },
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
        hashed: false,
      },
      issuedOn: '2023-01-01T00:00:00Z',
      issuer: 'https://example.edu/issuer/1' as Shared.IRI,
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
      customField2: 'Custom Value 2',
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

    // For OB3, recipient is transformed into credentialSubject
    expect(obj.credentialSubject).toBeDefined();
    // Use type assertion since we know the structure
    const credentialSubject = obj.credentialSubject as {
      id: string;
      achievement: string;
    };
    // Email addresses are converted to mailto: URIs in OB3
    expect(credentialSubject.id).toBe(
      `mailto:${validAssertionData.recipient.identity}`
    );
    expect(credentialSubject.achievement).toBe(validAssertionData.badgeClass);

    // Check dates
    expect(obj.issuanceDate).toBeDefined(); // OB3 uses issuanceDate instead of issuedOn
    expect(obj.expirationDate).toBeDefined(); // OB3 uses expirationDate instead of expires

    expect(obj.evidence).toEqual(validAssertionData.evidence);
    expect(obj.issuer).toBe(validAssertionData.issuer);

    // Check type is an array for OB3
    expect(Array.isArray(obj.type)).toBe(true);
    expect(obj.type).toContain('VerifiableCredential');
    expect(obj.type).toContain('OpenBadgeCredential');

    // Check context is an array for OB3
    expect(Array.isArray(obj['@context'])).toBe(true);
    expect(obj['@context']).toContain(VC_V2_CONTEXT_URL);
    expect(obj['@context']).toContain(
      'https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json'
    );

    // Check proof property (transformed from verification)
    expect(obj.proof).toBeDefined();
  });

  it('should convert to JSON-LD format', () => {
    const assertion = Assertion.create(validAssertionData);
    const jsonLd = assertion.toJsonLd();

    expect(jsonLd).toBeDefined();

    // Check context is an array for OB3
    expect(Array.isArray(jsonLd['@context'])).toBe(true);
    expect(jsonLd['@context']).toContain(VC_V2_CONTEXT_URL);
    expect(jsonLd['@context']).toContain(
      'https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json'
    );

    // Check type is an array for OB3
    expect(Array.isArray(jsonLd.type)).toBe(true);
    expect(jsonLd.type).toContain('VerifiableCredential');
    expect(jsonLd.type).toContain('OpenBadgeCredential');

    expect(jsonLd.id).toBe(validAssertionData.id);

    // For OB3, badgeClass is transformed into badge
    expect(jsonLd.badge).toBe(validAssertionData.badgeClass);

    // For OB3, recipient is transformed into credentialSubject
    expect(jsonLd.credentialSubject).toBeDefined();

    // Check dates
    expect(jsonLd.issuanceDate).toBeDefined(); // OB3 uses issuanceDate instead of issuedOn
    expect(jsonLd.expirationDate).toBeDefined(); // OB3 uses expirationDate instead of expires

    expect(jsonLd.evidence).toEqual(validAssertionData.evidence);

    // Check proof property (transformed from verification)
    expect(jsonLd.proof).toBeDefined();
    // Use type assertion to avoid TypeScript errors
    const proof = jsonLd.proof as {
      type: string;
      cryptosuite: string;
      created: string;
      verificationMethod: string;
      proofValue: string;
    };
    expect(proof.type).toBe('DataIntegrityProof');
    expect(proof.cryptosuite).toBe('rsa-sha256');
    expect(proof.created).toBeDefined();
    expect(proof.verificationMethod).toBe(
      validAssertionData.verification.creator
    );
    expect(proof.proofValue).toBe(
      validAssertionData.verification.signatureValue
    );
  });

  it('should get property values', () => {
    const assertion = Assertion.create(validAssertionData);

    expect(assertion.getProperty('id')).toBe(validAssertionData.id);
    expect(assertion.getProperty('badgeClass')).toBe(
      validAssertionData.badgeClass
    );
    expect(assertion.getProperty('recipient')).toEqual(
      validAssertionData.recipient
    );
    expect(assertion.getProperty('issuedOn')).toBe(validAssertionData.issuedOn);
    expect(assertion.getProperty('expires')).toBe(validAssertionData.expires);
    expect(assertion.getProperty('issuer')).toBe(validAssertionData.issuer);
    expect(assertion.getProperty('evidence')).toEqual(
      validAssertionData.evidence
    );
    expect(assertion.getProperty('verification')).toEqual(
      validAssertionData.verification
    );
    expect(assertion.getProperty('nonExistentProperty')).toBeUndefined();
  });

  it('should check if assertion is valid', () => {
    // Valid assertion (not expired, not revoked)
    const validAssertion = Assertion.create({
      ...validAssertionData,
      expires: new Date(Date.now() + 86400000).toISOString(), // 1 day in the future
    });
    expect(validAssertion.isValid()).toBe(true);

    // Expired assertion
    const expiredAssertion = Assertion.create({
      ...validAssertionData,
      expires: new Date(Date.now() - 86400000).toISOString(), // 1 day in the past
    });
    expect(expiredAssertion.isValid()).toBe(false);

    // Revoked assertion
    const revokedAssertion = Assertion.create({
      ...validAssertionData,
      revoked: true,
      revocationReason: 'Badge awarded in error',
    });
    expect(revokedAssertion.isValid()).toBe(false);
  });

  describe('OB3 Recipient ID Validation', () => {
    it('should throw error when converting to OB3 with invalid recipient ID', () => {
      const assertionWithInvalidRecipient = Assertion.create({
        ...validAssertionData,
        recipient: {
          type: 'email',
          identity: 'invalid-recipient-id', // Not a valid IRI (not URL or UUID)
          hashed: false,
        },
      });

      expect(() => assertionWithInvalidRecipient.toObject()).toThrow(
        'Cannot create OB3 VerifiableCredential: recipient ID "invalid-recipient-id" cannot be converted to a valid IRI'
      );
    });

    it('should throw error when converting to OB3 with empty recipient ID', () => {
      const assertionWithEmptyRecipient = Assertion.create({
        ...validAssertionData,
        recipient: {
          type: 'email',
          identity: '', // Empty string
          hashed: false,
        },
      });

      expect(() => assertionWithEmptyRecipient.toObject()).toThrow(
        'Cannot create OB3 VerifiableCredential: recipient must have a valid identity or id field'
      );
    });

    it('should throw error when converting to OB3 with missing recipient', () => {
      const assertionWithoutRecipient = Assertion.create({
        ...validAssertionData,
        recipient: null,
      });

      expect(() => assertionWithoutRecipient.toObject()).toThrow(
        'Cannot create OB3 VerifiableCredential: recipient is required and must be a valid object'
      );
    });

    it('should work with valid URL as recipient ID', () => {
      const assertionWithUrlRecipient = Assertion.create({
        ...validAssertionData,
        recipient: {
          type: 'url',
          identity: 'https://example.com/users/123',
          hashed: false,
        },
      });

      const obj = assertionWithUrlRecipient.toObject();
      expect(obj.credentialSubject).toBeDefined();
      const credentialSubject = obj.credentialSubject as { id: string };
      expect(credentialSubject.id).toBe('https://example.com/users/123');
    });

    it('should work with valid UUID as recipient ID', () => {
      const assertionWithUuidRecipient = Assertion.create({
        ...validAssertionData,
        recipient: {
          type: 'uuid',
          identity: '123e4567-e89b-12d3-a456-426614174999',
          hashed: false,
        },
      });

      const obj = assertionWithUuidRecipient.toObject();
      expect(obj.credentialSubject).toBeDefined();
      const credentialSubject = obj.credentialSubject as { id: string };
      expect(credentialSubject.id).toBe('123e4567-e89b-12d3-a456-426614174999');
    });

    it('should work with valid DID as recipient ID', () => {
      const assertionWithDidRecipient = Assertion.create({
        ...validAssertionData,
        recipient: {
          type: 'did',
          identity: 'did:example:123456789abcdefghi',
          hashed: false,
        },
      });

      const obj = assertionWithDidRecipient.toObject();
      expect(obj.credentialSubject).toBeDefined();
      const credentialSubject = obj.credentialSubject as { id: string };
      expect(credentialSubject.id).toBe('did:example:123456789abcdefghi');
    });

    it('should convert email addresses to mailto: URIs', () => {
      const assertionWithEmailRecipient = Assertion.create({
        ...validAssertionData,
        recipient: {
          type: 'email',
          identity: 'test@example.com',
          hashed: false,
        },
      });

      const obj = assertionWithEmailRecipient.toObject();
      expect(obj.credentialSubject).toBeDefined();
      const credentialSubject = obj.credentialSubject as { id: string };
      expect(credentialSubject.id).toBe('mailto:test@example.com');
    });
  });
});
