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
  /**
   * The type of the badge class, which can be a single string or an array of strings.
   * - For Open Badges 2.0, this is 'BadgeClass' in the internal representation, but 'BadgeClass' in the output.
   * - For Open Badges 3.0, this is 'BadgeClass' in the internal representation, but 'Achievement' in the output.
   */
  type: string | string[] = 'BadgeClass';
  issuer: Shared.IRI | OB3.Issuer;
  name: string | Shared.MultiLanguageString;
  description?: string | Shared.MultiLanguageString;
  image?: Shared.IRI | Shared.OB3ImageObject;
  criteria?: OB2.Criteria | OB3.Criteria;
  alignment?: OB2.AlignmentObject[] | OB3.Alignment[];
  tags?: string[];

  // Optional OBv3 Achievement properties
  /**
   * The type of achievement, e.g., 'Certificate', 'Badge', 'Diploma'
   * Only used in OBv3 output
   */
  achievementType?: string;

  /**
   * Creator of the achievement (in addition to issuer)
   * Only used in OBv3 output
   */
  creator?: Shared.IRI | OB3.Issuer;

  /**
   * Descriptions of possible results for the achievement
   * Only used in OBv3 output
   */
  resultDescriptions?: OB3.ResultDescription[];

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
    // Handle name and description based on version
    let nameValue: string | Shared.MultiLanguageString = this.name;
    let descriptionValue: string | Shared.MultiLanguageString = this.description || '';

    if (version === BadgeVersion.V2) {
      // For OB2, ensure name and description are strings
      nameValue = typeof this.name === 'string' ? this.name : Object.values(this.name)[0] || '';
      descriptionValue = typeof this.description === 'string' ? this.description :
                       (this.description ? Object.values(this.description)[0] || '' : '');
    }

    // Handle criteria based on version
    let criteriaValue: Shared.IRI | OB2.Criteria | OB3.Criteria;

    if (this.criteria) {
      if (typeof this.criteria === 'string') {
        // If criteria is already an IRI string, use it directly
        criteriaValue = this.criteria;
      } else if (version === BadgeVersion.V2) {
        // For OB2, if criteria is an object, use it directly (OB2.Criteria)
        criteriaValue = this.criteria as OB2.Criteria;
      } else {
        // For OB3, ensure criteria conforms to OB3.Criteria
        const criteria = this.criteria as OB3.Criteria;
        if (!criteria.id && !criteria.narrative) {
          // If neither id nor narrative is present, create a minimal valid OB3.Criteria
          criteriaValue = {
            narrative: 'No criteria specified'
          } as OB3.Criteria;
        } else {
          // Use the criteria as is
          criteriaValue = criteria;
        }
      }
    } else {
      // Default empty criteria
      criteriaValue = version === BadgeVersion.V2 ? ('' as Shared.IRI) : { narrative: 'No criteria specified' } as OB3.Criteria;
    }

    // Create a base object with common properties
    const baseObject = {
      id: this.id,
      image: this.image,
      alignment: this.alignment,
      tags: this.tags,
    };

    // Add criteria based on version
    if (version === BadgeVersion.V2) {
      baseObject['criteria'] = criteriaValue;
    }

    // Add version-specific properties
    if (version === BadgeVersion.V2) {
      // OB2 BadgeClass
      return {
        ...baseObject,
        type: 'BadgeClass',
        name: nameValue as string, // Ensure string for OB2
        description: descriptionValue as string, // Ensure string for OB2
        issuer: typeof this.issuer === 'string' ? this.issuer : this.issuer?.id, // Ensure IRI for OB2
      } as OB2.BadgeClass;
    } else {
      // OB3 Achievement
      const achievement: Partial<OB3.Achievement> = {
        ...baseObject,
        type: 'Achievement',
        name: nameValue, // Can be string or MultiLanguageString for OB3
        description: descriptionValue, // Can be string or MultiLanguageString for OB3
        issuer: this.issuer, // Can be IRI or Issuer object for OB3
        criteria: criteriaValue as OB3.Criteria, // Use the OB3.Criteria we prepared
      };

      // Add optional OBv3 properties if they exist
      if (this.achievementType) {
        achievement.achievementType = this.achievementType;
      }

      if (this.creator) {
        achievement.creator = this.creator;
      }

      if (this.resultDescriptions) {
        achievement.resultDescriptions = this.resultDescriptions;
      }

      // Rename alignment to alignments for OB3 if it exists
      if (this.alignment) {
        achievement.alignments = this.alignment as OB3.Alignment[];
        delete achievement.alignment;
      }

      return achievement as OB3.Achievement;
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

    // Handle criteria based on version and type
    let criteriaValue: Shared.IRI | OB2.Criteria | OB3.Criteria;

    if (this.criteria) {
      if (typeof this.criteria === 'string') {
        // If criteria is already an IRI string, use it directly
        criteriaValue = this.criteria;
      } else if (version === BadgeVersion.V2) {
        // For OB2, if criteria is an object, use it directly (OB2.Criteria)
        criteriaValue = this.criteria as OB2.Criteria;
      } else {
        // For OB3, ensure criteria conforms to OB3.Criteria
        // OB3.Criteria requires either id or narrative
        const criteria = this.criteria as OB3.Criteria;
        if (!criteria.id && !criteria.narrative) {
          // If neither id nor narrative is present, create a minimal valid OB3.Criteria
          criteriaValue = {
            narrative: criteria.narrative || 'No criteria specified'
          };
        } else {
          // Use the criteria as is
          criteriaValue = criteria;
        }
      }
    } else {
      // Default empty criteria
      criteriaValue = version === BadgeVersion.V2 ? ('' as Shared.IRI) : { narrative: 'No criteria specified' } as OB3.Criteria;
    }

    // Use direct properties instead of typedData to avoid type issues
    const dataForSerializer: BadgeClassData = {
      id: this.id,
      issuer: issuerValue,
      name: nameValue,
      description: descriptionValue,
      image: this.image || '', // Ensure image is never undefined
      criteria: criteriaValue,
      // Add other required fields
      alignment: this.alignment,
      tags: this.tags,
    };

    // Add optional OBv3 properties if they exist and we're using OBv3
    if (version === BadgeVersion.V3) {
      if (this.achievementType) {
        dataForSerializer.achievementType = this.achievementType;
      }

      if (this.creator) {
        dataForSerializer.creator = this.creator;
      }

      if (this.resultDescriptions) {
        dataForSerializer.resultDescriptions = this.resultDescriptions;
      }
    }

    // Pass the properly typed data to the serializer
    const jsonLd = serializer.serializeBadgeClass(dataForSerializer);

    // Ensure the context is set correctly for tests
    if (version === BadgeVersion.V3) {
      // Make sure context is an array for OB3
      if (!Array.isArray(jsonLd['@context'])) {
        jsonLd['@context'] = [jsonLd['@context']].filter(Boolean);
      }

      // Ensure both required contexts are present
      if (!jsonLd['@context'].includes('https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json')) {
        jsonLd['@context'].push('https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json');
      }

      if (!jsonLd['@context'].includes('https://www.w3.org/ns/credentials/v2')) {
        jsonLd['@context'].push('https://www.w3.org/ns/credentials/v2');
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
