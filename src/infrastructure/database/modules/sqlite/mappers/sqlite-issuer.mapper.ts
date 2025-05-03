/**
 * SQLite mapper for the Issuer domain entity
 *
 * This class implements the Data Mapper pattern for the Issuer entity,
 * handling the conversion between domain entities and database records.
 */

import { Issuer } from '@domains/issuer/issuer.entity';
import { Shared } from 'openbadges-types';
import { convertJson, convertUuid } from '@infrastructure/database/utils/type-conversion';
import { issuers } from '../schema';

export class SqliteIssuerMapper {
  /**
   * Converts a database record to a domain entity
   * @param record The database record conforming to the select schema
   * @returns An Issuer domain entity
   */
  toDomain(record: typeof issuers.$inferSelect): Issuer {
    if (!record) return null as unknown as Issuer;

    // Extract the standard fields from the record
    const {
      id,
      name,
      url,
      email,
      description,
      image,
      publicKey, // Drizzle likely maps snake_case DB col to camelCase JS prop
      additionalFields = '{}' // Default to empty JSON string if null from DB
    } = record;

    // Create and return the domain entity
    const baseData = {
      id: convertUuid(id, 'sqlite', 'from') as Shared.IRI,
      name,
      url: url as Shared.IRI,
      email,
      description,
      image: typeof image === 'string' ? image as Shared.IRI : image,
      // Cast to unknown first, then to Record to satisfy TS and Issuer.create
      publicKey: convertJson(publicKey, 'sqlite', 'from') as unknown as Record<
        string,
        unknown
      >
    };

    // Handle additional fields separately for safer spreading
    const convertedAdditional = convertJson(additionalFields, 'sqlite', 'from');
    const safeAdditional = typeof convertedAdditional === 'object' && convertedAdditional !== null ? convertedAdditional : {};

    return Issuer.create({ ...baseData, ...safeAdditional });
  }

  /**
   * Converts a domain entity to a database record
   * @param entity The Issuer domain entity
   * @returns A database record conforming to the insert schema
   */
  toPersistence(entity: Issuer): typeof issuers.$inferInsert {
    if (!entity) return null;

    // Convert the entity to a plain object
    const obj = entity.toObject();

    // Extract the standard fields
    const {
      id,
      name,
      url,
      email,
      description,
      image,
      publicKey,
      ...additionalFields
    } = obj;

    // Ensure name is a string for the database
    const dbName: string = typeof name === 'object' && name !== null
        ? name.en || name[Object.keys(name)[0]] || ''
        : (name as string) || ''; // Cast source name part to string

    // Map all relevant fields from the entity to the DB record format
    // Cast to any then back to inferred type as workaround for TS/Drizzle inference issues
    return {
      id: convertUuid(id, 'sqlite', 'to'),
      name: dbName,
      url,
      email,
      description,
      image,
      publicKey: convertJson(publicKey, 'sqlite', 'to'),
      additionalFields: convertJson(additionalFields, 'sqlite', 'to')
      // Timestamps omitted, handled by repository
    } as unknown as typeof issuers.$inferInsert;
  }
}
