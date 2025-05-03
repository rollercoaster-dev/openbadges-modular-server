/**
 * PostgreSQL mapper for the Platform domain entity
 *
 * This class implements the Data Mapper pattern for the Platform entity,
 * handling the conversion between domain entities and database records.
 */

import { Platform } from '@domains/backpack/platform.entity';
import { Shared } from 'openbadges-types';

export class PostgresPlatformMapper {
  /**
   * Converts a database record to a domain entity
   * @param record The database record
   * @returns A Platform domain entity
   */
  toDomain(record: any): Platform {
    if (!record) return null as any;

    // Extract the standard fields from the record
    const {
      id,
      name,
      description,
      clientId,
      publicKey,
      webhookUrl,
      status,
      createdAt,
      updatedAt
    } = record;

    // Create and return the domain entity
    return Platform.create({
      id: id.toString() as Shared.IRI,
      name,
      description,
      clientId,
      publicKey,
      webhookUrl,
      status,
      createdAt: createdAt instanceof Date ? createdAt : new Date(createdAt),
      updatedAt: updatedAt instanceof Date ? updatedAt : new Date(updatedAt)
    });
  }

  /**
   * Converts a domain entity to a database record
   * @param entity The Platform domain entity
   * @returns A database record
   */
  toPersistence(entity: Platform): any {
    if (!entity) return null;

    // Convert the entity to a plain object
    const obj = entity.toObject();

    // Extract the standard fields
    const {
      id,
      name,
      description,
      clientId,
      publicKey,
      webhookUrl,
      status,
      createdAt,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      updatedAt
    } = obj;

    // Create and return the database record
    return {
      id,
      name,
      description,
      clientId,
      publicKey,
      webhookUrl,
      status,
      createdAt: createdAt instanceof Date ? createdAt : (typeof createdAt === 'string' || typeof createdAt === 'number' ? new Date(createdAt) : new Date()),
      updatedAt: new Date() // Always update the updatedAt field
    };
  }
}
