/**
 * Version-agnostic BadgeClass entity for Open Badges API
 *
 * This file defines the BadgeClass domain entity that can represent both
 * Open Badges 2.0 and 3.0 specifications.
 */

import { OB2, OB3, Shared } from 'openbadges-types';
import { v4 as uuidv4 } from 'uuid';
import { BadgeVersion } from '../../utils/version/badge-version';
import { BadgeSerializerFactory } from '../../utils/version/badge-serializer';
import { BadgeClassData } from '../../utils/types/badge-data.types';

/**
 * BadgeClass entity representing a type of badge that can be issued
 * Compatible with both Open Badges 2.0 and 3.0
 */
export class BadgeClass implements Omit<Partial<OB2.BadgeClass>, 'image'>, Omit<Partial<OB3.Achievement>, 'image'> {
  id: Shared.IRI;
  type: string = 'BadgeClass';
  issuer: Shared.IRI;
  name: string;
  description?: string;
  image?: Shared.IRI | Shared.OB3ImageObject;
  criteria?: OB2.Criteria | OB3.Criteria;
  alignment?: OB2.AlignmentObject[] | OB3.Alignment[];
  tags?: string[];
  [key: string]: unknown;

  /**
   * Private constructor to enforce creation through factory method
   */
  private constructor(data: Partial<BadgeClass>) {
    Object.assign(this, data);
  }

  /**
   * Factory method to create a new BadgeClass instance
   * @param data The badge class data
   * @returns A new BadgeClass instance
   */
  static create(data: Partial<BadgeClass>): BadgeClass {
    // Generate ID if not provided
    if (!data.id) {
      data.id = uuidv4() as Shared.IRI;
    }

    // Set default type if not provided
    if (!data.type) {
      data.type = 'BadgeClass';
    }

    return new BadgeClass(data);
  }

  /**
   * Converts the badge class to a plain object
   * @param version The badge version to use (defaults to 3.0)
   * @returns A plain object representation of the badge class, properly typed as OB2.BadgeClass or OB3.Achievement
   */
  toObject(version: BadgeVersion = BadgeVersion.V3): OB2.BadgeClass | OB3.Achievement {
    // Create a base object with common properties
    const baseObject = {
      id: this.id,
      name: this.name,
      description: this.description || '',
      image: this.image,
      criteria: this.criteria,
      alignment: this.alignment,
      tags: this.tags,
    };

    // Add version-specific properties
    if (version === BadgeVersion.V2) {
      // OB2 BadgeClass
      return {
        ...baseObject,
        type: 'BadgeClass',
        issuer: this.issuer,
      } as OB2.BadgeClass;
    } else {
      // OB3 Achievement
      return {
        ...baseObject,
        type: 'Achievement',
        issuer: this.issuer,
      } as OB3.Achievement;
    }
  }

  /**
   * Returns a shallow copy of the internal state suitable for the create method.
   * @returns A Partial<BadgeClass> representing the internal state.
   */
  toPartial(): Partial<BadgeClass> {
    // Return a shallow copy of the current instance's properties.
    // This represents the internal state expected by the static create method.
    return { ...this };
  }

  /**
   * Converts the badge class to a JSON-LD representation in the specified version
   * @param version The badge version to use (defaults to 3.0)
   * @returns A JSON-LD representation of the badge class
   */
  toJsonLd(version: BadgeVersion = BadgeVersion.V3): Record<string, unknown> {
    const serializer = BadgeSerializerFactory.createSerializer(version);

    // Use toObject() with the specified version to get properly typed data
    const typedData = this.toObject(version);

    // Ensure the data has all required fields for the serializer
    const dataForSerializer: BadgeClassData = {
      ...typedData,
      id: typedData.id,
      issuer: typedData.issuer,
      name: typedData.name,
      description: typedData.description || '', // Ensure description is never undefined
      image: typedData.image || '', // Ensure image is never undefined
    };

    // Pass the properly typed data to the serializer
    return serializer.serializeBadgeClass(dataForSerializer);
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
