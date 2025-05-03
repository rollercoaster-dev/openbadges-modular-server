/**
 * Version-specific serializers for Open Badges API
 *
 * This file provides serializers for converting between different Open Badges versions.
 */


import { BadgeVersion, BADGE_VERSION_CONTEXTS } from './badge-version';
import { Shared } from 'openbadges-types';
import { IssuerData, BadgeClassData, AssertionData, VerifiableCredentialData } from '../types/badge-data.types';

/**
 * Base serializer interface for Open Badges
 */
export interface BadgeSerializer {
  /**
   * Serializes an issuer to the appropriate format
   * @param issuer The issuer object
   * @returns A serialized issuer in the appropriate format
   */
  serializeIssuer(issuer: IssuerData): IssuerData & { '@context': string; type: string };

  /**
   * Serializes a badge class to the appropriate format
   * @param badgeClass The badge class object
   * @returns A serialized badge class in the appropriate format
   */
  serializeBadgeClass(badgeClass: BadgeClassData): BadgeClassData & { '@context': string; type: string };

  /**
   * Serializes an assertion to the appropriate format
   * @param assertion The assertion object
   * @param badgeClass Optional badge class for the assertion
   * @param issuer Optional issuer for the assertion
   * @returns A serialized assertion in the appropriate format
   */
  serializeAssertion(
    assertion: AssertionData,
    badgeClass?: BadgeClassData,
    issuer?: IssuerData
  ): AssertionData & { '@context': string; type: string } | VerifiableCredentialData;

  /**
   * Gets the badge version supported by this serializer
   * @returns The badge version
   */
  getVersion(): BadgeVersion;
}

/**
 * Serializer for Open Badges 2.0
 */
export class OpenBadges2Serializer implements BadgeSerializer {
  /**
   * Serializes an issuer to Open Badges 2.0 format
   * @param issuer The issuer object
   * @returns A serialized issuer in Open Badges 2.0 format
   */
  serializeIssuer(issuer: IssuerData): IssuerData & { '@context': string; type: string } {
    return {
      '@context': BADGE_VERSION_CONTEXTS[BadgeVersion.V2],
      id: issuer.id as Shared.IRI,
      type: 'Issuer',
      name: issuer.name,
      url: issuer.url as Shared.IRI,
      ...(issuer.email && { email: issuer.email }),
      ...(issuer.description && { description: issuer.description }),
      ...(issuer.image && { image: issuer.image }),
      ...(issuer.publicKey && { publicKey: issuer.publicKey })
    };
  }

  /**
   * Serializes a badge class to Open Badges 2.0 format
   * @param badgeClass The badge class object
   * @returns A serialized badge class in Open Badges 2.0 format
   */
  serializeBadgeClass(badgeClass: BadgeClassData): BadgeClassData & { '@context': string; type: string } {
    return {
      '@context': BADGE_VERSION_CONTEXTS[BadgeVersion.V2],
      id: badgeClass.id as Shared.IRI,
      type: 'BadgeClass',
      name: badgeClass.name,
      description: badgeClass.description,
      image: badgeClass.image as Shared.IRI,
      criteria: badgeClass.criteria,
      issuer: badgeClass.issuer as Shared.IRI,
      ...(badgeClass.alignment && { alignment: badgeClass.alignment }),
      ...(badgeClass.tags && { tags: badgeClass.tags })
    };
  }

  /**
   * Serializes an assertion to Open Badges 2.0 format
   * @param assertion The assertion object
   * @param badgeClass Optional badge class for the assertion
   * @param issuer Optional issuer for the assertion
   * @returns A serialized assertion in Open Badges 2.0 format
   */
  serializeAssertion(
    assertion: AssertionData,
    badgeClass?: BadgeClassData
  ): AssertionData & { '@context': string; type: string } {
    // Create verification object if not present
    const verification = assertion.verification || {
      type: 'hosted',
      ...(assertion.id && { verificationProperty: assertion.id })
    };

    return {
      '@context': BADGE_VERSION_CONTEXTS[BadgeVersion.V2],
      id: assertion.id as Shared.IRI,
      type: 'Assertion',
      recipient: assertion.recipient,
      badgeClass: (assertion.badgeClass || badgeClass?.id) as Shared.IRI,
      verification: verification,
      issuedOn: assertion.issuedOn,
      ...(assertion.expires && { expires: assertion.expires }),
      ...(assertion.evidence && { evidence: assertion.evidence }),
      ...(assertion.revoked !== undefined && { revoked: assertion.revoked }),
      ...(assertion.revocationReason && { revocationReason: assertion.revocationReason })
    };
  }

  /**
   * Gets the badge version supported by this serializer
   * @returns The badge version (2.0)
   */
  getVersion(): BadgeVersion {
    return BadgeVersion.V2;
  }
}

/**
 * Serializer for Open Badges 3.0
 */
export class OpenBadges3Serializer implements BadgeSerializer {
  /**
   * Serializes an issuer to Open Badges 3.0 format
   * @param issuer The issuer object
   * @returns A serialized issuer in Open Badges 3.0 format
   */
  serializeIssuer(issuer: IssuerData): IssuerData & { '@context': string; type: string } {
    return {
      '@context': BADGE_VERSION_CONTEXTS[BadgeVersion.V3],
      id: issuer.id as Shared.IRI,
      type: 'Profile',
      name: issuer.name,
      url: issuer.url as Shared.IRI,
      ...(issuer.email && { email: issuer.email }),
      ...(issuer.description && { description: issuer.description }),
      ...(issuer.image && { image: issuer.image }),
      ...(issuer.publicKey && { publicKey: issuer.publicKey })
    };
  }

  /**
   * Serializes a badge class to Open Badges 3.0 format
   * @param badgeClass The badge class object
   * @returns A serialized badge class in Open Badges 3.0 format
   */
  serializeBadgeClass(badgeClass: BadgeClassData): BadgeClassData & { '@context': string; type: string } {
    return {
      '@context': BADGE_VERSION_CONTEXTS[BadgeVersion.V3],
      id: badgeClass.id as Shared.IRI,
      type: 'BadgeClass',
      issuer: badgeClass.issuer as Shared.IRI,
      name: badgeClass.name,
      description: badgeClass.description,
      image: badgeClass.image as Shared.IRI,
      criteria: badgeClass.criteria,
      ...(badgeClass.alignment && { alignment: badgeClass.alignment }),
      ...(badgeClass.tags && { tags: badgeClass.tags })
    };
  }

  /**
   * Serializes an assertion to Open Badges 3.0 format
   * @param assertion The assertion object
   * @param badgeClass Optional badge class for the assertion
   * @param issuer Optional issuer for the assertion
   * @returns A serialized assertion in Open Badges 3.0 format
   */
  serializeAssertion(
    assertion: AssertionData,
    badgeClass?: BadgeClassData,
    issuer?: IssuerData
  ): AssertionData & { '@context': string; type: string } | VerifiableCredentialData {
    // If we have all the necessary components, create a VerifiableCredential
    if (badgeClass && issuer) {
      return this.createVerifiableCredential(assertion, badgeClass, issuer);
    }

    // Otherwise, create a basic Assertion
    return {
      '@context': BADGE_VERSION_CONTEXTS[BadgeVersion.V3],
      id: assertion.id as Shared.IRI,
      type: 'Assertion',
      badgeClass: (assertion.badgeClass || badgeClass?.id) as Shared.IRI,
      recipient: assertion.recipient,
      issuedOn: assertion.issuedOn,
      ...(assertion.expires && { expires: assertion.expires }),
      ...(assertion.evidence && { evidence: assertion.evidence }),
      ...(assertion.verification && { verification: assertion.verification }),
      ...(assertion.revoked !== undefined && { revoked: assertion.revoked }),
      ...(assertion.revocationReason && { revocationReason: assertion.revocationReason })
    };
  }

  /**
   * Creates a Verifiable Credential representation of an assertion
   * @param assertion The assertion object
   * @param badgeClass The badge class object
   * @param issuer The issuer object
   * @returns A Verifiable Credential representation of the assertion
   */
  private createVerifiableCredential(
    assertion: AssertionData,
    badgeClass: BadgeClassData,
    issuer: IssuerData
  ): VerifiableCredentialData {
    return {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        BADGE_VERSION_CONTEXTS[BadgeVersion.V3]
      ],
      id: assertion.id as Shared.IRI,
      type: ['VerifiableCredential', 'OpenBadgeCredential'],
      issuer: {
        id: issuer.id as Shared.IRI,
        type: issuer.type || 'Profile',
        name: issuer.name,
        url: issuer.url as Shared.IRI,
        ...(issuer.email && { email: issuer.email }),
        ...(issuer.description && { description: issuer.description }),
        ...(issuer.image && { image: issuer.image })
      },
      issuanceDate: assertion.issuedOn,
      ...(assertion.expires && { expirationDate: assertion.expires }),
      credentialSubject: {
        id: assertion.recipient.identity,
        type: 'AchievementSubject',
        achievement: {
          id: badgeClass.id as Shared.IRI,
          type: 'Achievement',
          name: badgeClass.name,
          description: badgeClass.description,
          image: badgeClass.image as Shared.IRI,
          criteria: badgeClass.criteria,
          ...(badgeClass.alignment && { alignments: badgeClass.alignment }),
          ...(badgeClass.tags && { tags: badgeClass.tags })
        }
      },
      ...(assertion.evidence && { evidence: assertion.evidence }),
      ...(assertion.verification && {
        proof: {
          type: assertion.verification.type,
          created: assertion.verification.created,
          verificationMethod: assertion.verification.creator,
          proofPurpose: 'assertionMethod',
          proofValue: assertion.verification.signatureValue
        }
      }),
      ...(assertion.revoked !== undefined && {
        credentialStatus: {
          id: `${assertion.id}#status` as Shared.IRI,
          type: 'StatusList2021Entry',
          statusPurpose: 'revocation',
          statusListIndex: '0',
          statusListCredential: `${assertion.id}#list` as Shared.IRI
        }
      })
    };
  }

  /**
   * Gets the badge version supported by this serializer
   * @returns The badge version (3.0)
   */
  getVersion(): BadgeVersion {
    return BadgeVersion.V3;
  }
}

/**
 * Factory for creating badge serializers
 */
export class BadgeSerializerFactory {
  /**
   * Creates a serializer for the specified badge version
   * @param version The badge version
   * @returns A serializer for the specified version
   */
  static createSerializer(version: BadgeVersion): BadgeSerializer {
    switch (version) {
      case BadgeVersion.V2:
        return new OpenBadges2Serializer();
      case BadgeVersion.V3:
        return new OpenBadges3Serializer();
      default:
        throw new Error(`Unsupported badge version: ${version}`);
    }
  }
}
