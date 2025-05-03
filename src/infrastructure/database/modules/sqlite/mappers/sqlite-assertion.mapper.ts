/**
 * SQLite mapper for the Assertion domain entity
 *
 * This class implements the Data Mapper pattern for the Assertion entity,
 * handling the conversion between domain entities and database records.
 */

import { Assertion } from '@domains/assertion/assertion.entity';
import { Shared } from 'openbadges-types';
import { convertJson, convertTimestamp, convertUuid, convertBoolean } from '@infrastructure/database/utils/type-conversion';

export class SqliteAssertionMapper {
  /**
   * Converts a database record to a domain entity
   * @param record The database record
   * @returns An Assertion domain entity
   */
  toDomain(record: Record<string, unknown>): Assertion {
    if (!record) return null as unknown as Assertion;

    // Extract the standard fields from the record
    const {
      id,
      badgeClassId,
      recipient,
      issuedOn,
      expires,
      evidence,
      verification,
      revoked,
      revocationReason,
      additionalFields = {}
    } = record;

    // Create and return the domain entity
    return Assertion.create({
      id: convertUuid(id, 'sqlite', 'from') as Shared.IRI,
      badgeClass: convertUuid(badgeClassId, 'sqlite', 'from') as Shared.IRI,
      recipient: convertJson(recipient, 'sqlite', 'from'),
      issuedOn: new Date(convertTimestamp(issuedOn, 'sqlite', 'from') as number).toISOString(),
      expires: expires ? new Date(convertTimestamp(expires, 'sqlite', 'from') as number).toISOString() : undefined,
      evidence: convertJson(evidence, 'sqlite', 'from'),
      verification: convertJson(verification, 'sqlite', 'from'),
      revoked: revoked !== null ? convertBoolean(revoked, 'sqlite', 'from') as boolean : undefined,
      revocationReason: revocationReason || undefined,
      ...convertJson(additionalFields, 'sqlite', 'from')
    });
  }

  /**
   * Converts a domain entity to a database record
   * @param entity The Assertion domain entity
   * @returns A database record
   */
  toPersistence(entity: Assertion): Record<string, unknown> {
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
      id: convertUuid(id as string, 'sqlite', 'to'),
      badgeClassId: convertUuid(badgeClass as string, 'sqlite', 'to'),
      recipient: convertJson(recipient as object, 'sqlite', 'to'),
      issuedOn: convertTimestamp(issuedOn as string | Date, 'sqlite', 'to'),
      expires: expires ? convertTimestamp(expires as string | Date, 'sqlite', 'to') : null,
      evidence: convertJson(evidence as object, 'sqlite', 'to'),
      verification: convertJson(verification as object, 'sqlite', 'to'),
      revoked: revoked !== undefined ? convertBoolean(revoked as boolean, 'sqlite', 'to') : null,
      revocationReason: (revocationReason as string) || null,
      additionalFields: convertJson(additionalFields as object, 'sqlite', 'to'),
      updatedAt: convertTimestamp(new Date(), 'sqlite', 'to')
    };
  }
}
