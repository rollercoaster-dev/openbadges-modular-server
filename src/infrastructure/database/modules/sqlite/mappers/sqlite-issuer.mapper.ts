/**
 * SQLite mapper for the Issuer domain entity
 *
 * This class implements the Data Mapper pattern for the Issuer entity,
 * handling the conversion between domain entities and database records with enhanced type safety.
 */

import { Issuer } from '@domains/issuer/issuer.entity';
import { Shared } from 'openbadges-types';
import { issuers } from '../schema';
import { SqliteTypeConverters } from '../utils/sqlite-type-converters';
import { logger } from '@utils/logging/logger.service';
// Types are imported but not used directly in this file
// They are available for future use if needed

export class SqliteIssuerMapper {
  /**
   * Converts a database record to a domain entity
   * @param record The database record conforming to the select schema
   * @returns An Issuer domain entity
   */
  toDomain(record: typeof issuers.$inferSelect): Issuer {
    if (!record) {
      throw new Error(
        'Cannot convert null or undefined record to Issuer domain entity'
      );
    }

    try {
      // Extract the standard fields from the record
      const {
        id,
        name,
        url,
        email,
        description,
        image,
        publicKey,
        additionalFields = '{}', // Default to empty JSON string if null from DB
      } = record;

      // Validate and convert ID
      const idResult = SqliteTypeConverters.validateAndConvertIRI(id);
      if (!idResult.success) {
        throw new Error(`Invalid issuer ID: ${idResult.error}`);
      }

      // Convert image with type safety
      const convertedImage = SqliteTypeConverters.convertImageFromString(image);

      // Convert public key with type safety
      const convertedPublicKey = SqliteTypeConverters.safeJsonParse<
        Record<string, unknown>
      >(publicKey, 'publicKey');

      // Handle additional fields with validation
      const additionalFieldsResult =
        SqliteTypeConverters.validateAdditionalFields(
          SqliteTypeConverters.safeJsonParse<Record<string, unknown>>(
            additionalFields,
            'additionalFields'
          ) || {}
        );

      // Create and return the domain entity
      const baseData = {
        id: idResult.data!,
        name,
        url: url as Shared.IRI,
        email: email || undefined,
        description: description || undefined,
        image: convertedImage || undefined,
        publicKey: convertedPublicKey || undefined,
      };

      return Issuer.create({ ...baseData, ...additionalFieldsResult.data });
    } catch (error) {
      logger.error('Error converting database record to Issuer domain entity', {
        error: error instanceof Error ? error.message : String(error),
        recordId: record.id,
      });
      throw error;
    }
  }

  /**
   * Converts a domain entity to a database record
   * @param entity The Issuer domain entity
   * @returns A database record conforming to the insert schema
   */
  toPersistence(entity: Issuer): {
    id: string;
    name: string;
    url: string;
    email: string | null;
    description: string | null;
    image: string | null;
    publicKey: string | null;
    additionalFields: string | null;
    createdAt: number;
    updatedAt: number;
  } {
    if (!entity) {
      throw new Error(
        'Cannot convert null or undefined entity to database record'
      );
    }

    try {
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
      const dbName: string =
        typeof name === 'object' && name !== null
          ? name.en || name[Object.keys(name)[0]] || ''
          : (name as string) || '';

      // Ensure description is a string for the database
      const dbDescription: string | null =
        typeof description === 'object' && description !== null
          ? description.en || description[Object.keys(description)[0]] || null
          : (description as string) || null;

      // Validate additional fields
      const additionalFieldsResult =
        SqliteTypeConverters.validateAdditionalFields(additionalFields);

      // Create the database record with proper type safety
      const now = Date.now();
      return {
        id: id as string, // ID is already validated in the entity
        name: dbName,
        url: url as string,
        email: email || null,
        description: dbDescription,
        image: SqliteTypeConverters.convertImageToString(image),
        publicKey: SqliteTypeConverters.safeJsonStringify(
          publicKey,
          'publicKey'
        ),
        additionalFields: SqliteTypeConverters.safeJsonStringify(
          additionalFieldsResult.data,
          'additionalFields'
        ),
        createdAt: now,
        updatedAt: now,
      };
    } catch (error) {
      logger.error('Error converting Issuer domain entity to database record', {
        error: error instanceof Error ? error.message : String(error),
        entityId: entity.id,
      });
      throw error;
    }
  }
}
