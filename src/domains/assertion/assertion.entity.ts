/**
 * Version-agnostic Assertion entity for Open Badges API
 * 
 * This file defines the Assertion domain entity that can represent both
 * Open Badges 2.0 and 3.0 specifications.
 */

import { OB2, OB3 } from 'openbadges-types';
import { v4 as uuidv4 } from 'uuid';
import { BadgeVersion } from '../../utils/version/badge-version';
import { BadgeSerializerFactory } from '../../utils/version/badge-serializer';

/**
 * Assertion entity representing a badge awarded to a recipient
 * Compatible with both Open Badges 2.0 and 3.0
 */
export class Assertion implements Partial<OB2.Assertion>, Partial<OB3.VerifiableCredential> {
  id: string;
  type: string = 'Assertion';
  badgeClass: string;
  recipient: {
    type: string;
    identity: string;
    hashed: boolean;
    salt?: string;
    [key: string]: any;
  };
  issuedOn: string;
  expires?: string;
  evidence?: OB2.Evidence[] | OB3.Evidence[];
  verification?: {
    type: string;
    creator?: string;
    created?: string;
    signatureValue?: string;
    verificationProperty?: string;
    startsWith?: string;
    allowedOrigins?: string | string[];
    [key: string]: any;
  };
  revoked?: boolean;
  revocationReason?: string;
  [key: string]: any;

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
      data.id = uuidv4();
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
   * @returns A plain object representation of the assertion
   */
  toObject(): Record<string, any> {
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
    badgeClass?: Record<string, any>,
    issuer?: Record<string, any>
  ): Record<string, any> {
    const serializer = BadgeSerializerFactory.createSerializer(version);
    return serializer.serializeAssertion(this.toObject(), badgeClass, issuer);
  }

  /**
   * Gets a property value
   * @param property The property name
   * @returns The property value or undefined if not found
   */
  getProperty(property: string): any {
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
