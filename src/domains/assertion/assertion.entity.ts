/**
 * Version-agnostic Assertion entity for Open Badges API
 *
 * This file defines the Assertion domain entity that can represent both
 * Open Badges 2.0 and 3.0 specifications.
 */

import { Shared, OB2, OB3 } from 'openbadges-types';
import { v4 as uuidv4 } from 'uuid';
import { BadgeVersion } from '../../utils/version/badge-version';
import { BadgeSerializerFactory } from '../../utils/version/badge-serializer';
import { AssertionData, RecipientData, VerificationData } from '../../utils/types/badge-data.types';
import type { BadgeClassData, IssuerData } from '../../utils/types/badge-data.types';
import { BadgeClass } from '../badgeClass/badgeClass.entity';
import { Issuer } from '../issuer/issuer.entity';
import { toIRI } from '../../utils/types/iri-utils';

/**
 * Assertion entity representing a badge awarded to a recipient
 * Compatible with both Open Badges 2.0 and 3.0
 */
export class Assertion {
  // Note: We're not implementing the interfaces directly due to type conflicts
  // between OB2 and OB3 specifications
  id: Shared.IRI;
  type: string | string[] = 'Assertion';
  badgeClass: Shared.IRI;
  recipient: OB2.IdentityObject | OB3.CredentialSubject;
  issuedOn: string;
  expires?: string;
  evidence?: OB2.Evidence[] | OB3.Evidence[];
  verification?: OB2.VerificationObject | OB3.Proof | OB3.CredentialStatus;
  revoked?: boolean;
  revocationReason?: string;
  issuer?: Shared.IRI;
  [key: string]: unknown;

  /**
   * Private constructor to enforce creation through factory method
   */
  private constructor(data: Partial<Assertion>) {
    Object.assign(this, data);
  }

  /**
   * Factory method to create a new Assertion instance
   * @param data The assertion data
   * @returns A new Assertion instance
   */
  static create(data: Partial<Assertion>): Assertion {
    // Generate ID if not provided
    if (!data.id) {
      data.id = uuidv4() as Shared.IRI;
    }

    // Set default type if not provided
    if (!data.type) {
      data.type = 'Assertion';
    }

    // Set default verification if not provided
    if (!data.verification) {
      data.verification = {
        type: 'hosted'
      };
    }

    return new Assertion(data);
  }

  /**
   * Converts the assertion to a plain object
   * @param version The badge version to use (defaults to 3.0)
   * @returns A plain object representation of the assertion, properly typed as OB2.Assertion or OB3.VerifiableCredential
   */
  toObject(version: BadgeVersion = BadgeVersion.V3): OB2.Assertion | OB3.VerifiableCredential {
    // Create a base object with common properties
    const baseObject = {
      id: this.id,
      recipient: this.recipient,
      issuedOn: this.issuedOn,
      expires: this.expires,
      evidence: this.evidence,
      revoked: this.revoked,
      revocationReason: this.revocationReason,
    };

    // Add version-specific properties
    if (version === BadgeVersion.V2) {
      // OB2 Assertion
      return {
        ...baseObject,
        type: 'Assertion',
        badge: this.badgeClass, // In OB2, badge is the IRI of the BadgeClass
        verification: this.verification as OB2.VerificationObject,
      } as OB2.Assertion;
    } else {
      // OB3 VerifiableCredential
      // Create a properly typed OB3 VerifiableCredential
      // We need to cast to unknown first because the OB3 types are more strict
      const ob3Data = {
        ...baseObject,
        type: 'VerifiableCredential',
        badge: this.badgeClass, // In OB3, badge is the IRI of the Achievement
        verification: this.verification as OB3.Proof,
        // Add required OB3 properties
        '@context': 'https://www.w3.org/2018/credentials/v1',
        // Cast to proper types for OB3
        issuer: this.issuer as Shared.IRI,
        // OB3 uses string for dates but with a specific format
        issuanceDate: this.issuedOn,
        // Create a proper CredentialSubject with required achievement property
        // First cast to unknown to avoid type errors
        credentialSubject: {
          id: toIRI((this.recipient as OB2.IdentityObject).identity || ''),
          type: 'AchievementSubject',
          achievement: this.badgeClass,
        } as unknown as OB3.CredentialSubject,
      };
      return ob3Data as OB3.VerifiableCredential;
    }
  }

  /**
   * Converts the assertion to a JSON-LD representation in the specified version
   * @param version The badge version to use (defaults to 3.0)
   * @param badgeClass Optional badge class for the assertion
   * @param issuer Optional issuer for the assertion
   * @returns A JSON-LD representation of the assertion
   */
  toJsonLd(
    version: BadgeVersion = BadgeVersion.V3,
    badgeClass?: BadgeClass,
    issuer?: Issuer
  ): OB2.Assertion | OB3.VerifiableCredential {
    const serializer = BadgeSerializerFactory.createSerializer(version);

    // Convert directly to AssertionData format expected by serializer
    const assertionData: AssertionData = {
      id: this.id,
      badgeClass: this.badgeClass,
      recipient: this.recipient as RecipientData,
      issuedOn: this.issuedOn,
      // Add other properties as needed
      expires: this.expires,
      evidence: this.evidence,
      verification: this.verification as VerificationData,
    };

    // Get JSON-LD representation from passed entities if they exist
    const typedBadgeClass = badgeClass
      ? badgeClass.toJsonLd(version) as BadgeClassData
      : undefined;
    const typedIssuer = issuer
      ? issuer.toJsonLd(version) as IssuerData
      : undefined;

    // Then serialize with the appropriate serializer
    const output = serializer.serializeAssertion(
      assertionData,
      typedBadgeClass, // Pass the potentially undefined typed data
      typedIssuer // Pass the potentially undefined typed data
    ) as unknown as Record<string, unknown>;

    // For Open Badges 3 (VerifiableCredential), alias badgeClass to badge and include verification
    if (version === BadgeVersion.V3) {
      if ('badgeClass' in output) {
        output['badge'] = output['badgeClass'];
        delete output['badgeClass'];
      }
      // Ensure verification is included
      if (assertionData.verification) {
        output['verification'] = assertionData.verification;
      }
    }

    return output as OB2.Assertion | OB3.VerifiableCredential;
  }

  /**
   * Gets a property value
   * @param property The property name
   * @returns The property value or undefined if not found
   */
  getProperty(property: string): unknown {
    return this[property];
  }

  /**
   * Checks if the assertion is valid (not expired, not revoked)
   * @returns True if the assertion is valid, false otherwise
   */
  isValid(): boolean {
    // Check if revoked
    if (this.revoked) {
      return false;
    }

    // Check if expired
    if (this.expires) {
      const expiryDate = new Date(this.expires);
      const now = new Date();
      if (expiryDate < now) {
        return false;
      }
    }

    return true;
  }
}
