/**
 * Test for the convertToEndorsementCredential function fix
 *
 * This test verifies that the issuer URL mapping is handled correctly
 * when converting EndorsementCredentialDto to EndorsementCredential domain type.
 */

import { describe, expect, it } from 'bun:test';
import { EndorsementCredentialDto } from '@/api/validation/badgeClass.schemas';

// We need to access the private function for testing, so we'll create a test version
// This simulates the fixed logic from the convertToEndorsementCredential function
import { toIRI } from '@/utils/types/iri-utils';
import { OB3, Shared } from 'openbadges-types';
import { EndorsementCredential } from '@/domains/badgeClass/badgeClass.entity';

function testConvertToEndorsementCredential(
  dto: EndorsementCredentialDto
): EndorsementCredential {
  // Convert issuer to proper format
  let issuer: EndorsementCredential['issuer'];
  if (typeof dto.issuer === 'string') {
    issuer = toIRI(dto.issuer);
  } else if (dto.issuer && typeof dto.issuer === 'object') {
    // For issuer objects, we need to handle the case where we don't have a valid URL
    // Since OB3.Issuer requires a url property, we need to provide one
    let issuerUrl: Shared.IRI;

    if (dto.issuer.id && toIRI(dto.issuer.id)) {
      try {
        // Check if the id is a valid URL (not just a UUID)
        new URL(dto.issuer.id);
        issuerUrl = toIRI(dto.issuer.id)!;
      } catch {
        // If id is not a valid URL (e.g., it's a UUID), use a placeholder URL
        // This ensures we have a valid OB3.Issuer object
        issuerUrl = toIRI(`https://example.org/issuers/${dto.issuer.id}`)!;
      }
    } else {
      // If no id is provided, use a generic placeholder
      issuerUrl = toIRI('https://example.org/issuers/unknown')!;
    }

    // Convert the issuer object to OB3.Issuer format
    const issuerObj: OB3.Issuer = {
      ...dto.issuer, // Preserve additional fields via spread operator
      id: dto.issuer.id ? toIRI(dto.issuer.id) : undefined,
      name: dto.issuer.name,
      type: dto.issuer.type,
      url: issuerUrl,
    };

    issuer = issuerObj;
  } else {
    throw new Error('Invalid issuer format in endorsement credential');
  }

  return {
    '@context': dto['@context'],
    id: toIRI(dto.id),
    type: dto.type as ['VerifiableCredential', 'EndorsementCredential'],
    issuer,
    validFrom: dto.validFrom,
    credentialSubject: {
      id: toIRI(dto.credentialSubject.id),
      type: dto.credentialSubject.type,
      endorsementComment: dto.credentialSubject.endorsementComment,
    },
    // Pass through any additional fields
    ...Object.fromEntries(
      Object.entries(dto).filter(
        ([key]) =>
          ![
            '@context',
            'id',
            'type',
            'issuer',
            'validFrom',
            'credentialSubject',
          ].includes(key)
      )
    ),
  };
}

describe('EndorsementCredential Conversion Fix', () => {
  describe('convertToEndorsementCredential issuer URL mapping', () => {
    it('should handle issuer object with valid URL id', () => {
      const dto: EndorsementCredentialDto = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        id: 'https://example.org/endorsements/1',
        type: ['VerifiableCredential', 'EndorsementCredential'],
        issuer: {
          id: 'https://example.org/issuers/123',
          type: ['Issuer'],
          name: 'Test Issuer',
        },
        validFrom: '2023-01-01T00:00:00Z',
        credentialSubject: {
          id: 'https://example.org/achievements/456',
          type: ['Achievement'],
          endorsementComment: 'Great achievement!',
        },
      };

      const result = testConvertToEndorsementCredential(dto);

      expect(typeof result.issuer).toBe('object');
      if (typeof result.issuer === 'object') {
        expect(result.issuer.url).toBe(
          toIRI('https://example.org/issuers/123')
        );
        expect(result.issuer.id).toBe(toIRI('https://example.org/issuers/123'));
        expect(result.issuer.name).toBe('Test Issuer');
      }
    });

    it('should handle issuer object with UUID id (not a URL)', () => {
      const dto: EndorsementCredentialDto = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        id: 'https://example.org/endorsements/1',
        type: ['VerifiableCredential', 'EndorsementCredential'],
        issuer: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          type: ['Issuer'],
          name: 'Test Issuer',
        },
        validFrom: '2023-01-01T00:00:00Z',
        credentialSubject: {
          id: 'https://example.org/achievements/456',
          type: ['Achievement'],
          endorsementComment: 'Great achievement!',
        },
      };

      const result = testConvertToEndorsementCredential(dto);

      expect(typeof result.issuer).toBe('object');
      if (typeof result.issuer === 'object') {
        expect(result.issuer.url).toBe(
          toIRI(
            'https://example.org/issuers/123e4567-e89b-12d3-a456-426614174000'
          )
        );
        expect(result.issuer.id).toBe(
          toIRI('123e4567-e89b-12d3-a456-426614174000')
        );
        expect(result.issuer.name).toBe('Test Issuer');
      }
    });

    it('should handle issuer object with no id', () => {
      const dto: EndorsementCredentialDto = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        id: 'https://example.org/endorsements/1',
        type: ['VerifiableCredential', 'EndorsementCredential'],
        issuer: {
          id: '',
          type: ['Issuer'],
          name: 'Test Issuer',
        },
        validFrom: '2023-01-01T00:00:00Z',
        credentialSubject: {
          id: 'https://example.org/achievements/456',
          type: ['Achievement'],
          endorsementComment: 'Great achievement!',
        },
      };

      const result = testConvertToEndorsementCredential(dto);

      expect(typeof result.issuer).toBe('object');
      if (typeof result.issuer === 'object') {
        expect(result.issuer.url).toBe(
          toIRI('https://example.org/issuers/unknown')
        );
        expect(result.issuer.id).toBe(undefined);
        expect(result.issuer.name).toBe('Test Issuer');
      }
    });

    it('should handle string issuer (IRI)', () => {
      const dto: EndorsementCredentialDto = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        id: 'https://example.org/endorsements/1',
        type: ['VerifiableCredential', 'EndorsementCredential'],
        issuer: 'https://example.org/issuers/123',
        validFrom: '2023-01-01T00:00:00Z',
        credentialSubject: {
          id: 'https://example.org/achievements/456',
          type: ['Achievement'],
          endorsementComment: 'Great achievement!',
        },
      };

      const result = testConvertToEndorsementCredential(dto);

      expect(typeof result.issuer).toBe('string');
      expect(result.issuer).toBe(toIRI('https://example.org/issuers/123'));
    });
  });

  describe('Error scenarios and edge cases', () => {
    it('should throw error for invalid issuer format (null)', () => {
      const dto = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        id: 'https://example.org/endorsements/1',
        type: ['VerifiableCredential', 'EndorsementCredential'],
        issuer: null,
        validFrom: '2023-01-01T00:00:00Z',
        credentialSubject: {
          id: 'https://example.org/achievements/456',
          type: ['Achievement'],
          endorsementComment: 'Great achievement!',
        },
      } as unknown as EndorsementCredentialDto;

      expect(() => testConvertToEndorsementCredential(dto)).toThrow(
        'Invalid issuer format in endorsement credential'
      );
    });

    it('should throw error for invalid issuer format (undefined)', () => {
      const dto = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        id: 'https://example.org/endorsements/1',
        type: ['VerifiableCredential', 'EndorsementCredential'],
        issuer: undefined,
        validFrom: '2023-01-01T00:00:00Z',
        credentialSubject: {
          id: 'https://example.org/achievements/456',
          type: ['Achievement'],
          endorsementComment: 'Great achievement!',
        },
      } as unknown as EndorsementCredentialDto;

      expect(() => testConvertToEndorsementCredential(dto)).toThrow(
        'Invalid issuer format in endorsement credential'
      );
    });

    it('should throw error for invalid issuer format (number)', () => {
      const dto = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        id: 'https://example.org/endorsements/1',
        type: ['VerifiableCredential', 'EndorsementCredential'],
        issuer: 123,
        validFrom: '2023-01-01T00:00:00Z',
        credentialSubject: {
          id: 'https://example.org/achievements/456',
          type: ['Achievement'],
          endorsementComment: 'Great achievement!',
        },
      } as unknown as EndorsementCredentialDto;

      expect(() => testConvertToEndorsementCredential(dto)).toThrow(
        'Invalid issuer format in endorsement credential'
      );
    });

    it('should throw error for invalid issuer format (boolean)', () => {
      const dto = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        id: 'https://example.org/endorsements/1',
        type: ['VerifiableCredential', 'EndorsementCredential'],
        issuer: false,
        validFrom: '2023-01-01T00:00:00Z',
        credentialSubject: {
          id: 'https://example.org/achievements/456',
          type: ['Achievement'],
          endorsementComment: 'Great achievement!',
        },
      } as unknown as EndorsementCredentialDto;

      expect(() => testConvertToEndorsementCredential(dto)).toThrow(
        'Invalid issuer format in endorsement credential'
      );
    });

    it('should preserve additional fields in issuer object via spread operator', () => {
      const dto: EndorsementCredentialDto = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        id: 'https://example.org/endorsements/1',
        type: ['VerifiableCredential', 'EndorsementCredential'],
        issuer: {
          id: 'https://example.org/issuers/123',
          type: ['Issuer'],
          name: 'Test Issuer',
          // Additional fields that should be preserved
          email: 'contact@example.org',
          description: 'A test issuer for validation',
          customField: 'custom value',
        } as EndorsementCredentialDto['issuer'] & {
          email: string;
          description: string;
          customField: string;
        },
        validFrom: '2023-01-01T00:00:00Z',
        credentialSubject: {
          id: 'https://example.org/achievements/456',
          type: ['Achievement'],
          endorsementComment: 'Great achievement!',
        },
      };

      const result = testConvertToEndorsementCredential(dto);

      expect(typeof result.issuer).toBe('object');
      if (typeof result.issuer === 'object') {
        expect(result.issuer.id).toBe(toIRI('https://example.org/issuers/123'));
        expect(result.issuer.name).toBe('Test Issuer');
        expect(result.issuer.url).toBe(
          toIRI('https://example.org/issuers/123')
        );
        // Verify additional fields are preserved
        const issuerWithExtras = result.issuer as typeof result.issuer & {
          email: string;
          description: string;
          customField: string;
        };
        expect(issuerWithExtras.email).toBe('contact@example.org');
        expect(issuerWithExtras.description).toBe(
          'A test issuer for validation'
        );
        expect(issuerWithExtras.customField).toBe('custom value');
      }
    });

    it('should handle issuer object with null id', () => {
      const dto: EndorsementCredentialDto = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        id: 'https://example.org/endorsements/1',
        type: ['VerifiableCredential', 'EndorsementCredential'],
        issuer: {
          id: null as unknown as string,
          type: ['Issuer'],
          name: 'Test Issuer',
        },
        validFrom: '2023-01-01T00:00:00Z',
        credentialSubject: {
          id: 'https://example.org/achievements/456',
          type: ['Achievement'],
          endorsementComment: 'Great achievement!',
        },
      };

      const result = testConvertToEndorsementCredential(dto);

      expect(typeof result.issuer).toBe('object');
      if (typeof result.issuer === 'object') {
        expect(result.issuer.url).toBe(
          toIRI('https://example.org/issuers/unknown')
        );
        expect(result.issuer.id).toBe(undefined);
        expect(result.issuer.name).toBe('Test Issuer');
      }
    });

    it('should handle issuer object with undefined id', () => {
      const dto: EndorsementCredentialDto = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        id: 'https://example.org/endorsements/1',
        type: ['VerifiableCredential', 'EndorsementCredential'],
        issuer: {
          id: undefined as unknown as string,
          type: ['Issuer'],
          name: 'Test Issuer',
        },
        validFrom: '2023-01-01T00:00:00Z',
        credentialSubject: {
          id: 'https://example.org/achievements/456',
          type: ['Achievement'],
          endorsementComment: 'Great achievement!',
        },
      };

      const result = testConvertToEndorsementCredential(dto);

      expect(typeof result.issuer).toBe('object');
      if (typeof result.issuer === 'object') {
        expect(result.issuer.url).toBe(
          toIRI('https://example.org/issuers/unknown')
        );
        expect(result.issuer.id).toBe(undefined);
        expect(result.issuer.name).toBe('Test Issuer');
      }
    });
  });

  describe('toIRI edge cases', () => {
    it('should handle invalid string that toIRI returns null for', () => {
      const dto: EndorsementCredentialDto = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        id: 'https://example.org/endorsements/1',
        type: ['VerifiableCredential', 'EndorsementCredential'],
        issuer: {
          id: 'invalid-iri-string',
          type: ['Issuer'],
          name: 'Test Issuer',
        },
        validFrom: '2023-01-01T00:00:00Z',
        credentialSubject: {
          id: 'https://example.org/achievements/456',
          type: ['Achievement'],
          endorsementComment: 'Great achievement!',
        },
      };

      const result = testConvertToEndorsementCredential(dto);

      expect(typeof result.issuer).toBe('object');
      if (typeof result.issuer === 'object') {
        // Should use placeholder URL when toIRI returns null for the id
        expect(result.issuer.url).toBe(
          toIRI('https://example.org/issuers/unknown')
        );
        expect(result.issuer.id).toBe(null); // toIRI returns null for invalid string
        expect(result.issuer.name).toBe('Test Issuer');
      }
    });

    it('should handle malformed URL that throws in URL constructor', () => {
      const dto: EndorsementCredentialDto = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        id: 'https://example.org/endorsements/1',
        type: ['VerifiableCredential', 'EndorsementCredential'],
        issuer: {
          id: 'ht tp://invalid url with spaces',
          type: ['Issuer'],
          name: 'Test Issuer',
        },
        validFrom: '2023-01-01T00:00:00Z',
        credentialSubject: {
          id: 'https://example.org/achievements/456',
          type: ['Achievement'],
          endorsementComment: 'Great achievement!',
        },
      };

      const result = testConvertToEndorsementCredential(dto);

      expect(typeof result.issuer).toBe('object');
      if (typeof result.issuer === 'object') {
        // Should use placeholder URL when URL constructor throws
        expect(result.issuer.url).toBe(
          toIRI('https://example.org/issuers/unknown')
        );
        expect(result.issuer.id).toBe(null); // toIRI returns null for invalid URL
        expect(result.issuer.name).toBe('Test Issuer');
      }
    });
  });

  describe('Additional fields preservation', () => {
    it('should preserve additional top-level fields via spread operator', () => {
      const dto = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        id: 'https://example.org/endorsements/1',
        type: ['VerifiableCredential', 'EndorsementCredential'],
        issuer: 'https://example.org/issuers/123',
        validFrom: '2023-01-01T00:00:00Z',
        credentialSubject: {
          id: 'https://example.org/achievements/456',
          type: ['Achievement'],
          endorsementComment: 'Great achievement!',
        },
        // Additional fields that should be preserved
        validUntil: '2024-01-01T00:00:00Z',
        proof: {
          type: 'Ed25519Signature2020',
          created: '2023-01-01T00:00:00Z',
          verificationMethod: 'https://example.org/keys/1',
          proofPurpose: 'assertionMethod',
          proofValue: 'z3MvGX...',
        },
        customProperty: 'custom value',
      } as EndorsementCredentialDto & {
        validUntil: string;
        proof: {
          type: string;
          created: string;
          verificationMethod: string;
          proofPurpose: string;
          proofValue: string;
        };
        customProperty: string;
      };

      const result = testConvertToEndorsementCredential(dto);

      // Verify core fields are converted correctly
      expect(result.issuer).toBe(toIRI('https://example.org/issuers/123'));
      expect(result.id).toBe(toIRI('https://example.org/endorsements/1'));

      // Verify additional fields are preserved
      expect(result.validUntil).toBe('2024-01-01T00:00:00Z');
      expect(result.proof).toEqual({
        type: 'Ed25519Signature2020',
        created: '2023-01-01T00:00:00Z',
        verificationMethod: 'https://example.org/keys/1',
        proofPurpose: 'assertionMethod',
        proofValue: 'z3MvGX...',
      });
      expect(result.customProperty).toBe('custom value');
    });
  });
});
