/**
 * PostgreSQL mapper for the BadgeClass domain entity
 *
 * This class implements the Data Mapper pattern for the BadgeClass entity,
 * handling the conversion between domain entities and database records.
 */

import { BadgeClass } from '@domains/badgeClass/badgeClass.entity';
import { Shared } from 'openbadges-types';
import type { InferInsertModel } from 'drizzle-orm';
import { badgeClasses } from '../schema';
import { convertUuid } from '@infrastructure/database/utils/type-conversion';
import { safeParseJson } from '@utils/json-utils';

export class PostgresBadgeClassMapper {
  /**
   * Converts a database record to a domain entity
   * @param record The database record
   * @returns A BadgeClass domain entity
   */
  toDomain(record: Record<string, unknown>): BadgeClass {
    if (!record) return null as unknown as BadgeClass;

    // Extract the standard fields from the record, asserting types
    const id = record['id'] as string | undefined;
    const issuerId = record['issuerId'] as string | undefined;
    const name = (record['name'] as string) ?? ''; // Provide default for notNull
    const description = (record['description'] as string) ?? ''; // Provide default for notNull
    const image = record['image']; // Keep as is, BadgeClass.create handles IRI | OB3ImageObject
    const criteria = safeParseJson(record['criteria'], {}); // Provide default for notNull
    const alignment = safeParseJson(record['alignment'], null);
    const tags = safeParseJson(record['tags'], null);
    const additionalFieldsRecord = safeParseJson(
      record['additionalFields'],
      {}
    ); // Provide default

    // Create and return the domain entity
    return BadgeClass.create({
      id: convertUuid(id, 'postgresql', 'from') as Shared.IRI, // Convert UUID to URN
      issuer: convertUuid(issuerId, 'postgresql', 'from') as Shared.IRI, // Convert UUID to URN
      name,
      description,
      image:
        typeof image === 'string'
          ? (image as Shared.IRI)
          : (image as Shared.OB3ImageObject), // Assert based on type
      criteria,
      alignment,
      tags,
      ...(additionalFieldsRecord as Record<string, unknown>),
    });
  }

  /**
   * Converts a domain entity to a database record
   * @param entity The BadgeClass domain entity
   * @returns A database record matching the insert schema
   */
  toPersistence(entity: BadgeClass): InferInsertModel<typeof badgeClasses> {
    if (!entity) return null;

    // Convert complex types to JSON strings for storage
    // Provide default '{}' for criteria as it's notNull in schema
    const criteriaJson = entity.criteria
      ? JSON.stringify(entity.criteria)
      : '{}';
    const alignmentJson = entity.alignment
      ? JSON.stringify(entity.alignment)
      : null;
    const tagsJson = entity.tags ? JSON.stringify(entity.tags) : null;

    // Prepare additionalFields, excluding standard ones already mapped
    const standardKeys = [
      'id',
      'issuer',
      'name',
      'description',
      'image',
      'criteria',
      'alignment',
      'tags',
      'type',
    ];
    // Use direct property assignment for better performance (O(n) vs O(n²))
    const additionalFields: Record<string, unknown> = {};
    for (const key of Object.keys(entity)) {
      if (!standardKeys.includes(key) && key !== 'constructor') {
        additionalFields[key] = entity[key];
      }
    }
    const additionalFieldsJson =
      Object.keys(additionalFields).length > 0
        ? JSON.stringify(additionalFields)
        : null;

    // Prepare the record for persistence, matching the schema
    // Include ID if provided in the entity
    const record: {
      id?: string;
      issuerId: string;
      name: string;
      description: string;
      image: string;
      criteria: string; // Expects stringified JSON, not null
      alignment: string | null;
      tags: string | null;
      additionalFields: string | null;
    } = {
      ...(entity.id && {
        id: convertUuid(entity.id as string, 'postgresql', 'to'),
      }),
      issuerId: convertUuid(entity.issuer as string, 'postgresql', 'to'),
      name:
        typeof entity.name === 'object'
          ? JSON.stringify(entity.name)
          : String(entity.name),
      description:
        typeof entity.description === 'object'
          ? JSON.stringify(entity.description)
          : String(entity.description || ''),
      // Handle image type, provide default empty string for notNull schema field
      image:
        typeof entity.image === 'string'
          ? entity.image
          : typeof entity.image === 'object' &&
            entity.image !== null &&
            'id' in entity.image
          ? entity.image.id
          : '', // Default empty string for notNull image field
      criteria: criteriaJson, // Already stringified, defaults to '{}' for notNull
      alignment: alignmentJson, // Stringified or null
      tags: tagsJson, // Stringified or null
      additionalFields: additionalFieldsJson, // Stringified or null
    };
    return record; // Return explicitly typed record
  }
}
