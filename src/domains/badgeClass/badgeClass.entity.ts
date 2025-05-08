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
  issuer: Shared.IRI | OB3.Issuer;
  name: string | Shared.MultiLanguageString;
  description?: string | Shared.MultiLanguageString;
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
      name: this.name, // MultiLanguageString is valid for OB3
      description: this.description || '',
      image: this.image,
      criteria: this.criteria,
      alignment: this.alignment,
      tags: this.tags,
    };

    // Add version-specific properties
    if (version === BadgeVersion.V2) {
      // For OB2, ensure name and description are strings
      const name = typeof this.name === 'string' ? this.name : Object.values(this.name)[0] || '';
      const description = typeof this.description === 'string' ? this.description :
                         (this.description ? Object.values(this.description)[0] || '' : '');

      // OB2 BadgeClass
      return {
        ...baseObject,
        type: 'BadgeClass',
        name, // Ensure string for OB2
        description, // Ensure string for OB2
        issuer: typeof this.issuer === 'string' ? this.issuer : this.issuer?.id, // Ensure IRI for OB2
      } as OB2.BadgeClass;
    } else {
      // OB3 Achievement
      return {
        ...baseObject,
        type: 'Achievement',
        issuer: this.issuer, // Can be IRI or Issuer object for OB3
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

    // Handle issuer based on version and type
    let issuerValue: Shared.IRI | Record<string, unknown>;
    if (typeof this.issuer === 'string') {
      issuerValue = this.issuer;
    } else if (version === BadgeVersion.V2) {
      // For OB2, we need just the IRI
      issuerValue = this.issuer?.id as Shared.IRI;
    } else {
      // For OB3, we can use the full issuer object
      issuerValue = this.issuer as Record<string, unknown>;
    }

    // Handle name and description based on version
    let nameValue: string | Shared.MultiLanguageString;
    let descriptionValue: string | Shared.MultiLanguageString;

    if (version === BadgeVersion.V2) {
      // For OB2, ensure name and description are strings
      nameValue = typeof this.name === 'string' ? this.name : Object.values(this.name)[0] || '';
      descriptionValue = typeof this.description === 'string' ? this.description :
                        (this.description ? Object.values(this.description)[0] || '' : '');
    } else {
      // For OB3, we can use MultiLanguageString
      nameValue = this.name;
      descriptionValue = this.description || '';
    }

    // Use direct properties instead of typedData to avoid type issues
    const dataForSerializer: BadgeClassData = {
      id: this.id,
      issuer: issuerValue,
      name: nameValue,
      description: descriptionValue,
      image: this.image || '', // Ensure image is never undefined
      criteria: this.criteria || '',
      // Add other required fields
      alignment: this.alignment,
      tags: this.tags,
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
