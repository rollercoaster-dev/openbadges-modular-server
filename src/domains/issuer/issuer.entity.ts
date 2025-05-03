/**
 * Version-agnostic Issuer entity for Open Badges API
 * 
 * This file defines the Issuer domain entity that can represent both
 * Open Badges 2.0 and 3.0 specifications.
 */

import { OB2, OB3, Shared } from 'openbadges-types';
import { v4 as uuidv4 } from 'uuid';
import { IssuerData } from '../../utils/types/badge-data.types';
import { BadgeVersion } from '../../utils/version/badge-version';
import { BadgeSerializerFactory } from '../../utils/version/badge-serializer';

/**
 * Issuer entity representing an organization or individual that issues badges
 * Compatible with both Open Badges 2.0 and 3.0
 */
export class Issuer implements Omit<Partial<OB2.Profile>, 'image'>, Omit<Partial<OB3.Issuer>, 'image'> {
  id: Shared.IRI;
  type: string = 'Profile';
  name: string;
  url: Shared.IRI;
  email?: string;
  description?: string;
  image?: Shared.IRI | OB2.Image | Shared.OB3ImageObject;
  publicKey?: Record<string, unknown>;
  [key: string]: unknown;

  /**
   * Private constructor to enforce creation through factory method
   */
  private constructor(data: Partial<Issuer>) {
    Object.assign(this, data);
  }

  /**
   * Factory method to create a new Issuer instance
   * @param data The issuer data
   * @returns A new Issuer instance
   */
  static create(data: Partial<Issuer>): Issuer {
    // Generate ID if not provided
    if (!data.id) {
      data.id = uuidv4() as Shared.IRI;
    }

    // Set default type if not provided
    if (!data.type) {
      data.type = 'Profile';
    }

    return new Issuer(data);
  }

  /**
   * Converts the issuer to a plain object
   * @returns A plain object representation of the issuer, compatible with OB2.Profile and OB3.Issuer
   */
  toObject(): OB2.Profile | OB3.Issuer {
    // Note: Returning a direct shallow copy. Minor discrepancies might exist 
    // with strict OB2/OB3 types (e.g., 'type' property, 'publicKey' structure), 
    // but this is generally compatible for serialization.
    return { ...this } as OB2.Profile | OB3.Issuer;
  }

  /**
   * Returns a partial representation of the issuer's internal state.
   * Suitable for use cases like updates where only a subset of properties is needed.
   * @returns A shallow copy of the issuer object as Partial<Issuer>.
   */
  toPartial(): Partial<Issuer> {
    // Return a shallow copy of the internal state
    return { ...this };
  }

  /**
   * Converts the issuer to a JSON-LD representation in the specified version
   * @param version The badge version to use (defaults to 3.0)
   * @returns A JSON-LD representation of the issuer
   */
  toJsonLd(version: BadgeVersion = BadgeVersion.V3): Record<string, unknown> {
    const serializer = BadgeSerializerFactory.createSerializer(version);
    // Use toPartial() for serialization to ensure correct types are passed
    // The serializer expects IssuerData, which aligns with Partial<Issuer>
    return serializer.serializeIssuer(this.toPartial() as IssuerData);
  }

  /**
   * Gets a property value
   * @param property The property name
   * @returns The property value or undefined if not found
   */
  getProperty(property: string): unknown {
    return this[property];
  }
}
