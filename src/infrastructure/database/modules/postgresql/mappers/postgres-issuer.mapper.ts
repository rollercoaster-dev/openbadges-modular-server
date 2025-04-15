/**
 * PostgreSQL mapper for the Issuer domain entity
 * 
 * This class implements the Data Mapper pattern for the Issuer entity,
 * handling the conversion between domain entities and database records.
 */

import { Issuer } from '../../../domains/issuer/issuer.entity';

export class PostgresIssuerMapper {
  /**
   * Converts a database record to a domain entity
   * @param record The database record
   * @returns An Issuer domain entity
   */
  toDomain(record: any): Issuer {
    if (!record) return null as any;
    
    // Extract the standard fields from the record
    const {
      id,
      name,
      url,
      email,
      description,
      image,
      public_key: publicKey,
      additional_fields: additionalFields = {},
      ...rest
    } = record;
    
    // Create and return the domain entity
    return Issuer.create({
      id: id.toString(),
      name,
      url,
      email,
      description,
      image,
      publicKey,
      ...additionalFields
    });
  }
  
  /**
   * Converts a domain entity to a database record
   * @param entity The Issuer domain entity
   * @returns A database record
   */
  toPersistence(entity: Issuer): any {
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
    
    // Create and return the database record
    return {
      id,
      name,
      url,
      email,
      description,
      image,
      public_key: publicKey,
      additional_fields: additionalFields,
      updated_at: new Date()
    };
  }
}
