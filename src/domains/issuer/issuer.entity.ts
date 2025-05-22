/**
 * Version-agnostic Issuer entity for Open Badges API
 *
 * This file defines the Issuer domain entity that can represent both
 * Open Badges 2.0 and 3.0 specifications.
 */

import { OB2, OB3, Shared } from 'openbadges-types';
import { IssuerData } from '../../utils/types/badge-data.types';
import { BadgeVersion } from '../../utils/version/badge-version';
import { BadgeSerializerFactory } from '../../utils/version/badge-serializer';
import { VC_V2_CONTEXT_URL } from '@/constants/urls';
import { createOrGenerateIRI } from '@utils/types/iri-utils';

/**
 * Issuer entity representing an organization or individual that issues badges
 * Compatible with both Open Badges 2.0 and 3.0
 */
export class Issuer
  implements
    Omit<Partial<OB2.Profile>, 'image'>,
    Omit<Partial<OB3.Issuer>, 'image'>
{
  id: Shared.IRI;
  type: string = 'Issuer'; // Changed from 'Profile' to 'Issuer' for OBv3 compliance
  name: string | Shared.MultiLanguageString;
  url: Shared.IRI;
  email?: string;
  description?: string | Shared.MultiLanguageString;
  image?: Shared.IRI | OB2.Image | Shared.OB3ImageObject;
  telephone?: string; // Added for OBv3 compliance
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
      data.id = createOrGenerateIRI();
    }

    // Set default type if not provided
    if (!data.type) {
      data.type = 'Issuer'; // Changed from 'Profile' to 'Issuer' for OBv3 compliance
    }

    return new Issuer(data);
  }

  /**
   * Converts the issuer to a plain object
   * @param version The badge version to use (defaults to 3.0)
   * @returns A plain object representation of the issuer, properly typed as OB2.Profile or OB3.Issuer
   */
  toObject(version: BadgeVersion = BadgeVersion.V3): OB2.Profile | OB3.Issuer {
    // For OB2, ensure name and description are strings
    let nameValue: string | Shared.MultiLanguageString = this.name;
    let descriptionValue: string | Shared.MultiLanguageString =
      this.description || '';

    if (version === BadgeVersion.V2) {
      // Convert MultiLanguageString to string for OB2
      nameValue =
        typeof this.name === 'string'
          ? this.name
          : Object.values(this.name)[0] || '';
      descriptionValue =
        typeof this.description === 'string'
          ? this.description
          : this.description
          ? Object.values(this.description)[0] || ''
          : '';
    }

    // Create a base object with common properties
    const baseObject = {
      id: this.id,
      name: nameValue,
      url: this.url,
      email: this.email,
      description: descriptionValue,
      image: this.image,
    };

    // Add version-specific properties
    if (version === BadgeVersion.V2) {
      // OB2 Profile
      return {
        ...baseObject,
        type: 'Issuer', // Consistent with OB2 spec
      } as OB2.Profile;
    } else {
      // OB3 Issuer
      return {
        ...baseObject,
        type: 'Issuer', // Changed from 'Profile' to 'Issuer' for OBv3 compliance
        telephone: this.telephone, // Add telephone for OB3
      } as OB3.Issuer;
    }
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

    // Handle name and description based on version
    let nameValue: string | Shared.MultiLanguageString;
    let descriptionValue: string | Shared.MultiLanguageString;

    if (version === BadgeVersion.V2) {
      // For OB2, ensure name and description are strings
      nameValue =
        typeof this.name === 'string'
          ? this.name
          : Object.values(this.name)[0] || '';
      descriptionValue =
        typeof this.description === 'string'
          ? this.description
          : this.description
          ? Object.values(this.description)[0] || ''
          : '';
    } else {
      // For OB3, we can use MultiLanguageString
      nameValue = this.name;
      descriptionValue = this.description || '';
    }

    // Use direct properties instead of typedData to avoid type issues
    const dataForSerializer: IssuerData = {
      id: this.id,
      name: nameValue,
      url: this.url as Shared.IRI,
      // Add other fields
      email: this.email,
      description: descriptionValue,
      image: this.image,
      telephone: version === BadgeVersion.V3 ? this.telephone : undefined, // Only include for OB3
      type: version === BadgeVersion.V2 ? 'Issuer' : 'Issuer', // Consistent type for both versions
    };

    // Pass the properly typed data to the serializer
    const jsonLd = serializer.serializeIssuer(dataForSerializer);

    // Ensure the context is set correctly for tests
    if (version === BadgeVersion.V3) {
      // Make sure context is an array for OB3
      if (!Array.isArray(jsonLd['@context'])) {
        jsonLd['@context'] = [jsonLd['@context']].filter(Boolean);
      }

      // Ensure both required contexts are present
      if (
        !jsonLd['@context'].includes(
          'https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json'
        )
      ) {
        jsonLd['@context'].push(
          'https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json'
        );
      }

      if (!jsonLd['@context'].includes(VC_V2_CONTEXT_URL)) {
        jsonLd['@context'].push(VC_V2_CONTEXT_URL);
      }
    }

    return jsonLd;
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
