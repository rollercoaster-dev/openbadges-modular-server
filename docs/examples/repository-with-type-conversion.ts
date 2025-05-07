/**
 * Example of using type conversion utilities in a repository implementation
 *
 * This example shows how to use the type conversion utilities to handle
 * differences between PostgreSQL and SQLite when implementing a repository.
 */
// This is an example file with intentionally unused methods to demonstrate the pattern
// @ts-nocheck

// This is an example file and doesn't need to import actual modules
// In a real implementation, you would import from the actual paths

import { Issuer } from '../../src/domains/issuer/issuer.entity';
import {
  convertJson,
  convertTimestamp,
  convertUuid
} from '../../src/infrastructure/database/utils/type-conversion';
import { config } from '../../src/config/config';

/**
 * Example repository implementation that uses type conversion utilities
 */
// This is just an example implementation
export class ExampleIssuerRepository {
  private dbType: 'postgresql' | 'sqlite';

  constructor() {
    // Determine database type from config
    this.dbType = (config.database.type as 'postgresql' | 'sqlite') || 'sqlite';
  }

  /**
   * Example of converting entity to database record
   * @param issuer The issuer entity to convert
   * @returns The database record
   */
  // This method is not used in this example but would be used in a real implementation
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private _entityToRecord(issuer: Issuer): any {
    return {
      id: convertUuid(issuer.id, this.dbType, 'to'),
      name: issuer.name,
      url: issuer.url,
      email: issuer.email,
      description: issuer.description,
      image: issuer.image,
      // Convert JSON data for storage
      publicKey: convertJson(issuer.publicKey, this.dbType, 'to'),
      // Convert timestamps for storage
      createdAt: convertTimestamp(issuer.createdAt as Date, this.dbType, 'to'),
      updatedAt: convertTimestamp(issuer.updatedAt as Date, this.dbType, 'to'),
      // Convert additional fields for storage
      additionalFields: convertJson(issuer.additionalFields, this.dbType, 'to')
    };
  }

  /**
   * Example of converting database record to entity
   * @param record The database record to convert
   * @returns The issuer entity
   */
  // This method is not used in this example but would be used in a real implementation
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private _recordToEntity(record: any): any {
    // Create a mock Issuer object with toObject method
    const issuer = {
      id: convertUuid(record.id, this.dbType, 'from') as string,
      name: record.name ?? '',
      url: record.url ?? '',
      email: record.email,
      description: record.description,
      image: record.image,
      // Convert JSON data from storage
      publicKey: convertJson(record.publicKey, this.dbType, 'from'),
      // Convert timestamps from storage
      createdAt: convertTimestamp(record.createdAt, this.dbType, 'from') as Date | null,
      updatedAt: convertTimestamp(record.updatedAt, this.dbType, 'from') as Date | null,
      // Convert additional fields from storage
      additionalFields: convertJson(record.additionalFields, this.dbType, 'from'),
      toObject: () => ({
        id: record.id,
        name: record.name,
        url: record.url,
        email: record.email,
        description: record.description,
        image: record.image,
        publicKey: record.publicKey,
        additionalFields: record.additionalFields
      })
    };

    return issuer;
  }

  /**
   * Example implementation of findById method
   * @param id The issuer ID
   * @returns The issuer entity or null if not found
   */
  async findById(_id: string): Promise<any> {
    try {
      // This is just an example - in a real implementation, you would:
      // 1. Query the database using the appropriate client (PostgreSQL or SQLite)
      // 2. Convert the database record to an entity using recordToEntity

      // Example with PostgreSQL:
      if (this.dbType === 'postgresql') {
        // const result = await pgClient.query('SELECT * FROM issuers WHERE id = $1', [_id]);
        // if (result.rows.length === 0) return null;
        // return this.recordToEntity(result.rows[0]);
      }

      // Example with SQLite:
      if (this.dbType === 'sqlite') {
        // const result = sqliteDb.query('SELECT * FROM issuers WHERE id = ?', [_id]);
        // if (!result) return null;
        // return this.recordToEntity(result);
      }

      return null;
    } catch (error) {
      console.error('Error finding issuer by ID:', error);
      throw error;
    }
  }

  /**
   * Example implementation of create method
   * @param issuer The issuer entity to create
   * @returns The created issuer entity
   */
  async create(issuer: Issuer): Promise<any> {
    try {
      // Convert entity to database record
      // Commented out as it's not used in this example
      // const _record = this._entityToRecord(issuer);

      // This is just an example - in a real implementation, you would:
      // 1. Insert the record into the database using the appropriate client
      // 2. Return the created entity

      // Example with PostgreSQL:
      if (this.dbType === 'postgresql') {
        // const result = await pgClient.query(
        //   'INSERT INTO issuers (id, name, url, email, description, image, public_key, created_at, updated_at, additional_fields) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
        //   [_record.id, _record.name, _record.url, _record.email, _record.description, _record.image, _record.publicKey, _record.createdAt, _record.updatedAt, _record.additionalFields]
        // );
        // return this.recordToEntity(result.rows[0]);
      }

      // Example with SQLite:
      if (this.dbType === 'sqlite') {
        // sqliteDb.query(
        //   'INSERT INTO issuers (id, name, url, email, description, image, public_key, created_at, updated_at, additional_fields) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        //   [_record.id, _record.name, _record.url, _record.email, _record.description, _record.image, _record.publicKey, _record.createdAt, _record.updatedAt, _record.additionalFields]
        // );
        // const result = sqliteDb.query('SELECT * FROM issuers WHERE id = ?', [_record.id]);
        // return this.recordToEntity(result);
      }

      return issuer;
    } catch (error) {
      console.error('Error creating issuer:', error);
      throw error;
    }
  }

  // Other repository methods would follow the same pattern...
}
