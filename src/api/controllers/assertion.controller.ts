/**
 * Assertion controller for Open Badges API
 *
 * This file defines the controller for assertion-related operations.
 * It supports both Open Badges 2.0 and 3.0 specifications.
 */

import { Assertion } from '../../domains/assertion/assertion.entity';
import { AssertionRepository } from '../../domains/assertion/assertion.repository';
import { BadgeClassRepository } from '../../domains/badgeClass/badgeClass.repository';
import { IssuerRepository } from '../../domains/issuer/issuer.repository';
import { BadgeClass } from '../../domains/badgeClass/badgeClass.entity';
import { Issuer } from '../../domains/issuer/issuer.entity';
import { BadgeVersion } from '../../utils/version/badge-version';
import { toIRI } from '../../utils/types/iri-utils';
import { Shared, OB2, OB3 } from 'openbadges-types';
import { VerificationService } from '../../core/verification.service';
import { VerificationStatus, VerificationErrorCode, createVerificationError } from '../../utils/types/verification-status';
import { KeyService } from '../../core/key.service';
import { logger } from '../../utils/logging/logger.service';
import { CreateAssertionDto, UpdateAssertionDto, AssertionResponseDto } from '../dtos';
import { CreateAssertionSchema, UpdateAssertionSchema } from '../validation/assertion.schemas';
import { z } from 'zod';
import { UserPermission } from '../../domains/user/user.entity';

// Define types inferred from Zod schemas
type ValidatedCreateAssertionData = z.infer<typeof CreateAssertionSchema>;
type ValidatedUpdateAssertionData = z.infer<typeof UpdateAssertionSchema>;

/**
 * Maps incoming validated Zod data to the internal Partial<Assertion> format.
 * Only copies properties defined in the internal Assertion entity.
 * Assumes basic type/format validation (like date strings) is done by Zod.
 * @param data Input data (ValidatedCreateAssertionData | ValidatedUpdateAssertionData)
 * @returns Mapped data (Partial<Assertion>)
 */
function mapToAssertionEntity(
  data: ValidatedCreateAssertionData | ValidatedUpdateAssertionData
): Partial<Assertion> {
  const mappedData: Partial<Assertion> = {};

  // Map properties directly from validated data
  // Zod ensures presence/type for required fields and format for dates
  // Casting might be needed if internal types differ significantly (e.g., branded types)

  // Map properties using safe assertions based on Assertion entity types
  if ('id' in data && data.id !== undefined) mappedData.id = data.id as Shared.IRI; // OB3 allows optional ID
  if (data.badge !== undefined) mappedData.badgeClass = data.badge as Shared.IRI; // Renamed: badge -> badgeClass
  if (data.recipient !== undefined) mappedData.recipient = data.recipient as OB2.IdentityObject | OB3.CredentialSubject; // Assume Zod structure matches
  if (data.verification !== undefined) mappedData.verification = data.verification as OB2.VerificationObject | OB3.Proof | OB3.CredentialStatus; // Assume Zod structure matches
  if (data.evidence !== undefined) {
    // Define a type for the evidence union to improve readability and type safety
    type EvidenceUnion = OB2.Evidence[] | OB3.Evidence[];
    mappedData.evidence = data.evidence as EvidenceUnion; // Single cast with explicit type
  }
  if (data.revoked !== undefined) mappedData.revoked = data.revoked as boolean;
  if (data.revocationReason !== undefined) mappedData.revocationReason = data.revocationReason as string;
  if (data.issuedOn !== undefined) mappedData.issuedOn = data.issuedOn; // Zod validated format
  if (data.expires !== undefined) mappedData.expires = data.expires; // Zod validated format

  // Properties not part of internal Assertion entity are intentionally ignored:
  // narrative, image, type, credentialSubject etc. are handled by Assertion entity itself or are not stored directly.

  return mappedData;
}

/**
 * Controller for assertion-related operations
 */
/**
 * Helper function to convert an Assertion entity to JSON-LD format with proper typing
 * @param assertion The assertion entity to convert
 * @param version The badge version to use
 * @param badgeClass Optional badge class entity for enriched response
 * @param issuer Optional issuer entity for enriched response
 * @returns The assertion in JSON-LD format with proper typing
 */
function convertAssertionToJsonLd(
  assertion: Assertion,
  version: BadgeVersion,
  badgeClass?: BadgeClass,
  issuer?: Issuer
): AssertionResponseDto {
  if (badgeClass && issuer) {
    return assertion.toJsonLd(version, badgeClass, issuer) as AssertionResponseDto;
  }
  return assertion.toJsonLd(version) as AssertionResponseDto;
}

export class AssertionController {
  /**
   * Constructor
   * @param assertionRepository The assertion repository
   * @param badgeClassRepository The badge class repository
   * @param issuerRepository The issuer repository
   */
  constructor(
    private assertionRepository: AssertionRepository,
    private badgeClassRepository: BadgeClassRepository,
    private issuerRepository: IssuerRepository
  ) {}

  /**
   * Check if the user has the required permission
   * @param user The authenticated user
   * @param permission The required permission
   * @returns True if the user has the permission, false otherwise
   */
  private hasPermission(user: { claims?: Record<string, unknown> } | null, permission: UserPermission): boolean {
    if (!user || !user.claims) {
      return false;
    }

    const permissions = user.claims['permissions'] as UserPermission[] || [];
    return permissions.includes(permission);
  }

  /**
   * Creates a new assertion
   * @param data The assertion data
   * @param version The badge version to use for the response
   * @param sign Whether to sign the assertion (default: true)
   * @param user The authenticated user
   * @returns The created assertion
   */
  async createAssertion(
    data: CreateAssertionDto,
    version: BadgeVersion = BadgeVersion.V3,
    sign: boolean = true,
    user?: { claims?: Record<string, unknown> } | null
  ): Promise<AssertionResponseDto> {
    // Check if user has permission to create assertions
    if (user && !this.hasPermission(user, UserPermission.CREATE_ASSERTION)) {
      logger.warn(`User ${user.claims?.['sub'] || 'unknown'} attempted to create an assertion without permission`);
      throw new Error('Insufficient permissions to create assertion');
    }
    try {
      // Log the raw data for debugging
      logger.debug('Raw assertion creation data', { data });

      // Validate incoming data using Zod schema first!
      const validatedData = CreateAssertionSchema.parse(data);

      // Initialize the key service
      await KeyService.initialize();

      // Map incoming data to internal format
      let mappedData: Partial<Assertion>;
      try {
        // Pass validatedData instead of raw data
        mappedData = mapToAssertionEntity(validatedData);
      } catch (error) {
        // Handle potential mapping errors if any (though simplified map should be safer)
        logger.error('Error mapping validated assertion data', { error });
        throw error; // Re-throw other mapping errors
      }

      // Create the assertion using the mapped data
      const assertion = Assertion.create(mappedData);

      // Sign the assertion if requested
      let signedAssertion = assertion;
      if (sign) {
        signedAssertion = await VerificationService.createVerificationForAssertion(assertion);
      }

      // Save the assertion
      const createdAssertion = await this.assertionRepository.create(signedAssertion);

      // For a complete response, we need the badge class and issuer
      if (version === BadgeVersion.V3) {
        const badgeClass = await this.badgeClassRepository.findById(createdAssertion.badgeClass);
        if (badgeClass) {
          // Handle both string and object issuer IDs
          const issuerId = typeof badgeClass.issuer === 'string'
            ? badgeClass.issuer
            : (badgeClass.issuer as OB3.Issuer).id;
          const issuer = await this.issuerRepository.findById(issuerId);
          return convertAssertionToJsonLd(createdAssertion, version, badgeClass, issuer);
        }
      }

      return convertAssertionToJsonLd(createdAssertion, version);
    } catch (error) {
      logger.logError('Failed to create assertion', error as Error);
      throw error;
    }
  }

  /**
   * Gets all assertions
   * @param version The badge version to use for the response
   * @returns All assertions
   */
  async getAllAssertions(version: BadgeVersion = BadgeVersion.V3): Promise<(OB2.Assertion | OB3.VerifiableCredential)[]> {
    const assertions = await this.assertionRepository.findAll();

    // Use Promise.all for all versions to maintain consistency
    return Promise.all(assertions.map(async (assertion) => {
      // For V3, fetch related entities
      if (version === BadgeVersion.V3) {
        const badgeClass = await this.badgeClassRepository.findById(assertion.badgeClass);
        if (badgeClass) {
          // Handle both string and object issuer IDs
          const issuerId = typeof badgeClass.issuer === 'string'
            ? badgeClass.issuer
            : (badgeClass.issuer as OB3.Issuer).id;
          const issuer = await this.issuerRepository.findById(issuerId);
          // Pass entities directly
          return assertion.toJsonLd(version, badgeClass, issuer);
        }
      }

      // For other versions or if related entities not found
      return assertion.toJsonLd(version);
    }));
  }

  /**
   * Gets an assertion by ID
   * @param id The assertion ID
   * @param version The badge version to use for the response
   * @returns The assertion with the specified ID
   */
  async getAssertionById(id: string, version: BadgeVersion = BadgeVersion.V3): Promise<OB2.Assertion | OB3.VerifiableCredential | null> {
    const assertion = await this.assertionRepository.findById(toIRI(id) as Shared.IRI);
    if (!assertion) {
      return null;
    }

    if (version === BadgeVersion.V3) {
      const badgeClass = await this.badgeClassRepository.findById(assertion.badgeClass);
      if (badgeClass) {
        const issuerIri = typeof badgeClass.issuer === 'string' ? badgeClass.issuer : badgeClass.issuer.id as Shared.IRI;
        const issuer = await this.issuerRepository.findById(issuerIri);
        // Pass entities directly
        return convertAssertionToJsonLd(assertion, version, badgeClass, issuer);
      }
    }

    return convertAssertionToJsonLd(assertion, version);
  }

  /**
   * Gets assertions by badge class
   * @param badgeClassId The badge class ID
   * @param version The badge version to use for the response
   * @returns The assertions for the specified badge class
   */
  async getAssertionsByBadgeClass(badgeClassId: string, version: BadgeVersion = BadgeVersion.V3): Promise<(OB2.Assertion | OB3.VerifiableCredential)[]> {
    const assertions = await this.assertionRepository.findByBadgeClass(toIRI(badgeClassId) as Shared.IRI);

    if (version === BadgeVersion.V3) {
      const badgeClass = await this.badgeClassRepository.findById(toIRI(badgeClassId) as Shared.IRI);
      if (badgeClass) {
        const issuerIri = typeof badgeClass.issuer === 'string' ? badgeClass.issuer : badgeClass.issuer.id as Shared.IRI;
        const issuer = await this.issuerRepository.findById(issuerIri);
        // Pass entities directly
        return assertions.map(assertion =>
          convertAssertionToJsonLd(assertion, version, badgeClass, issuer)
        );
      }
    }

    return assertions.map(assertion => convertAssertionToJsonLd(assertion, version));
  }

  /**
   * Updates an assertion
   * @param id The assertion ID
   * @param data The updated assertion data
   * @param version The badge version to use for the response
   * @param user The authenticated user
   * @returns The updated assertion
   */
  async updateAssertion(
    id: string,
    data: UpdateAssertionDto,
    version: BadgeVersion = BadgeVersion.V3,
    user?: { claims?: Record<string, unknown> } | null
  ): Promise<AssertionResponseDto | null> {
    // Check if user has permission to update assertions
    if (user && !this.hasPermission(user, UserPermission.UPDATE_ASSERTION)) {
      logger.warn(`User ${user.claims?.['sub'] || 'unknown'} attempted to update assertion ${id} without permission`);
      throw new Error('Insufficient permissions to update assertion');
    }
    try {
      // Validate incoming data using Zod schema first!
      const validatedData = UpdateAssertionSchema.parse(data);

      // Map incoming data to internal format using validated data
      let mappedData: Partial<Assertion>;
      try {
        // Pass validatedData instead of raw data
        mappedData = mapToAssertionEntity(validatedData);
      } catch (error) {
        // Handle potential mapping errors
        logger.error('Error mapping validated assertion data for update', { error });
        throw error; // Re-throw other mapping errors
      }

      const updatedAssertion = await this.assertionRepository.update(toIRI(id) as Shared.IRI, mappedData);
      if (!updatedAssertion) {
        return null;
      }

      if (version === BadgeVersion.V3) {
        const badgeClass = await this.badgeClassRepository.findById(updatedAssertion.badgeClass);
        if (badgeClass) {
          const issuerIri = typeof badgeClass.issuer === 'string' ? badgeClass.issuer : badgeClass.issuer.id as Shared.IRI;
          const issuer = await this.issuerRepository.findById(issuerIri);
          return convertAssertionToJsonLd(updatedAssertion, version, badgeClass, issuer);
        }
      }

      return convertAssertionToJsonLd(updatedAssertion, version);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Revokes an assertion
   * @param id The assertion ID
   * @param reason The revocation reason
   * @param user The authenticated user
   * @returns True if the assertion was revoked, false otherwise
   */
  async revokeAssertion(id: string, reason: string, user?: { claims?: Record<string, unknown> } | null): Promise<boolean> {
    // Check if user has permission to revoke assertions
    if (user && !this.hasPermission(user, UserPermission.REVOKE_ASSERTION)) {
      logger.warn(`User ${user.claims?.['sub'] || 'unknown'} attempted to revoke assertion ${id} without permission`);
      throw new Error('Insufficient permissions to revoke assertion');
    }

    const result = await this.assertionRepository.revoke(toIRI(id) as Shared.IRI, reason);
    return result !== null;
  }

  /**
   * Verifies an assertion
   * @param id The assertion ID
   * @returns Verification results
   */
  async verifyAssertion(id: string): Promise<VerificationStatus> {
    try {
      // Initialize the key service
      await KeyService.initialize();

      // Get the assertion
      const assertion = await this.assertionRepository.findById(toIRI(id) as Shared.IRI);
      if (!assertion) {
        return createVerificationError(
          VerificationErrorCode.ASSERTION_NOT_FOUND,
          'Assertion not found'
        );
      }

      // Verify badge class exists
      const badgeClass = await this.badgeClassRepository.findById(assertion.badgeClass);
      if (!badgeClass) {
        return createVerificationError(
          VerificationErrorCode.INTERNAL_ERROR,
          'Referenced badge class not found'
        );
      }

      // Verify issuer exists
      const issuerIri = typeof badgeClass.issuer === 'string' ? badgeClass.issuer : badgeClass.issuer.id as Shared.IRI;
      const issuer = await this.issuerRepository.findById(issuerIri);
      if (!issuer) {
        return createVerificationError(
          VerificationErrorCode.INTERNAL_ERROR,
          'Referenced issuer not found'
        );
      }

      // Use the verification service to verify the assertion
      return await VerificationService.verifyAssertion(assertion);
    } catch (error) {
      logger.logError(`Failed to verify assertion with ID ${id}`, error as Error);
      return createVerificationError(
        VerificationErrorCode.INTERNAL_ERROR,
        `Error during verification process: ${(error as Error).message}`
      );
    }
  }

  /**
   * Signs an existing assertion
   * @param id The assertion ID
   * @param keyId Optional key ID to use for signing (defaults to 'default')
   * @param version The badge version to use for the response
   * @param user The authenticated user
   * @returns The signed assertion
   */
  async signAssertion(
    id: string,
    keyId: string = 'default',
    version: BadgeVersion = BadgeVersion.V3,
    user?: { claims?: Record<string, unknown> } | null
  ): Promise<OB2.Assertion | OB3.VerifiableCredential | null> {
    // Check if user has permission to sign assertions
    if (user && !this.hasPermission(user, UserPermission.SIGN_ASSERTION)) {
      logger.warn(`User ${user.claims?.['sub'] || 'unknown'} attempted to sign assertion ${id} without permission`);
      throw new Error('Insufficient permissions to sign assertion');
    }
    try {
      // Initialize the key service
      await KeyService.initialize();

      // Get the assertion
      const assertion = await this.assertionRepository.findById(toIRI(id) as Shared.IRI);
      if (!assertion) {
        return null;
      }

      // Sign the assertion
      const signedAssertion = await VerificationService.createVerificationForAssertion(assertion, keyId);

      // Update the assertion in the repository
      // Convert the signed assertion to a partial assertion for the repository
      // Use destructuring to get a plain object with the properties
      const signedData = { ...signedAssertion };
      const updatedAssertion = await this.assertionRepository.update(assertion.id, signedData as Partial<Assertion>);
      if (!updatedAssertion) {
        return null;
      }

      // For a complete response, we need the badge class and issuer
      if (version === BadgeVersion.V3) {
        const badgeClass = await this.badgeClassRepository.findById(signedAssertion.badgeClass);
        const issuerIri = badgeClass?.issuer
          ? (typeof badgeClass.issuer === 'string' ? badgeClass.issuer : badgeClass.issuer.id as Shared.IRI)
          : null;
        const issuer = issuerIri ? await this.issuerRepository.findById(issuerIri) : null;
        // Pass entities directly
        return signedAssertion.toJsonLd(version, badgeClass, issuer);
      } else {
        // For V2 or if related entities are not needed/found
        return signedAssertion.toJsonLd(version);
      }
    } catch (error) {
      logger.logError(`Failed to sign assertion with ID ${id}`, error as Error);
      return null;
    }
  }

  /**
   * Gets the public keys used for verification
   * @returns List of public keys
   */
  async getPublicKeys(): Promise<{ id: string; publicKey: string }[]> {
    try {
      // Initialize the key service
      await KeyService.initialize();

      // Get all key IDs
      const keyIds = KeyService.listKeyIds();

      // Get the public keys for each ID
      return keyIds.map(id => ({
        id,
        publicKey: KeyService.getPublicKey(id)
      }));
    } catch (error) {
      logger.logError('Failed to get public keys', error as Error);
      return [];
    }
  }

  /**
   * Gets a specific public key
   * @param keyId The key ID
   * @returns The public key or null if not found
   */
  async getPublicKey(keyId: string): Promise<{ id: string; publicKey: string } | null> {
    try {
      // Initialize the key service
      await KeyService.initialize();

      // Get the public key
      const publicKey = KeyService.getPublicKey(keyId);

      return {
        id: keyId,
        publicKey
      };
    } catch (error) {
      logger.logError(`Failed to get public key with ID ${keyId}`, error as Error);
      return null;
    }
  }
}
