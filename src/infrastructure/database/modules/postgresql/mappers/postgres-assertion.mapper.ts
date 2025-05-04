/**
 * PostgreSQL mapper for the Assertion domain entity
 *
 * This class implements the Data Mapper pattern for the Assertion entity,
 * handling the conversion between domain entities and database records.
 */

import { Assertion } from '@domains/assertion/assertion.entity';
import { convertJson, safeConvertToDate } from '@infrastructure/database/utils/type-conversion';
import { toIRI } from '@utils/types/iri-utils';
import { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { assertions } from '../schema';
import { OB2, OB3 } from 'openbadges-types';

// Define the type for the database record using Drizzle's InferSelectModel
type PostgresAssertionRecord = InferSelectModel<typeof assertions>;

// Define an explicit type alias for the insert model
type AssertionInsertModel = InferInsertModel<typeof assertions>;

export class PostgresAssertionMapper {
  /**
   * Converts a database record to a domain entity
   * @param record The database record
   * @returns An Assertion domain entity
   */

  toDomain(record: PostgresAssertionRecord): Assertion {
    if (!record) return null as unknown as Assertion;

    // Map JSON fields, ensuring type correctness
    const domainRecipient = convertJson<OB2.IdentityObject | OB3.CredentialSubject>(record.recipient as OB2.IdentityObject | OB3.CredentialSubject, 'postgresql', 'from');
    const domainEvidence = convertJson<OB2.Evidence[] | OB3.Evidence[] | undefined>(record.evidence as OB2.Evidence[] | OB3.Evidence[], 'postgresql', 'from');
    const domainVerification = convertJson<OB2.VerificationObject | OB3.Proof | OB3.CredentialStatus | undefined>(record.verification as OB2.VerificationObject | OB3.Proof | OB3.CredentialStatus, 'postgresql', 'from');
    const domainAdditionalFieldsRaw = convertJson<Record<string, unknown>>(record.additionalFields as Record<string, unknown>, 'postgresql', 'from');
    const domainAdditionalFields = typeof domainAdditionalFieldsRaw === 'object' && domainAdditionalFieldsRaw !== null ? domainAdditionalFieldsRaw : {};

    // Create and return the domain entity
    return Assertion.create({
      // Use toIRI for IRI fields, record values should be string (UUID)
      id: toIRI(record.id),
      badgeClass: toIRI(record.badgeClassId),
      // Ensure mapped JSON fields match entity type (object/array, not string/null)
      recipient: typeof domainRecipient === 'object' && domainRecipient !== null ? domainRecipient : undefined,
      // Convert Date objects from DB to ISO strings for the entity
      issuedOn: record.issuedOn.toISOString(),
      expires: record.expires ? record.expires.toISOString() : undefined, // Can be null
      evidence: Array.isArray(domainEvidence) ? domainEvidence : undefined,
      verification: typeof domainVerification === 'object' && domainVerification !== null ? domainVerification : undefined,
      // revoked is expected to be boolean by Assertion.create? Check entity.
      revoked: this.mapRevokedFromDb(record.revoked), // Use helper method
      revocationReason: record.revocationReason,
      // Spread the checked additional fields
      ...domainAdditionalFields
    });
  }

  /** Helper to map revoked status from DB JSONB to domain boolean */
  private mapRevokedFromDb(revokedDbValue: unknown): boolean {
    // Cast input as Drizzle infers jsonb as unknown | null
    const revokedDomainValue = convertJson<Record<string, unknown> | null>(revokedDbValue as Record<string, unknown>, 'postgresql', 'from');
    // Basic check: if the JSONB value exists and has a truthy 'status' property, consider it revoked (boolean for now)
    if (typeof revokedDomainValue === 'object' && revokedDomainValue !== null && 'status' in revokedDomainValue) {
      return !!revokedDomainValue.status;
    }
    return false; // Default to not revoked if structure doesn't match
  }

  /**
   * Converts an Assertion domain entity (or partial) to a database record suitable for insertion.
   * Ensures required fields for insertion are present and correctly formatted.
   * Excludes database-generated fields like id, createdAt, updatedAt.
   *
   * @param entity The Assertion entity (or partial) to convert.
   * @returns The database record object for insertion.
   * @throws Error if required fields (badgeClassId, recipient) are missing.
   */
  toPersistence(entity: Partial<Assertion>): AssertionInsertModel {
    // Validate required fields for insertion
    if (!entity.badgeClass) {
      throw new Error('Assertion entity must have a badgeClass (IRI) for persistence.');
    }
    if (!entity.recipient) {
      throw new Error('Assertion entity must have a recipient for persistence.');
    }

    // Create and return the database record suitable for insertion
    // Construct the object based on schema requirements for insert, including ID if provided.
    const recordToInsert = {
      // Include ID if provided in the entity
      ...(entity.id && { id: entity.id as string }),
      badgeClassId: entity.badgeClass as string, // Map from entity.badgeClass (IRI) and cast to string
      recipient: convertJson(entity.recipient, 'postgresql', 'to'),
      // Include issuedOn if provided, otherwise let DB handle it with defaultNow()
      ...(entity.issuedOn && { issuedOn: safeConvertToDate(entity.issuedOn) }),
      expires: safeConvertToDate(entity.expires), // Use safe conversion
      evidence: convertJson(entity.evidence, 'postgresql', 'to'),
      verification: convertJson(entity.verification, 'postgresql', 'to'),
      revoked: convertJson(entity.revoked ? { status: true } : null, 'postgresql', 'to'),
      revocationReason: entity.revocationReason,
      additionalFields: convertJson(entity.additionalFields, 'postgresql', 'to'),
      // DO NOT include createdAt, updatedAt - let the database handle these
    };
    // Cast the fully constructed object to the expected insert model type before returning.
    // This assumes the constructed object matches the actual requirements,
    // even if TS struggles to statically verify AssertionInsertModel during construction.
    return recordToInsert as AssertionInsertModel;
  }
}
