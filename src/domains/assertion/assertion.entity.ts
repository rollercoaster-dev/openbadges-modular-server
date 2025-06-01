/**
 * Version-agnostic Assertion entity for Open Badges API
 *
 * This file defines the Assertion domain entity that can represent both
 * Open Badges 2.0 and 3.0 specifications.
 */

import { Shared, OB2, OB3, createDateTime } from 'openbadges-types';
import { BadgeVersion } from '../../utils/version/badge-version';
import { BadgeSerializerFactory } from '../../utils/version/badge-serializer';
import {
  AssertionData,
  RecipientData,
  VerificationData,
} from '../../utils/types/badge-data.types';
import type {
  BadgeClassData,
  IssuerData,
} from '../../utils/types/badge-data.types';
import { BadgeClass } from '../badgeClass/badgeClass.entity';
import { Issuer } from '../issuer/issuer.entity';
import { StatusList2021Entry } from '../../core/types/status-list.types';
import { VC_V2_CONTEXT_URL } from '@/constants/urls';
import { createOrGenerateIRI, isValidIRI } from '@utils/types/iri-utils';

/**
 * Assertion entity representing a badge awarded to a recipient
 * Compatible with both Open Badges 2.0 and 3.0
 */
export class Assertion {
  // Note: We're not implementing the interfaces directly due to type conflicts
  // between OB2 and OB3 specifications
  id: Shared.IRI;
  /**
   * The type of the assertion, which can be a single string or an array of strings.
   * - For Open Badges 2.0, this is typically a single string, e.g., 'Assertion'.
   * - For Open Badges 3.0, this can be an array of strings to represent multiple types.
   *   For OBv3, the type should be ['VerifiableCredential', 'OpenBadgeCredential']
   * The default value is 'Assertion' for internal representation.
   */
  type: string | string[] = 'Assertion';
  badgeClass: Shared.IRI;
  recipient: OB2.IdentityObject | OB3.CredentialSubject;
  issuedOn: string;
  expires?: string;
  evidence?: OB2.Evidence[] | OB3.Evidence[];
  verification?: OB2.VerificationObject | OB3.Proof;
  credentialStatus?: OB3.CredentialStatus | StatusList2021Entry;
  revoked?: boolean;
  revocationReason?: string;
  issuer?: Shared.IRI | OB3.Issuer;
  [key: string]: unknown;

  /**
   * Private constructor to enforce creation through factory method
   */
  private constructor(data: Partial<Assertion>) {
    Object.assign(this, data);
  }

  /**
   * Factory method to create a new Assertion instance
   * @param data The assertion data
   * @returns A new Assertion instance
   */
  static create(data: Partial<Assertion>): Assertion {
    // Generate ID if not provided
    if (!data.id) {
      data.id = createOrGenerateIRI();
    }

    // Set default type if not provided
    if (!data.type) {
      data.type = 'Assertion';
    }

    // Set default verification if not provided
    if (!data.verification) {
      data.verification = {
        type: 'hosted',
      };
    }

    // If revoked is true but no credentialStatus is provided, create a default one
    if (data.revoked && !data.credentialStatus) {
      data.credentialStatus = {
        id: `${data.id}#status` as Shared.IRI,
        type: 'StatusList2021Entry',
        statusPurpose: 'revocation',
        statusList: `${data.id}#list` as Shared.IRI,
      };
    }

    return new Assertion(data);
  }

  /**
   * Converts the assertion to a plain object
   * @param version The badge version to use (defaults to 3.0)
   * @returns A plain object representation of the assertion, properly typed as OB2.Assertion or OB3.VerifiableCredential
   */
  toObject(
    version: BadgeVersion = BadgeVersion.V3
  ): OB2.Assertion | OB3.VerifiableCredential {
    // Create a base object with common properties
    const baseObject = {
      // OB2 keeps `issuedOn`; OB3 will use `issuanceDate` later
      ...(version === BadgeVersion.V2 && { issuedOn: this.issuedOn }),
      evidence: this.evidence,
    };

    // Add version-specific properties
    if (version === BadgeVersion.V2) {
      // OB2 Assertion
      return {
        id: this.id,
        ...baseObject,
        type: 'Assertion',
        badge: this.badgeClass, // In OB2, badge is the IRI of the BadgeClass
        recipient: this.recipient as OB2.IdentityObject,
        verification: this.verification as OB2.VerificationObject,
        ...(this.expires && { expires: this.expires }),
        ...(this.revoked !== undefined && { revoked: this.revoked }),
        ...(this.revocationReason && {
          revocationReason: this.revocationReason,
        }),
      } as OB2.Assertion;
    } else {
      // OB3 VerifiableCredential
      // Create a properly typed OB3 VerifiableCredential
      const ob3Data: Record<string, unknown> = {
        id: this.id,
        ...baseObject,
        type: ['VerifiableCredential', 'OpenBadgeCredential'],
        '@context': [
          VC_V2_CONTEXT_URL,
          'https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json',
        ],
        // Cast to proper types for OB3
        issuer: this.issuer,
        // OB3 uses string for dates but with a specific format
        issuanceDate: createDateTime(this.issuedOn),
      };

      // Add expiration date if present
      if (this.expires) {
        ob3Data.expirationDate = createDateTime(this.expires);
      }

      // Add proof if verification is present
      if (this.verification) {
        const verification = this.verification as Record<string, unknown>;
        ob3Data.proof = {
          type: verification.type || 'Ed25519Signature2020',
          created:
            verification.created || createDateTime(new Date().toISOString()),
          verificationMethod: verification.creator || `${this.id}#key-1`,
          proofPurpose: 'assertionMethod',
          ...(verification.signatureValue
            ? { proofValue: verification.signatureValue }
            : {}),
        };
      }

      // Add credentialStatus if present or if revoked
      if (this.credentialStatus || this.revoked) {
        ob3Data.credentialStatus = this.credentialStatus || {
          id: `${this.id}#status` as Shared.IRI,
          type: 'StatusList2021Entry',
          statusPurpose: 'revocation',
          statusList: `${this.id}#list` as Shared.IRI,
        };
      }

      // Create a proper CredentialSubject with required achievement property
      // Use validated recipient ID - this will throw an error if invalid
      const recipientId = this.getValidatedRecipientId();

      ob3Data.credentialSubject = {
        id: recipientId,
        type: 'AchievementSubject',
        achievement: this.badgeClass,
      };

      // Validate and type-check ob3Data as OB3.VerifiableCredential
      return this.validateAsVerifiableCredential(ob3Data);
    }
  }

  /**
   * Converts the assertion to a JSON-LD representation in the specified version
   * @param version The badge version to use (defaults to 3.0)
   * @param badgeClass Optional badge class for the assertion
   * @param issuer Optional issuer for the assertion
   * @returns A JSON-LD representation of the assertion
   */
  toJsonLd(
    version: BadgeVersion = BadgeVersion.V3,
    badgeClass?: BadgeClass,
    issuer?: Issuer
  ): OB2.Assertion | OB3.VerifiableCredential {
    const serializer = BadgeSerializerFactory.createSerializer(version);

    // Convert directly to AssertionData format expected by serializer
    const assertionData: AssertionData = {
      id: this.id,
      badgeClass: this.badgeClass,
      recipient: this.recipient as RecipientData,
      issuedOn: this.issuedOn,
      // Add other properties as needed
      expires: this.expires,
      evidence: this.evidence,
      verification: this.verification as VerificationData,
      revoked: this.revoked,
      revocationReason: this.revocationReason,
    };

    // Add credentialStatus for OB3 if present or if revoked
    if (
      version === BadgeVersion.V3 &&
      (this.credentialStatus || this.revoked)
    ) {
      assertionData.credentialStatus = this.credentialStatus || {
        id: `${this.id}#status` as Shared.IRI,
        type: 'StatusList2021Entry',
        statusPurpose: 'revocation',
        statusList: `${this.id}#list` as Shared.IRI,
      };
    }

    // Get JSON-LD representation from passed entities if they exist
    const typedBadgeClass = badgeClass
      ? (badgeClass.toJsonLd(version) as BadgeClassData)
      : undefined;
    const typedIssuer = issuer
      ? (issuer.toJsonLd(version) as IssuerData)
      : undefined;

    // Then serialize with the appropriate serializer
    const output = serializer.serializeAssertion(
      assertionData,
      typedBadgeClass, // Pass the potentially undefined typed data
      typedIssuer // Pass the potentially undefined typed data
    ) as unknown as Record<string, unknown>;

    // For Open Badges 3 (VerifiableCredential), ensure correct type and context
    if (version === BadgeVersion.V3) {
      // Ensure type is an array with both VerifiableCredential and OpenBadgeCredential
      output.type = ['VerifiableCredential', 'OpenBadgeCredential'];

      // Ensure context includes both VC and OB3 contexts
      if (typeof output['@context'] === 'string') {
        output['@context'] = [VC_V2_CONTEXT_URL, output['@context']];
      } else if (
        Array.isArray(output['@context']) &&
        !output['@context'].includes(VC_V2_CONTEXT_URL)
      ) {
        output['@context'] = [VC_V2_CONTEXT_URL, ...output['@context']];
      }

      // Convert badgeClass to badge for OB3
      if ('badgeClass' in output) {
        output['badge'] = output['badgeClass'];
        delete output['badgeClass'];
      }

      // Ensure proof is properly formatted if verification is present
      if (assertionData.verification) {
        const verification = assertionData.verification as unknown as Record<
          string,
          unknown
        >;
        output.proof = {
          type: 'DataIntegrityProof',
          cryptosuite: 'rsa-sha256',
          created:
            verification.created || createDateTime(new Date().toISOString()),
          verificationMethod: verification.creator || `${this.id}#key-1`,
          proofPurpose: 'assertionMethod',
          proofValue: verification.signatureValue || 'placeholder',
        };
        // Remove the old verification property
        delete output.verification;
      }

      // Ensure credentialSubject is properly formatted
      if (!output.credentialSubject && this.recipient) {
        // Use validated recipient ID - this will throw an error if invalid
        const recipientId = this.getValidatedRecipientId();

        output.credentialSubject = {
          id: recipientId,
          type: 'AchievementSubject',
          achievement: this.badgeClass,
        };
      }

      // Convert issuedOn to issuanceDate
      if (output.issuedOn && !output.issuanceDate) {
        output.issuanceDate = output.issuedOn;
        delete output.issuedOn;
      }

      // Convert expires to expirationDate
      if (output.expires && !output.expirationDate) {
        output.expirationDate = output.expires;
        delete output.expires;
      }
    }

    return output as OB2.Assertion | OB3.VerifiableCredential;
  }

  /**
   * Gets a property value
   * @param property The property name
   * @returns The property value or undefined if not found
   */
  getProperty(property: string): unknown {
    return this[property];
  }

  /**
   * Checks if the assertion is valid (not expired, not revoked)
   * @returns True if the assertion is valid, false otherwise
   */
  isValid(): boolean {
    // Check if revoked
    if (this.revoked) {
      return false;
    }

    // Check if expired
    if (this.expires) {
      const expiryDate = new Date(this.expires);
      const now = new Date();
      if (expiryDate < now) {
        return false;
      }
    }

    return true;
  }

  /**
   * Extracts and validates the recipient ID for OB3 CredentialSubject
   * Converts email addresses to mailto: URIs to ensure valid IRIs
   * @returns A valid IRI for the recipient or throws an error
   * @throws Error if no valid recipient ID can be determined
   */
  private getValidatedRecipientId(): Shared.IRI {
    if (!this.recipient || typeof this.recipient !== 'object') {
      throw new Error(
        'Cannot create OB3 VerifiableCredential: recipient is required and must be a valid object'
      );
    }

    let recipientId: string | undefined;

    if ('identity' in this.recipient) {
      // OB2 style recipient
      recipientId = this.recipient.identity
        ? String(this.recipient.identity)
        : undefined;
    } else if ('id' in this.recipient) {
      // OB3 style recipient
      recipientId = this.recipient.id ? String(this.recipient.id) : undefined;
    }

    if (!recipientId) {
      throw new Error(
        'Cannot create OB3 VerifiableCredential: recipient must have a valid identity or id field'
      );
    }

    // Convert to valid IRI if needed
    const validIRI = this.convertToValidIRI(recipientId);
    if (!validIRI) {
      throw new Error(
        `Cannot create OB3 VerifiableCredential: recipient ID "${recipientId}" cannot be converted to a valid IRI`
      );
    }

    return validIRI;
  }

  /**
   * Converts a recipient identity to a valid IRI
   * @param identity The recipient identity (email, URL, UUID, etc.)
   * @returns A valid IRI or null if conversion is not possible
   */
  private convertToValidIRI(identity: string): Shared.IRI | null {
    // If it's already a valid IRI, return it
    if (isValidIRI(identity)) {
      return identity as Shared.IRI;
    }

    // Check if it's an email address and convert to mailto: URI
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailRegex.test(identity)) {
      return `mailto:${identity}` as Shared.IRI;
    }

    // If it's not a valid IRI and not an email, we can't convert it
    return null;
  }

  /**
   * Validates that an object conforms to the OB3.VerifiableCredential interface
   * @param data The object to validate
   * @returns The validated object as OB3.VerifiableCredential
   * @throws Error if the object does not conform to the OB3.VerifiableCredential interface
   */
  private validateAsVerifiableCredential(
    data: unknown
  ): OB3.VerifiableCredential {
    // Check for required fields in OB3.VerifiableCredential
    const vcData = data as Record<string, unknown>;

    // Validate required fields
    if (!vcData['id']) throw new Error('VerifiableCredential must have an id');
    if (!vcData['type'])
      throw new Error('VerifiableCredential must have a type');
    if (!vcData['issuer'])
      throw new Error('VerifiableCredential must have an issuer');
    if (!vcData['issuanceDate'])
      throw new Error('VerifiableCredential must have an issuanceDate');
    if (!vcData['credentialSubject'])
      throw new Error('VerifiableCredential must have a credentialSubject');
    if (!vcData['@context'])
      throw new Error('VerifiableCredential must have a @context');

    // Validate type is an array with VerifiableCredential
    if (Array.isArray(vcData['type'])) {
      if (!vcData['type'].includes('VerifiableCredential')) {
        throw new Error(
          "VerifiableCredential type array must include 'VerifiableCredential'"
        );
      }
    } else if (vcData['type'] !== 'VerifiableCredential') {
      throw new Error(
        "VerifiableCredential type must be 'VerifiableCredential' or include it in the array"
      );
    }

    // Validate context includes VC context
    if (Array.isArray(vcData['@context'])) {
      if (!vcData['@context'].includes(VC_V2_CONTEXT_URL)) {
        throw new Error(
          'VerifiableCredential @context must include VC_V2_CONTEXT_URL'
        );
      }
    } else if (vcData['@context'] !== VC_V2_CONTEXT_URL) {
      throw new Error(
        'VerifiableCredential @context must be VC_V2_CONTEXT_URL or include it in the array'
      );
    }

    // Validate credentialSubject has achievement
    const subject = vcData['credentialSubject'] as Record<string, unknown>;
    if (!subject['achievement']) {
      throw new Error(
        'VerifiableCredential credentialSubject must have an achievement'
      );
    }

    // If all validations pass, cast to the proper type
    return vcData as unknown as OB3.VerifiableCredential;
  }
}
