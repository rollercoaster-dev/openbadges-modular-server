/**
 * PostgreSQL mapper for the Issuer domain entity
 *
 * This class implements the Data Mapper pattern for the Issuer entity,
 * handling the conversion between domain entities and database records.
 */

import { Issuer } from '@domains/issuer/issuer.entity';
import { Shared } from 'openbadges-types'; // Import Shared namespace from package root
import { convertJson } from '@infrastructure/database/utils/type-conversion';
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
      additionalFields = {}
    } = record;

    // Ensure additionalFields is a spreadable object
    // Note: Issuer.create expects additionalFields to be Record<string, unknown> potentially.
    // Ensure the object structure is valid for spreading.
    const safeAdditionalFields =
      additionalFields && typeof additionalFields === 'object' && !Array.isArray(additionalFields)
        ? additionalFields as Record<string, unknown> // Assert after check
        : undefined; // Pass undefined if not a valid object

    // --- Type Validation and Conversion ---
    // ID (Assuming ID from DB is always present and stringifiable)
    const domainId = id?.toString() as Shared.IRI;
    if (!domainId) {
      // Handle missing ID - perhaps throw error or return null
      // For now, let's assume Issuer.create handles it or we throw
      throw new Error('Issuer record is missing an ID.');
    }

    const domainName = typeof name === 'string' ? name : '';
    const domainUrl = typeof url === 'string' ? (url as Shared.IRI) : undefined;
    const domainEmail = typeof email === 'string' ? email : undefined;
    const domainDescription = typeof description === 'string' ? description : undefined;
    const domainImage = typeof image === 'string' ? (image as Shared.IRI) : undefined; // Assuming image is IRI or null/undefined

    // Attempt to parse publicKey if it's a JSON string, otherwise handle object/undefined
    let domainPublicKey: Record<string, unknown> | undefined = undefined;
    if (typeof publicKey === 'string') {
      try {
        const parsedKey = JSON.parse(publicKey);
        // Ensure the parsed result is a non-null, non-array object
        if (parsedKey && typeof parsedKey === 'object' && !Array.isArray(parsedKey)) {
          domainPublicKey = parsedKey as Record<string, unknown>;
        }
      } catch (e) {
        logger.warn(`Failed to parse publicKey JSON string in PostgresIssuerMapper`, {
          publicKeyString: publicKey, // Avoid logging potentially large raw key
          error: e instanceof Error ? e.message : String(e)
        });
        // Leave domainPublicKey as undefined if parsing fails
      }
    } else if (publicKey && typeof publicKey === 'object' && !Array.isArray(publicKey)) {
      // If it's already a valid object in the record (less likely but possible)
      domainPublicKey = publicKey as Record<string, unknown>;
    }

    try {
      // Create and return the domain entity
      return Issuer.create({
        id: domainId,
        name: domainName,
        url: domainUrl,
        email: domainEmail,
        description: domainDescription,
        image: domainImage,
        publicKey: domainPublicKey,
        ...safeAdditionalFields // Spread the validated object
      });
    } catch (error) {
      logger.error(`Error mapping PostgreSQL Issuer record to domain: ${error}`);
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
      // Include ID if provided in the entity
      ...(entity.id && { id: entity.id as string }),
      name: entity.name,
      url: entity.url as string, // Assuming url is IRI, cast to string
      email: entity.email,
      description: entity.description,
      image: entity.image as string, // Assuming image is IRI, cast to string
      publicKey: convertJson(entity.publicKey, 'postgresql', 'to'),
      additionalFields: convertJson(entity.additionalFields, 'postgresql', 'to'),
      // Exclude createdAt, updatedAt (DB defaults)
    };
    return recordToInsert as IssuerInsertModel; // Use type assertion if TS struggles
  }
}
