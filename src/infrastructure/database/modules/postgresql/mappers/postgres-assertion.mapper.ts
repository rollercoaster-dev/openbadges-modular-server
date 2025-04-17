/**
 * PostgreSQL mapper for the Assertion domain entity
 *
 * This class implements the Data Mapper pattern for the Assertion entity,
 * handling the conversion between domain entities and database records.
 */

import { Assertion } from '../../../../../domains/assertion/assertion.entity';
import { Shared } from 'openbadges-types';

export class PostgresAssertionMapper {
  /**
   * Converts a database record to a domain entity
   * @param record The database record
   * @returns An Assertion domain entity
   */
  toDomain(record: any): Assertion {
    if (!record) return null as any;

    // Extract the standard fields from the record
    const {
      id,
      badge_class_id: badgeClassId,
      recipient,
      issued_on: issuedOn,
      expires,
      evidence,
      verification,
      revoked,
      revocation_reason: revocationReason,
      additional_fields: additionalFields = {}
    } = record;

    // Create and return the domain entity
    return Assertion.create({
      id: id.toString() as Shared.IRI,
      badgeClass: badgeClassId.toString() as Shared.IRI,
      recipient,
      issuedOn: issuedOn.toISOString(),
      expires: expires ? expires.toISOString() : undefined,
      evidence,
      verification,
      revoked,
      revocationReason,
      ...additionalFields
    });
  }

  /**
   * Converts a domain entity to a database record
   * @param entity The Assertion domain entity
   * @returns A database record
   */
  toPersistence(entity: Assertion): any {
    if (!entity) return null;

    // Convert the entity to a plain object
    const obj = entity.toObject();

    // Extract the standard fields
    const {
      id,
      badgeClass,
      recipient,
      issuedOn,
      expires,
      evidence,
      verification,
      revoked,
      revocationReason,
      ...additionalFields
    } = obj;

    // Create and return the database record
    return {
      id,
      badge_class_id: badgeClass,
      recipient,
      issued_on: new Date(issuedOn),
      expires: expires ? new Date(expires) : null,
      evidence,
      verification,
      revoked,
      revocation_reason: revocationReason,
      additional_fields: additionalFields,
      updated_at: new Date()
    };
  }
}
