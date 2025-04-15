/**
 * PostgreSQL mapper for the BadgeClass domain entity
 *
 * This class implements the Data Mapper pattern for the BadgeClass entity,
 * handling the conversion between domain entities and database records.
 */

import { BadgeClass } from '../../../domains/badgeClass/badgeClass.entity';

export class PostgresBadgeClassMapper {
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
      issuer_id: issuerId,
      name,
      description,
      image,
      criteria,
      alignment,
      tags,
      additional_fields: additionalFields = {}
    } = record;

    // Create and return the domain entity
    return BadgeClass.create({
      id: id.toString(),
      issuer: issuerId.toString(),
      name,
      description,
      image,
      criteria,
      alignment,
      tags,
      ...additionalFields
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
      id,
      issuer_id: issuer,
      name,
      description,
      image,
      criteria,
      alignment,
      tags,
      additional_fields: additionalFields,
      updated_at: new Date()
    };
  }
}
