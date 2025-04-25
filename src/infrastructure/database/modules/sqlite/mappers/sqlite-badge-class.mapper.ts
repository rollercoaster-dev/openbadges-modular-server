/**
 * SQLite mapper for the BadgeClass domain entity
 *
 * This class implements the Data Mapper pattern for the BadgeClass entity,
 * handling the conversion between domain entities and database records.
 */

import { BadgeClass } from '../../../../../domains/badgeClass/badgeClass.entity';
import { Shared } from 'openbadges-types';
import { convertJson, convertTimestamp, convertUuid } from '../../../utils/type-conversion';

export class SqliteBadgeClassMapper {
  /**
   * Converts a database record to a domain entity
   * @param record The database record
   * @returns A BadgeClass domain entity
   */
  toDomain(record: any): BadgeClass {
    if (!record) return null as any;

    // Extract the standard fields from the record
    const {
      id,
      issuerId,
      name,
      description,
      image,
      criteria,
      alignment,
      tags,
      additionalFields = {}
    } = record;

    // Create and return the domain entity
    return BadgeClass.create({
      id: convertUuid(id, 'sqlite', 'from') as Shared.IRI,
      issuer: convertUuid(issuerId, 'sqlite', 'from') as Shared.IRI,
      name,
      description,
      image: typeof image === 'string' ? image as Shared.IRI : image,
      criteria: convertJson(criteria, 'sqlite', 'from'),
      alignment: convertJson(alignment, 'sqlite', 'from'),
      tags: convertJson(tags, 'sqlite', 'from'),
      ...convertJson(additionalFields, 'sqlite', 'from')
    });
  }

  /**
   * Converts a domain entity to a database record
   * @param entity The BadgeClass domain entity
   * @returns A database record
   */
  toPersistence(entity: BadgeClass): any {
    if (!entity) return null;

    // Convert the entity to a plain object
    const obj = entity.toObject();

    // Extract the standard fields
    const {
      id,
      issuer,
      name,
      description,
      image,
      criteria,
      alignment,
      tags,
      ...additionalFields
    } = obj;

    // Create and return the database record
    return {
      id: convertUuid(id, 'sqlite', 'to'),
      issuerId: convertUuid(issuer as string, 'sqlite', 'to'),
      name,
      description,
      image,
      criteria: convertJson(criteria, 'sqlite', 'to'),
      alignment: convertJson(alignment, 'sqlite', 'to'),
      tags: convertJson(tags, 'sqlite', 'to'),
      additionalFields: convertJson(additionalFields, 'sqlite', 'to'),
      updatedAt: convertTimestamp(new Date(), 'sqlite', 'to')
    };
  }
}
