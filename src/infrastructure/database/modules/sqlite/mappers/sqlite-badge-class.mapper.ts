/**
 * SQLite mapper for the BadgeClass domain entity
 *
 * This class implements the Data Mapper pattern for the BadgeClass entity,
 * handling the conversion between domain entities and database records.
 */

import {
  BadgeClass,
  Related,
  EndorsementCredential,
} from '@domains/badgeClass/badgeClass.entity';
import { Shared, OB2, OB3 } from 'openbadges-types';
import {
  convertJson,
  convertTimestamp,
  convertUuid,
} from '@infrastructure/database/utils/type-conversion';
import { normalizeCriteria } from '@utils/types/type-guards';

/**
 * Standard properties of a BadgeClass entity that should be excluded from additionalFields
 * This is externalized as a constant to facilitate future maintenance if new fields are added
 */
const BADGE_CLASS_STANDARD_PROPERTIES = new Set([
  'id',
  'type',
  'issuer',
  'name',
  'description',
  'image',
  'criteria',
  'alignment',
  'tags',
  'createdAt',
  'updatedAt',
  // Versioning fields
  'version',
  'previousVersion',
  // Relationship fields
  'related',
  'endorsement',
]);

// Explicitly define the record type matching SQLite schema
type SqliteBadgeClassRecord = {
  id: string; // text
  issuerId: string; // text
  name: string; // text, notNull
  description: string; // text, notNull
  image: string; // text, notNull
  criteria: string; // text (JSON), notNull
  alignment: string | null; // text (JSON)
  tags: string | null; // text (JSON)
  createdAt: number; // integer, notNull
  updatedAt: number; // integer, notNull
  additionalFields: string | null; // text (JSON)
  // Versioning fields (OB 3.0)
  version: string | null; // text
  previousVersion: string | null; // text
  // Relationship fields (OB 3.0)
  related: string | null; // text (JSON)
  endorsement: string | null; // text (JSON)
};

export class SqliteBadgeClassMapper {
  /**
   * Converts a database record to a domain entity
   * @param record The database record
   * @returns A BadgeClass domain entity
   */
  toDomain(record: Record<string, unknown>): BadgeClass {
    if (!record) return null as unknown as BadgeClass;

    // Extract fields with type assertions and defaults for notNull
    const id = convertUuid(record.id as string | undefined, 'sqlite', 'from');
    const issuerId = convertUuid(
      record.issuerId as string | undefined,
      'sqlite',
      'from'
    );
    const name = (record.name as string) ?? '';
    const description = (record.description as string) ?? '';
    const image = record.image; // Let BadgeClass.create handle IRI | OB3ImageObject

    // Handle criteria - can be either a string URL or a JSON object
    let rawCriteria: string | OB2.Criteria | OB3.Criteria;
    if (record.criteria) {
      const criteriaStr = record.criteria as string;
      // Check if it's a URL or a simple string
      try {
        new URL(criteriaStr);
        rawCriteria = criteriaStr; // Use as string URL
      } catch {
        // Try to parse as JSON, fallback to empty object if parsing fails
        rawCriteria = (convertJson(criteriaStr, 'sqlite', 'from') ?? {}) as
          | OB2.Criteria
          | OB3.Criteria;
      }
    } else {
      rawCriteria = {} as OB2.Criteria;
    }

    // Normalize criteria to ensure it's compatible with BadgeClass.create
    const normalizedCriteria = normalizeCriteria(rawCriteria);

    // Handle undefined result from normalizeCriteria and ensure proper type
    let criteria: OB2.Criteria | OB3.Criteria;
    if (!normalizedCriteria) {
      criteria = { narrative: 'No criteria specified' } as OB2.Criteria;
    } else if (typeof normalizedCriteria === 'string') {
      // If it's an IRI string, convert to criteria object
      criteria = { id: normalizedCriteria } as OB2.Criteria;
    } else {
      // It's already a criteria object
      criteria = normalizedCriteria;
    }
    const alignment = convertJson(record.alignment, 'sqlite', 'from');
    const tags = convertJson(record.tags, 'sqlite', 'from');
    const additionalFields =
      convertJson(record.additionalFields, 'sqlite', 'from') ?? {};

    // Extract versioning fields (OB 3.0)
    const version = record.version as string | undefined;
    const previousVersion = record.previousVersion as string | undefined;

    // Extract relationship fields (OB 3.0)
    const related = convertJson(record.related, 'sqlite', 'from') as
      | Related[]
      | undefined;
    const endorsement = convertJson(record.endorsement, 'sqlite', 'from') as
      | EndorsementCredential[]
      | undefined;

    // Create and return the domain entity
    return BadgeClass.create({
      id: id as Shared.IRI,
      issuer: issuerId as Shared.IRI,
      name: name,
      description: description,
      image:
        typeof image === 'string'
          ? (image as Shared.IRI)
          : (image as Shared.OB3ImageObject),
      criteria: criteria,
      alignment: alignment as OB2.AlignmentObject[] | undefined,
      tags: tags as string[] | undefined,
      // Versioning fields (OB 3.0)
      version,
      previousVersion: previousVersion
        ? (convertUuid(previousVersion, 'sqlite', 'from') as Shared.IRI)
        : undefined,
      // Relationship fields (OB 3.0)
      related,
      endorsement,
      ...((additionalFields as Record<string, unknown>) ?? {}),
    });
  }

  /**
   * Converts a domain entity to a database record
   * @param entity The BadgeClass domain entity
   * @param isNew Flag indicating if this is for a new record (sets createdAt)
   * @returns A database record compatible with SQLite schema
   */
  toPersistence(
    entity: BadgeClass,
    isNew: boolean = false
  ): SqliteBadgeClassRecord {
    if (!entity) {
      // Optionally throw an error or return a default/null record based on requirements
      // For now, returning null assertion to satisfy TS, but this path needs consideration
      return null as unknown as SqliteBadgeClassRecord;
    }

    // Use the externalized standard properties set for consistency

    // Extract additional fields
    const additionalFieldsData: Record<string, unknown> = {};
    for (const key in entity) {
      if (
        Object.prototype.hasOwnProperty.call(entity, key) &&
        !BADGE_CLASS_STANDARD_PROPERTIES.has(key)
      ) {
        additionalFieldsData[key] = entity[key];
      }
    }

    const now = new Date();
    const createdAtTimestamp = convertTimestamp(
      entity.createdAt instanceof Date ? entity.createdAt : now,
      'sqlite',
      'to'
    ) as number;
    const updatedAtTimestamp = convertTimestamp(now, 'sqlite', 'to') as number;

    // Directly construct object matching explicit type
    const record: SqliteBadgeClassRecord = {
      id: convertUuid(entity.id, 'sqlite', 'to') as string,
      issuerId: convertUuid(entity.issuer as string, 'sqlite', 'to') as string,
      name:
        typeof entity.name === 'object'
          ? JSON.stringify(entity.name)
          : String(entity.name),
      description:
        typeof entity.description === 'object'
          ? JSON.stringify(entity.description)
          : String(entity.description || ''),
      image:
        typeof entity.image === 'string'
          ? entity.image
          : typeof entity.image === 'object' &&
            entity.image !== null &&
            'id' in entity.image
          ? entity.image.id
          : '', // Default empty string for notNull image field
      criteria: (() => {
        // Handle criteria - can be either a string URL or an object
        if (!entity.criteria) {
          return '{}';
        }
        if (typeof entity.criteria === 'string') {
          // If it's a string URL, store it directly
          return entity.criteria;
        }
        // If it's an object, convert to JSON
        return (convertJson(entity.criteria, 'sqlite', 'to') ?? '{}') as string;
      })(),
      alignment: convertJson(entity.alignment, 'sqlite', 'to') as string | null,
      tags: convertJson(entity.tags, 'sqlite', 'to') as string | null,
      additionalFields:
        Object.keys(additionalFieldsData).length > 0
          ? (convertJson(additionalFieldsData, 'sqlite', 'to') as string)
          : null,
      // Use pre-calculated timestamps
      createdAt: isNew
        ? createdAtTimestamp
        : (convertTimestamp(
            (entity.createdAt ?? now) as Date,
            'sqlite',
            'to'
          ) as number),
      updatedAt: updatedAtTimestamp as number,
      // Versioning fields (OB 3.0)
      version: entity.version || null,
      previousVersion: entity.previousVersion
        ? (convertUuid(entity.previousVersion, 'sqlite', 'to') as string)
        : null,
      // Relationship fields (OB 3.0)
      related: entity.related
        ? (convertJson(entity.related, 'sqlite', 'to') as string)
        : null,
      endorsement: entity.endorsement
        ? (convertJson(entity.endorsement, 'sqlite', 'to') as string)
        : null,
    };

    return record;
  }
}
