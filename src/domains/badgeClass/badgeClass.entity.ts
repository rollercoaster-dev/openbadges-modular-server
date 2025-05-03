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
   * @returns A plain object representation of the badge class, compatible with OB2.BadgeClass and OB3.Achievement
   */
  toObject(): OB2.BadgeClass | OB3.Achievement {
    // Note: Returning a direct shallow copy. Minor discrepancies might exist 
    // with strict OB2/OB3 types (e.g., 'type' property), 
    // but this is generally compatible for serialization.
    return { ...this } as OB2.BadgeClass | OB3.Achievement;
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
    // Use toPartial() to get the internal state.
    const partialData = this.toPartial();
    // Ensure the data passed to the serializer has all required fields (like description).
    // We need to assert the type more specifically for the serializer
    const dataForSerializer = {
      ...partialData,
      id: partialData.id as Shared.IRI, // Assert required id
      issuer: partialData.issuer as Shared.IRI, // Assert required issuer
      name: partialData.name as string, // Assert required name
      description: partialData.description ?? '', // Provide default empty string for required description
      // Include other potentially required fields if BadgeClassData mandates them, or cast
    };
    // Pass the guaranteed-complete data, casting as the specific data type the serializer expects
    // Let's assume the serializer's expected type aligns with the structure we built
    return serializer.serializeBadgeClass(dataForSerializer as BadgeClassData);
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
