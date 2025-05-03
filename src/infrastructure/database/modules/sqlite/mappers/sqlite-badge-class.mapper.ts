/**
 * SQLite mapper for the BadgeClass domain entity
 *
 * This class implements the Data Mapper pattern for the BadgeClass entity,
 * handling the conversion between domain entities and database records.
 */

import { BadgeClass } from '@domains/badgeClass/badgeClass.entity';
import { Shared, OB2 } from 'openbadges-types';
import { convertJson, convertTimestamp, convertUuid } from '@infrastructure/database/utils/type-conversion';

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
    const issuerId = convertUuid(record.issuerId as string | undefined, 'sqlite', 'from');
    const name = record.name as string ?? '';
    const description = record.description as string ?? '';
    const image = record.image; // Let BadgeClass.create handle IRI | OB3ImageObject
    // Convert JSON text, providing defaults for notNull (criteria)
    const criteria = convertJson(record.criteria, 'sqlite', 'from') ?? {}; 
    const alignment = convertJson(record.alignment, 'sqlite', 'from');
    const tags = convertJson(record.tags, 'sqlite', 'from');
    const additionalFields = convertJson(record.additionalFields, 'sqlite', 'from') ?? {};

    // Create and return the domain entity
    return BadgeClass.create({
      id: id as Shared.IRI,
      issuer: issuerId as Shared.IRI,
      name: name,
      description: description,
      image: typeof image === 'string' ? image as Shared.IRI : image as Shared.OB3ImageObject, 
      criteria: criteria,
      alignment: alignment as OB2.AlignmentObject[] | undefined, 
      tags: tags as string[] | undefined, 
      ...additionalFields as Record<string, unknown> ?? {}
    });
  }

  /**
   * Converts a domain entity to a database record
   * @param entity The BadgeClass domain entity
   * @param isNew Flag indicating if this is for a new record (sets createdAt)
   * @returns A database record compatible with SQLite schema
   */
  toPersistence(entity: BadgeClass, isNew: boolean = false): SqliteBadgeClassRecord {
    if (!entity) {
      // Optionally throw an error or return a default/null record based on requirements
      // For now, returning null assertion to satisfy TS, but this path needs consideration
      return null as unknown as SqliteBadgeClassRecord; 
    }

    const now = new Date();
    const createdAtTimestamp = convertTimestamp(entity.createdAt instanceof Date ? entity.createdAt : now, 'sqlite', 'to') as number;
    const updatedAtTimestamp = convertTimestamp(now, 'sqlite', 'to') as number;

    // Directly construct object matching explicit type
    const record: SqliteBadgeClassRecord = {
      id: convertUuid(entity.id, 'sqlite', 'to') as string,
      issuerId: convertUuid(entity.issuer as string, 'sqlite', 'to') as string,
      name: entity.name,
      description: entity.description,
      image: typeof entity.image === 'string' 
        ? entity.image 
        : typeof entity.image === 'object' && entity.image !== null && 'id' in entity.image 
        ? entity.image.id 
        : '', // Default empty string for notNull image field
      criteria: (convertJson(entity.criteria ?? {}, 'sqlite', 'to') ?? '{}') as string, 
      alignment: convertJson(entity.alignment, 'sqlite', 'to') as string | null, 
      tags: convertJson(entity.tags, 'sqlite', 'to') as string | null, 
      // Call getAdditionalFields directly
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Workaround for TS incorrectly inferring getAdditionalFields type/existence
      additionalFields: convertJson((entity as any).getAdditionalFields(), 'sqlite', 'to') as string | null, 
      // Use pre-calculated timestamps
      createdAt: isNew ? createdAtTimestamp : convertTimestamp((entity.createdAt ?? now) as Date, 'sqlite', 'to') as number, 
      updatedAt: updatedAtTimestamp as number,
    };

    return record;
  }
}
