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
import { AssertionData, BadgeClassData, IssuerData } from '../../utils/types/badge-data.types';

/**
 * Assertion entity representing a badge awarded to a recipient
 * Compatible with both Open Badges 2.0 and 3.0
 */
export class Assertion {
  // Note: We're not implementing the interfaces directly due to type conflicts
  // between OB2 and OB3 specifications
  id: Shared.IRI;
  type: string = 'Assertion';
  badgeClass: Shared.IRI;
  recipient: OB2.IdentityObject | OB3.CredentialSubject;
  issuedOn: string;
  expires?: string;
  evidence?: OB2.Evidence[] | OB3.Evidence[];
  verification?: OB2.VerificationObject | OB3.Proof | OB3.CredentialStatus;
  revoked?: boolean;
  revocationReason?: string;
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
   * @returns A plain object representation of the assertion, compatible with OB2.Assertion and OB3.VerifiableCredential
   */
  toObject(): Record<string, unknown> {
    // Note: This returns a direct shallow copy. Minor discrepancies might exist
    // with strict OB2/OB3 types, but this is generally compatible for serialization.
    return { ...this };
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
    badgeClass?: OB2.BadgeClass | OB3.Achievement,
    issuer?: OB2.Profile | OB3.Issuer
  ): OB2.Assertion | OB3.VerifiableCredential {
    const serializer = BadgeSerializerFactory.createSerializer(version);
    
    // Cast our entity to the expected data structure
    // This is safe because our entity properties match the AssertionData interface
    const assertionData = this.toObject() as unknown as AssertionData;
    
    // Cast the optional parameters to their expected types
    const typedBadgeClass = badgeClass as unknown as BadgeClassData;
    const typedIssuer = issuer as unknown as IssuerData;
    
    // Then serialize with the appropriate serializer
    return serializer.serializeAssertion(
      assertionData,
      typedBadgeClass,
      typedIssuer
    ) as unknown as OB2.Assertion | OB3.VerifiableCredential;
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
