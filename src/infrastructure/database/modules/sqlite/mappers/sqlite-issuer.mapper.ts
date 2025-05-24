/**
 * SQLite mapper for the Issuer domain entity
 *
 * This class implements the Data Mapper pattern for the Issuer entity,
 * handling the conversion between domain entities and database records with enhanced type safety.
 */

import { Issuer } from '@domains/issuer/issuer.entity';
import { issuers } from '../schema';
import { SqliteTypeConverters } from '../utils/sqlite-type-converters';
import { logger } from '@utils/logging/logger.service';

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

      // Validate and convert URL
      const urlResult = SqliteTypeConverters.validateAndConvertIRI(url);
      if (!urlResult.success) {
        throw new Error(`Invalid issuer URL: ${urlResult.error}`);
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

      if (!additionalFieldsResult.success) {
        throw new Error(
          `Invalid additionalFields: ${additionalFieldsResult.error}`
        );
      }

      // Create and return the domain entity with timestamps preserved
      const baseData = {
        id: idResult.data!,
        name,
        url: urlResult.data!,
        email: email || undefined,
        description: description || undefined,
        image: convertedImage || undefined,
        publicKey: convertedPublicKey || undefined,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      };

      // Spread `additionalFields` first so that validated base fields win,
      // or exclude duplicate keys altogether.
      return Issuer.create({ ...additionalFieldsResult.data, ...baseData });
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
  toPersistence(
    entity: Issuer,
    preserveTimestamps = false
  ): {
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

      // Extract and validate name as a string for the database
      let dbName: string;
      if (typeof name === 'object' && name !== null) {
        // Try English version first
        if (name.en && typeof name.en === 'string' && name.en.trim() !== '') {
          dbName = name.en;
        }
        // Then try any other language key
        else if (Object.keys(name).length > 0) {
          const firstKey = Object.keys(name)[0];
          const firstValue = name[firstKey];
          if (typeof firstValue === 'string' && firstValue.trim() !== '') {
            dbName = firstValue;
          } else {
            throw new Error(
              'Issuer name must contain at least one non-empty string value'
            );
          }
        }
        // No valid keys found
        else {
          throw new Error(
            'Issuer name object must contain at least one language key with non-empty string value'
          );
        }
      }
      // Handle direct string value
      else if (typeof name === 'string' && name.trim() !== '') {
        dbName = name;
      }
      // No valid name found
      else {
        throw new Error(
          'Issuer name is required and must be a non-empty string or a multilingual object with at least one non-empty string value'
        );
      }

      // Ensure description is a string for the database (can be null)
      let dbDescription: string | null;
      if (typeof description === 'object' && description !== null) {
        // Try English version first
        if (description.en && typeof description.en === 'string') {
          dbDescription = description.en;
        }
        // Then try any other language key
        else if (Object.keys(description).length > 0) {
          const firstKey = Object.keys(description)[0];
          const firstValue = description[firstKey];
          dbDescription = typeof firstValue === 'string' ? firstValue : null;
        }
        // No valid keys found
        else {
          dbDescription = null;
        }
      }
      // Handle direct string value
      else if (typeof description === 'string') {
        dbDescription = description;
      }
      // No description or invalid type
      else {
        dbDescription = null;
      }

      // Validate additional fields
      const additionalFieldsResult =
        SqliteTypeConverters.validateAdditionalFields(additionalFields);

      // Check if validation succeeded
      if (!additionalFieldsResult.success) {
        throw new Error(
          `Invalid additional fields in Issuer: ${
            additionalFieldsResult.error || 'Unknown validation error'
          }`
        );
      }

      // Create the database record with proper type safety
      const now = Date.now();

      // Handle timestamps based on whether this is an update or create operation
      const entityObj = entity.toObject();
      const createdAt =
        preserveTimestamps && entityObj.createdAt
          ? typeof entityObj.createdAt === 'number'
            ? entityObj.createdAt
            : now
          : now;

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
          // At this point we've verified additionalFieldsResult.success is true,
          // so we can safely access additionalFieldsResult.data
          additionalFieldsResult.data || {},
          'additionalFields'
        ),
        createdAt,
        updatedAt: now,
      };
    } catch (error) {
      logger.error('Error converting Issuer domain entity to database record', {
        error: error instanceof Error ? error.message : String(error),
        entityId: entity.id,
        entityName:
          typeof entity.name === 'object'
            ? JSON.stringify(entity.name)
            : entity.name,
      });
      throw error;
    }
  }
}
