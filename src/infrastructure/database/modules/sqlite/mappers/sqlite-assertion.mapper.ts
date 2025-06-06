/**
 * SQLite mapper for the Assertion domain entity
 *
 * This class implements the Data Mapper pattern for the Assertion entity,
 * handling the conversion between domain entities and database records.
 */

import { Assertion } from '@domains/assertion/assertion.entity';
import { Shared, OB2, OB3 } from 'openbadges-types';
import {
  convertBoolean,
  convertJson,
  convertTimestamp,
  convertUuid,
} from '@infrastructure/database/utils/type-conversion';
import { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { assertions } from '../schema';
import { logger } from '@utils/logging/logger.service';

/**
 * SQLite mapper for the Assertion domain entity
 */
type SqliteAssertionRecord = InferSelectModel<typeof assertions>;

// Define an explicit type alias for the insert model with all optional fields
type AssertionInsertModel = InferInsertModel<typeof assertions> & {
  issuerId?: string | null;
};

export class SqliteAssertionMapper {
  /**
   * Converts a database record to a domain entity
   * @param record The database record
   * @returns An Assertion domain entity
   */
  toDomain(record: SqliteAssertionRecord): Assertion {
    if (!record) {
      const msg = 'Assertion mapper received a null/undefined record';
      logger.error(msg);
      throw new Error(msg);
    }

    // Extract the standard fields from the record
    const {
      id,
      badgeClassId,
      issuerId,
      recipient,
      issuedOn,
      expires,
      evidence,
      verification,
      revoked,
      revocationReason,
      additionalFields,
    } = record;

    // --- Validate required fields from DB ---
    if (id === null || id === undefined) {
      throw new Error('Assertion record is missing required field: id');
    }
    if (badgeClassId === null || badgeClassId === undefined) {
      throw new Error(
        'Assertion record is missing required field: badgeClassId'
      );
    }
    if (issuedOn === null || issuedOn === undefined) {
      throw new Error('Assertion record is missing required field: issuedOn');
    }

    // Safely convert additional fields, ensuring it's an object for spreading
    const parsedAdditionalFields =
      convertJson<Record<string, unknown>>(
        additionalFields,
        'sqlite',
        'from'
      ) ?? {};
    const safeAdditionalFields = this.validateParsedJson(
      parsedAdditionalFields,
      'additionalFields',
      id
    );

    // Parse and validate JSON fields
    const parsedRecipient = this.validateParsedJson(
      convertJson<OB2.IdentityObject | OB3.CredentialSubject>(
        recipient,
        'sqlite',
        'from'
      ),
      'recipient',
      id
    );
    if (!parsedRecipient) {
      // Recipient is mandatory
      throw new Error(
        `Parsed recipient JSON is null or undefined for assertion ${id}.`
      );
    }

    const parsedEvidence = this.validateParsedJson(
      convertJson<OB2.Evidence[] | OB3.Evidence[]>(
        evidence,
        'sqlite',
        'from'
      ) ?? [], // Default to empty array if null/undefined BEFORE validation
      'evidence',
      id
    );

    const parsedVerification = this.validateParsedJson(
      convertJson<OB2.VerificationObject | OB3.Proof | OB3.CredentialStatus>(
        verification,
        'sqlite',
        'from'
      ),
      'verification',
      id
    ); // Verification can be null/undefined

    // Create and return the domain entity
    try {
      return Assertion.create({
        id: convertUuid(id, 'sqlite', 'from') as Shared.IRI, // Already validated non-null
        badgeClass: convertUuid(badgeClassId, 'sqlite', 'from') as Shared.IRI, // Already validated non-null
        // Convert issuer_id to IRI if present
        issuer: issuerId
          ? (convertUuid(issuerId, 'sqlite', 'from') as Shared.IRI)
          : undefined,
        recipient: parsedRecipient,
        issuedOn: new Date(
          convertTimestamp(issuedOn, 'sqlite', 'from') as number // Already validated non-null
        ).toISOString(),
        expires:
          expires !== null && expires !== undefined
            ? new Date(
                convertTimestamp(expires, 'sqlite', 'from') as number
              ).toISOString()
            : undefined,
        evidence: parsedEvidence,
        verification: parsedVerification,
        revoked:
          revoked !== null && revoked !== undefined
            ? (convertBoolean(revoked, 'sqlite', 'from') as boolean)
            : undefined,
        revocationReason: revocationReason ?? undefined, // Use nullish coalescing
        // Spread only keys that are *not* already part of the core DTO
        ...Object.fromEntries(
          Object.entries(safeAdditionalFields).filter(
            ([k]) =>
              ![
                'id',
                'badgeClass',
                'recipient',
                'issuedOn',
                'expires',
                'evidence',
                'verification',
                'revoked',
                'revocationReason',
              ].includes(k)
          )
        ),
      });
    } catch (error) {
      logger.error(`Error mapping SQLite Assertion record to domain: ${error}`);
      throw new Error(
        `Failed to map Assertion record with id ${id} to domain.`
      );
    }
  }

  private validateParsedJson<T>(
    value: T | string | null | undefined,
    fieldName: string,
    assertionId: string
  ): T | null | undefined {
    if (value === null || value === undefined) {
      // Allow null/undefined for optional fields, handle specific checks elsewhere if needed
      return value as T;
    }
    if (typeof value === 'string') {
      throw new Error(
        `Parsed ${fieldName} JSON is unexpectedly a string for assertion ${assertionId}.`
      );
    }
    // At this point, it should be the target type T
    return value;
  }

  /**
   * Converts a domain entity to a database record
   * @param entity The Assertion domain entity
   * @returns A database record compatible with Drizzle's insert
   */
  toPersistence(entity: Assertion): AssertionInsertModel {
    if (!entity) {
      // Or throw an error, depending on desired behavior for null input
      throw new Error('Cannot persist null Assertion entity.');
    }

    // Return all fields that can be persisted
    const persistenceRecord = {
      id: convertUuid(entity.id as string, 'sqlite', 'to'),
      badgeClassId: convertUuid(
        (entity.badgeClass || entity['badge']) as string,
        'sqlite',
        'to'
      ),
      // Include issuerId if present in entity
      issuerId:
        entity.issuer && typeof entity.issuer === 'string'
          ? convertUuid(entity.issuer as string, 'sqlite', 'to')
          : null,
      recipient: convertJson(
        entity.recipient as object,
        'sqlite',
        'to'
      ) as string,
      issuedOn: convertTimestamp(
        entity.issuedOn as string | Date,
        'sqlite',
        'to'
      ) as number,
      expires: entity.expires
        ? (convertTimestamp(
            entity.expires as string | Date,
            'sqlite',
            'to'
          ) as number)
        : null,
      evidence: entity.evidence
        ? (convertJson(entity.evidence as object, 'sqlite', 'to') as string)
        : null,
      verification: entity.verification
        ? (convertJson(entity.verification as object, 'sqlite', 'to') as string)
        : null,
      revoked:
        entity.revoked !== undefined
          ? (convertBoolean(entity.revoked, 'sqlite', 'to') as number)
          : null,
      revocationReason: entity.revocationReason || null,
      additionalFields: entity['additionalFields']
        ? (convertJson(
            entity['additionalFields'] as object,
            'sqlite',
            'to'
          ) as string)
        : null,
      createdAt: entity.createdAt
        ? (convertTimestamp(
            entity.createdAt as string | number | Date,
            'sqlite',
            'to'
          ) as number)
        : (convertTimestamp(new Date(), 'sqlite', 'to') as number),
      updatedAt: entity.updatedAt
        ? (convertTimestamp(
            entity.updatedAt as string | number | Date,
            'sqlite',
            'to'
          ) as number)
        : (convertTimestamp(new Date(), 'sqlite', 'to') as number),
    } as AssertionInsertModel;
    return persistenceRecord;
  }
}
