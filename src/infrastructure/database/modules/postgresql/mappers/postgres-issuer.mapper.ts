/**
 * PostgreSQL mapper for the Issuer domain entity
 *
 * This class implements the Data Mapper pattern for the Issuer entity,
 * handling the conversion between domain entities and database records.
 */

import { Issuer } from '@domains/issuer/issuer.entity';
import { Shared } from 'openbadges-types'; // Import Shared namespace from package root
import {
  convertJson,
  convertUuid,
} from '@infrastructure/database/utils/type-conversion';
import { safeParseJson } from '@utils/json-utils';
import { InferInsertModel } from 'drizzle-orm';
import { issuers } from '../schema';
import { logger } from '@utils/logging/logger.service';

/**
 * PostgreSQL mapper for the Issuer domain entity
 */
type IssuerInsertModel = InferInsertModel<typeof issuers>;

export class PostgresIssuerMapper {
  /**
   * Converts a database record to a domain entity
   * @param record The database record
   * @returns An Issuer domain entity
   */
  toDomain(record: Record<string, unknown>): Issuer {
    if (!record) return null as unknown as Issuer;

    // Extract the standard fields from the record
    const {
      id,
      name,
      url,
      email,
      description,
      image,
      publicKey,
      additionalFields = {},
    } = record;

    // Ensure additionalFields is a spreadable object
    // Note: Issuer.create expects additionalFields to be Record<string, unknown> potentially.
    // Ensure the object structure is valid for spreading.
    const safeAdditionalFields =
      additionalFields &&
      typeof additionalFields === 'object' &&
      !Array.isArray(additionalFields)
        ? (additionalFields as Record<string, unknown>) // Assert after check
        : undefined; // Pass undefined if not a valid object

    // --- Type Validation and Conversion ---
    // ID (Convert from PostgreSQL UUID to application URN format)
    if (!id) {
      throw new Error('Issuer record is missing an ID.');
    }
    const domainId = convertUuid(
      id.toString(),
      'postgresql',
      'from'
    ) as Shared.IRI;

    const domainName = typeof name === 'string' ? name : '';
    const domainUrl = typeof url === 'string' ? (url as Shared.IRI) : undefined;
    const domainEmail = typeof email === 'string' ? email : undefined;
    const domainDescription =
      typeof description === 'string' ? description : undefined;
    const domainImage =
      typeof image === 'string' ? (image as Shared.IRI) : undefined; // Assuming image is IRI or null/undefined

    // Parse publicKey using shared utility, ensuring it's a valid object
    const domainPublicKey = safeParseJson<Record<string, unknown>>(
      publicKey,
      undefined
    );

    // Additional validation to ensure it's a non-array object if parsed
    const validatedPublicKey =
      domainPublicKey &&
      typeof domainPublicKey === 'object' &&
      !Array.isArray(domainPublicKey)
        ? domainPublicKey
        : undefined;

    try {
      // Create and return the domain entity
      return Issuer.create({
        id: domainId,
        name: domainName,
        url: domainUrl,
        email: domainEmail,
        description: domainDescription,
        image: domainImage,
        publicKey: validatedPublicKey,
        ...safeAdditionalFields, // Spread the validated object
      });
    } catch (error) {
      logger.error(
        `Error mapping PostgreSQL Issuer record to domain: ${error}`
      );
      throw new Error(`Failed to map Issuer record with id ${id} to domain.`);
    }
  }

  /**
   * Converts a domain entity to a database record suitable for insertion.
   * Includes ID if provided in the entity.
   * @param entity The Issuer entity (or partial) to convert.
   * @returns The database record object for insertion.
   * @throws Error if required fields (name, url) are missing.
   */
  toPersistence(entity: Partial<Issuer>): IssuerInsertModel {
    // Validate required fields for insertion
    if (!entity.name) {
      throw new Error('Issuer entity must have a name for persistence.');
    }
    if (!entity.url) {
      throw new Error('Issuer entity must have a url for persistence.');
    }

    const recordToInsert = {
      // Include ID if provided in the entity (convert URN to UUID for PostgreSQL)
      ...(entity.id && {
        id: convertUuid(entity.id as string, 'postgresql', 'to'),
      }),
      name: entity.name,
      url: entity.url as string, // Assuming url is IRI, cast to string
      email: entity.email,
      description: entity.description,
      image: entity.image as string, // Assuming image is IRI, cast to string
      publicKey: convertJson(entity.publicKey, 'postgresql', 'to'),
      additionalFields: convertJson(
        entity['additionalFields'],
        'postgresql',
        'to'
      ),
      // Exclude createdAt, updatedAt (DB defaults)
    };
    return recordToInsert as IssuerInsertModel; // Use type assertion if TS struggles
  }
}
