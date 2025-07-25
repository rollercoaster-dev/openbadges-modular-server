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
import { BadRequestError } from '../../infrastructure/errors/bad-request.error';
import {
  VerificationStatus,
  VerificationErrorCode,
  createVerificationError,
} from '../../utils/types/verification-status';
import { KeyService } from '../../core/key.service';
import { CredentialStatusService } from '../../core/credential-status.service';
import { StatusPurpose } from '../../domains/status-list/status-list.types';
import { logger } from '../../utils/logging/logger.service';
import {
  CreateAssertionDto,
  UpdateAssertionDto,
  AssertionResponseDto,
  BatchCreateCredentialsDto,
  BatchRetrieveCredentialsDto,
  BatchUpdateCredentialStatusDto,
  BatchOperationResponseDto,
  BatchOperationResult,
} from '../dtos';
import { UserPermission } from '../../domains/user/user.entity';

/**
 * Maps incoming validated data to the internal Partial<Assertion> format.
 * Only copies properties defined in the internal Assertion entity.
 * Assumes basic type/format validation (like date strings) is done by validation middleware.
 * @param data Input data (CreateAssertionDto | UpdateAssertionDto)
 * @returns Mapped data (Partial<Assertion>)
 */
function mapToAssertionEntity(
  data: CreateAssertionDto | UpdateAssertionDto
): Partial<Assertion> {
  const mappedData: Partial<Assertion> = {};

  // Map properties directly from validated data
  // Validation middleware ensures presence/type for required fields and format for dates
  // Casting might be needed if internal types differ significantly (e.g., branded types)

  // Map properties using safe assertions based on Assertion entity types
  if ('id' in data && data.id !== undefined)
    mappedData.id = data.id as Shared.IRI; // OB3 allows optional ID

  // Handle both 'badge' and 'badgeClass' fields (middleware may have mapped badge -> badgeClass)
  if ('badgeClass' in data && data.badgeClass !== undefined) {
    mappedData.badgeClass = data.badgeClass as Shared.IRI;
  } else if ('badge' in data && data.badge !== undefined) {
    mappedData.badgeClass = data.badge as Shared.IRI; // Renamed: badge -> badgeClass
  }
  if (data.recipient !== undefined)
    mappedData.recipient = data.recipient as
      | OB2.IdentityObject
      | OB3.CredentialSubject; // Assume Zod structure matches
  if (data.verification !== undefined)
    mappedData.verification = data.verification as
      | OB2.VerificationObject
      | OB3.Proof
      | OB3.CredentialStatus; // Assume Zod structure matches
  if (data.evidence !== undefined) {
    // Define a type for the evidence union to improve readability and type safety
    type EvidenceUnion = OB2.Evidence[] | OB3.Evidence[];
    mappedData.evidence = data.evidence as EvidenceUnion; // Single cast with explicit type
  }
  if (data.revoked !== undefined) mappedData.revoked = data.revoked as boolean;
  if (data.revocationReason !== undefined)
    mappedData.revocationReason = data.revocationReason as string;
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
    return assertion.toJsonLd(
      version,
      badgeClass,
      issuer
    ) as AssertionResponseDto;
  }
  return assertion.toJsonLd(version) as AssertionResponseDto;
}

export class AssertionController {
  /**
   * Constructor
   * @param assertionRepository The assertion repository
   * @param badgeClassRepository The badge class repository
   * @param issuerRepository The issuer repository
   * @param credentialStatusService The credential status service (optional for backward compatibility)
   */
  constructor(
    private assertionRepository: AssertionRepository,
    private badgeClassRepository: BadgeClassRepository,
    private issuerRepository: IssuerRepository,
    private credentialStatusService?: CredentialStatusService
  ) {}

  /**
   * Check if the user has the required permission
   * @param user The authenticated user
   * @param permission The required permission
   * @returns True if the user has the permission, false otherwise
   */
  private hasPermission(
    user: { claims?: Record<string, unknown> } | null,
    permission: UserPermission
  ): boolean {
    if (!user || !user.claims) {
      return false;
    }

    const permissions = (user.claims['permissions'] as UserPermission[]) || [];
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
      logger.warn(
        `User ${
          user.claims?.['sub'] || 'unknown'
        } attempted to create an assertion without permission`
      );
      throw new BadRequestError('Insufficient permissions to create assertion');
    }
    try {
      // Log the raw data for debugging
      logger.debug('Raw assertion creation data', { data });

      // Note: Validation is already done by the validation middleware
      // The data parameter is already validated and potentially mapped

      // Initialize the key service
      await KeyService.initialize();

      // Map incoming data to internal format
      let mappedData: Partial<Assertion>;
      try {
        // Pass the already validated data directly
        mappedData = mapToAssertionEntity(data);
      } catch (error) {
        // Handle potential mapping errors if any (though simplified map should be safer)
        logger.error('Error mapping validated assertion data', { error });
        throw error; // Re-throw other mapping errors
      }

      // Validate that the badge class exists before creating the assertion
      const badgeClassId = mappedData.badgeClass;
      if (!badgeClassId) {
        throw new BadRequestError('Badge class ID is required');
      }

      const badgeClass = await this.badgeClassRepository.findById(badgeClassId);
      if (!badgeClass) {
        logger.warn(
          `Attempted to create assertion for non-existent badge class: ${badgeClassId}`
        );
        // Throw a BadRequestError instead of a generic Error to get a 400 status code
        throw new BadRequestError(
          `Badge class with ID ${badgeClassId} does not exist`
        );
      }

      // Get issuer information from badge class for v3.0 compliance
      let issuer: Issuer | null = null;
      if (version === BadgeVersion.V3) {
        // We already have the badge class from validation above
        // Handle both string and object issuer IDs
        const issuerId =
          typeof badgeClass.issuer === 'string'
            ? badgeClass.issuer
            : (badgeClass.issuer as OB3.Issuer).id;
        issuer = await this.issuerRepository.findById(issuerId);

        if (!issuer) {
          throw new BadRequestError(
            `Referenced issuer '${issuerId}' does not exist`
          );
        }

        // Populate issuer field in assertion for v3.0 compliance
        mappedData.issuer = issuer.id;
      }

      // Create the assertion using the mapped data
      const assertion = Assertion.create(mappedData);

      // Sign the assertion if requested
      let signedAssertion = assertion;
      if (sign) {
        signedAssertion =
          await VerificationService.createVerificationForAssertion(assertion);
      }

      // Save the assertion first (required for foreign key constraints)
      const createdAssertion = await this.assertionRepository.create(
        signedAssertion
      );

      // Assign credential status for v3.0 credentials if service is available
      // This must happen AFTER the assertion is saved to satisfy foreign key constraints
      if (
        version === BadgeVersion.V3 &&
        this.credentialStatusService &&
        issuer
      ) {
        try {
          const statusAssignment =
            await this.credentialStatusService.assignCredentialStatus({
              credentialId: createdAssertion.id,
              issuerId: issuer.id,
              purpose: StatusPurpose.REVOCATION,
              statusSize: 1,
              initialStatus: 0, // 0 = active/valid
            });

          if (statusAssignment.success && statusAssignment.credentialStatus) {
            // Update the assertion with the assigned credential status
            createdAssertion.credentialStatus =
              statusAssignment.credentialStatus;

            // Update the assertion in the database with the credential status
            await this.assertionRepository.update(createdAssertion.id, {
              credentialStatus: statusAssignment.credentialStatus,
            });

            logger.info('Credential status assigned to assertion', {
              assertionId: createdAssertion.id,
              statusListIndex:
                statusAssignment.credentialStatus.statusListIndex,
              statusListCredential:
                statusAssignment.credentialStatus.statusListCredential,
            });
          } else {
            logger.warn('Failed to assign credential status', {
              assertionId: createdAssertion.id,
              error: statusAssignment.error,
            });
          }
        } catch (error) {
          logger.error('Error during credential status assignment', {
            assertionId: createdAssertion.id,
            error: error instanceof Error ? error.message : String(error),
          });
          // Continue without status assignment - this is not a critical failure
        }
      }

      // For a complete response, we need the badge class and issuer
      if (version === BadgeVersion.V3) {
        return convertAssertionToJsonLd(
          createdAssertion,
          version,
          badgeClass,
          issuer
        );
      }

      return convertAssertionToJsonLd(createdAssertion, version);
    } catch (error) {
      logger.error('Failed to create assertion', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Gets all assertions
   * @param version The badge version to use for the response
   * @returns All assertions
   */
  async getAllAssertions(
    version: BadgeVersion = BadgeVersion.V3
  ): Promise<(OB2.Assertion | OB3.VerifiableCredential)[]> {
    const assertions = await this.assertionRepository.findAll();

    // Use Promise.all for all versions to maintain consistency
    return Promise.all(
      assertions.map(async (assertion) => {
        // For V3, fetch related entities
        if (version === BadgeVersion.V3) {
          const badgeClass = await this.badgeClassRepository.findById(
            assertion.badgeClass
          );
          if (badgeClass) {
            // Handle both string and object issuer IDs
            const issuerId =
              typeof badgeClass.issuer === 'string'
                ? badgeClass.issuer
                : (badgeClass.issuer as OB3.Issuer).id;
            const issuer = await this.issuerRepository.findById(issuerId);
            // Pass entities directly
            return assertion.toJsonLd(version, badgeClass, issuer);
          }
        }

        // For other versions or if related entities not found
        return assertion.toJsonLd(version);
      })
    );
  }

  /**
   * Gets an assertion by ID
   * @param id The assertion ID
   * @param version The badge version to use for the response
   * @param includeRevoked Whether to include revoked assertions in response (default: false for compliance)
   * @returns The assertion with the specified ID, or null if not found or revoked
   */
  async getAssertionById(
    id: string,
    version: BadgeVersion = BadgeVersion.V3,
    includeRevoked: boolean = false
  ): Promise<OB2.Assertion | OB3.VerifiableCredential | null> {
    const assertion = await this.assertionRepository.findById(
      toIRI(id) as Shared.IRI
    );
    if (!assertion) {
      return null;
    }

    // Check if assertion is revoked and handle according to Open Badges compliance
    if (assertion.revoked && !includeRevoked) {
      // For Open Badges compliance, revoked assertions should not be accessible
      // via the standard GET endpoint. Third-party verifiers should use the
      // verification endpoint to check status.
      return null;
    }

    if (version === BadgeVersion.V3) {
      const badgeClass = await this.badgeClassRepository.findById(
        assertion.badgeClass
      );

      // Get issuer from assertion.issuer field (preferred) or from badge class
      let issuer: Issuer | null = null;
      if (assertion.issuer && typeof assertion.issuer === 'string') {
        // Use issuer from assertion entity (v3.0 compliant)
        issuer = await this.issuerRepository.findById(assertion.issuer);
      } else if (badgeClass?.issuer) {
        // Fallback to issuer from badge class
        const issuerIri =
          typeof badgeClass.issuer === 'string'
            ? badgeClass.issuer
            : (badgeClass.issuer.id as Shared.IRI);
        issuer = await this.issuerRepository.findById(issuerIri);
      }

      if (badgeClass) {
        // Pass entities directly
        return convertAssertionToJsonLd(assertion, version, badgeClass, issuer);
      }
    }

    return convertAssertionToJsonLd(assertion, version);
  }

  /**
   * Checks if an assertion exists and is revoked
   * @param id The assertion ID
   * @returns Object with existence and revocation status
   */
  async checkAssertionRevocationStatus(
    id: string
  ): Promise<{ exists: boolean; revoked: boolean; revocationReason?: string }> {
    const assertion = await this.assertionRepository.findById(
      toIRI(id) as Shared.IRI
    );

    if (!assertion) {
      return { exists: false, revoked: false };
    }

    return {
      exists: true,
      revoked: !!assertion.revoked,
      revocationReason: assertion.revocationReason,
    };
  }

  /**
   * Gets assertions by badge class
   * @param badgeClassId The badge class ID
   * @param version The badge version to use for the response
   * @returns The assertions for the specified badge class
   */
  async getAssertionsByBadgeClass(
    badgeClassId: string,
    version: BadgeVersion = BadgeVersion.V3
  ): Promise<(OB2.Assertion | OB3.VerifiableCredential)[]> {
    const assertions = await this.assertionRepository.findByBadgeClass(
      toIRI(badgeClassId) as Shared.IRI
    );

    if (version === BadgeVersion.V3) {
      const badgeClass = await this.badgeClassRepository.findById(
        toIRI(badgeClassId) as Shared.IRI
      );
      if (badgeClass) {
        const issuerIri =
          typeof badgeClass.issuer === 'string'
            ? badgeClass.issuer
            : (badgeClass.issuer.id as Shared.IRI);
        const issuer = await this.issuerRepository.findById(issuerIri);
        // Pass entities directly
        return assertions.map((assertion) =>
          convertAssertionToJsonLd(assertion, version, badgeClass, issuer)
        );
      }
    }

    return assertions.map((assertion) =>
      convertAssertionToJsonLd(assertion, version)
    );
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
      logger.warn(
        `User ${
          user.claims?.['sub'] || 'unknown'
        } attempted to update assertion ${id} without permission`
      );
      throw new BadRequestError('Insufficient permissions to update assertion');
    }
    try {
      // Note: Validation is already done by the validation middleware
      // The data parameter is already validated and potentially mapped

      // Map incoming data to internal format using validated data
      let mappedData: Partial<Assertion>;
      try {
        // Pass the already validated data directly
        mappedData = mapToAssertionEntity(data);
      } catch (error) {
        // Handle potential mapping errors
        logger.error('Error mapping validated assertion data for update', {
          error,
        });
        throw error; // Re-throw other mapping errors
      }

      const updatedAssertion = await this.assertionRepository.update(
        toIRI(id) as Shared.IRI,
        mappedData
      );
      if (!updatedAssertion) {
        return null;
      }

      if (version === BadgeVersion.V3) {
        const badgeClass = await this.badgeClassRepository.findById(
          updatedAssertion.badgeClass
        );
        if (badgeClass) {
          const issuerIri =
            typeof badgeClass.issuer === 'string'
              ? badgeClass.issuer
              : (badgeClass.issuer.id as Shared.IRI);
          const issuer = await this.issuerRepository.findById(issuerIri);
          return convertAssertionToJsonLd(
            updatedAssertion,
            version,
            badgeClass,
            issuer
          );
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
  async revokeAssertion(
    id: string,
    reason: string,
    user?: { claims?: Record<string, unknown> } | null
  ): Promise<boolean> {
    // Check if user has permission to revoke assertions
    if (user && !this.hasPermission(user, UserPermission.REVOKE_ASSERTION)) {
      logger.warn(
        `User ${
          user.claims?.['sub'] || 'unknown'
        } attempted to revoke assertion ${id} without permission`
      );
      throw new BadRequestError('Insufficient permissions to revoke assertion');
    }

    const result = await this.assertionRepository.revoke(
      toIRI(id) as Shared.IRI,
      reason
    );
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
      const assertion = await this.assertionRepository.findById(
        toIRI(id) as Shared.IRI
      );
      if (!assertion) {
        return createVerificationError(
          VerificationErrorCode.ASSERTION_NOT_FOUND,
          'Assertion not found'
        );
      }

      // Verify badge class exists
      const badgeClass = await this.badgeClassRepository.findById(
        assertion.badgeClass
      );
      if (!badgeClass) {
        return createVerificationError(
          VerificationErrorCode.INTERNAL_ERROR,
          'Referenced badge class not found'
        );
      }

      // Verify issuer exists
      const issuerIri =
        typeof badgeClass.issuer === 'string'
          ? badgeClass.issuer
          : (badgeClass.issuer.id as Shared.IRI);
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
      logger.error(`Failed to verify assertion with ID ${id}`, {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
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
      logger.warn(
        `User ${
          user.claims?.['sub'] || 'unknown'
        } attempted to sign assertion ${id} without permission`
      );
      throw new BadRequestError('Insufficient permissions to sign assertion');
    }
    try {
      // Initialize the key service
      await KeyService.initialize();

      // Get the assertion
      const assertion = await this.assertionRepository.findById(
        toIRI(id) as Shared.IRI
      );
      if (!assertion) {
        return null;
      }

      // Sign the assertion
      const signedAssertion =
        await VerificationService.createVerificationForAssertion(
          assertion,
          keyId
        );

      // Update the assertion in the repository
      // Convert the signed assertion to a partial assertion for the repository
      // Use destructuring to get a plain object with the properties
      const signedData = { ...signedAssertion };
      const updatedAssertion = await this.assertionRepository.update(
        assertion.id,
        signedData as Partial<Assertion>
      );
      if (!updatedAssertion) {
        return null;
      }

      // For a complete response, we need the badge class and issuer
      if (version === BadgeVersion.V3) {
        const badgeClass = await this.badgeClassRepository.findById(
          signedAssertion.badgeClass
        );
        const issuerIri = badgeClass?.issuer
          ? typeof badgeClass.issuer === 'string'
            ? badgeClass.issuer
            : (badgeClass.issuer.id as Shared.IRI)
          : null;
        const issuer = issuerIri
          ? await this.issuerRepository.findById(issuerIri)
          : null;
        // Pass entities directly
        return signedAssertion.toJsonLd(version, badgeClass, issuer);
      } else {
        // For V2 or if related entities are not needed/found
        return signedAssertion.toJsonLd(version);
      }
    } catch (error) {
      logger.error(`Failed to sign assertion with ID ${id}`, {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
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
      const publicKeys = await Promise.all(
        keyIds.map(async (id) => ({
          id,
          publicKey: await KeyService.getPublicKey(id),
        }))
      );

      return publicKeys;
    } catch (error) {
      logger.error('Failed to get public keys', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return [];
    }
  }

  /**
   * Gets a specific public key
   * @param keyId The key ID
   * @returns The public key or null if not found
   */
  async getPublicKey(
    keyId: string
  ): Promise<{ id: string; publicKey: string } | null> {
    try {
      // Initialize the key service
      await KeyService.initialize();

      // Get the public key
      const publicKey = await KeyService.getPublicKey(keyId);

      return {
        id: keyId,
        publicKey,
      };
    } catch (error) {
      logger.error(`Failed to get public key with ID ${keyId}`, {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  /**
   * Creates multiple assertions in a batch operation
   * @param data The batch creation data
   * @param version The badge version to use for the response
   * @param sign Whether to sign the assertions (default: true)
   * @param user The authenticated user
   * @returns Batch operation results
   */
  async createAssertionsBatch(
    data: BatchCreateCredentialsDto,
    version: BadgeVersion = BadgeVersion.V3,
    sign: boolean = true,
    user?: { claims?: Record<string, unknown> } | null
  ): Promise<BatchOperationResponseDto<AssertionResponseDto>> {
    const startTime = Date.now();
    const batchId = `batch_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // Memory management: Check batch size and warn for large batches
    if (data.credentials.length > 50) {
      logger.warn(`Large batch operation detected`, {
        batchId,
        credentialCount: data.credentials.length,
        user: user?.claims?.['sub'] || 'unknown',
      });
    }

    // Check if user has permission to create assertions
    if (user && !this.hasPermission(user, UserPermission.CREATE_ASSERTION)) {
      logger.warn(
        `User ${
          user.claims?.['sub'] || 'unknown'
        } attempted to create assertions batch without permission`
      );
      throw new BadRequestError(
        'Insufficient permissions to create assertions'
      );
    }

    try {
      logger.debug('Batch assertion creation data', {
        credentialCount: data.credentials.length,
      });

      // Initialize the key service
      await KeyService.initialize();

      // Process each credential and prepare for batch creation
      const assertionsToCreate: Omit<Assertion, 'id'>[] = [];
      const validationResults: BatchOperationResult<AssertionResponseDto>[] =
        [];

      for (let i = 0; i < data.credentials.length; i++) {
        const credentialData = data.credentials[i];
        try {
          // Map incoming data to internal format
          const mappedData = mapToAssertionEntity(credentialData);

          // Validate that the badge class exists
          const badgeClassId = mappedData.badgeClass;
          if (!badgeClassId) {
            validationResults.push({
              index: i,
              success: false,
              error: {
                code: 'VALIDATION_ERROR',
                message: 'Badge class ID is required',
                field: 'badgeClass',
                details: { batchIndex: i, batchId },
              },
            });
            continue;
          }

          const badgeClass = await this.badgeClassRepository.findById(
            badgeClassId
          );
          if (!badgeClass) {
            validationResults.push({
              index: i,
              success: false,
              error: {
                code: 'VALIDATION_ERROR',
                message: `Badge class with ID ${badgeClassId} does not exist`,
                field: 'badgeClass',
                details: { batchIndex: i, batchId, badgeClassId },
              },
            });
            continue;
          }

          // Create the assertion using the mapped data
          const assertion = Assertion.create(mappedData);

          // Sign the assertion if requested
          let signedAssertion = assertion;
          if (sign) {
            signedAssertion =
              await VerificationService.createVerificationForAssertion(
                assertion
              );
          }

          assertionsToCreate.push(signedAssertion);
          validationResults.push({ index: i, success: true });
        } catch (error) {
          logger.error(`Error processing credential ${i} in batch ${batchId}`, {
            error,
            batchId,
            index: i,
          });
          validationResults.push({
            index: i,
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message:
                error instanceof Error
                  ? error.message
                  : 'Unknown validation error',
              field: 'credential',
              details: { batchIndex: i, batchId },
            },
          });
        }
      }

      // Perform batch creation for valid assertions
      const batchResults = await this.assertionRepository.createBatch(
        assertionsToCreate
      );

      // Combine validation and creation results
      const results: BatchOperationResult<AssertionResponseDto>[] = [];
      let batchIndex = 0;

      // Collect successful assertion IDs for batch conversion
      const successfulAssertionIds: string[] = [];
      const successfulIndices: number[] = [];

      for (let i = 0; i < validationResults.length; i++) {
        const validationResult = validationResults[i];

        if (validationResult.success) {
          const batchResult = batchResults[batchIndex];
          batchIndex++;

          if (batchResult.success && batchResult.assertion) {
            successfulAssertionIds.push(batchResult.assertion.id);
            successfulIndices.push(i);
          }
        }
      }

      // Batch convert successful assertions to JSON-LD format
      const jsonLdAssertions: (AssertionResponseDto | null)[] = [];
      if (successfulAssertionIds.length > 0) {
        try {
          const assertions = await this.assertionRepository.findByIds(
            successfulAssertionIds as Shared.IRI[]
          );
          for (const assertion of assertions) {
            if (assertion) {
              jsonLdAssertions.push(
                assertion.toJsonLd(version) as AssertionResponseDto
              );
            } else {
              jsonLdAssertions.push(null);
            }
          }
        } catch (error) {
          logger.error('Failed to batch convert assertions to JSON-LD', {
            error,
          });
          // Fill with nulls if batch conversion fails
          jsonLdAssertions.push(
            ...new Array(successfulAssertionIds.length).fill(null)
          );
        }
      }

      // Build final results
      batchIndex = 0;
      let jsonLdIndex = 0;

      for (let i = 0; i < validationResults.length; i++) {
        const validationResult = validationResults[i];

        if (validationResult.success) {
          const batchResult = batchResults[batchIndex];
          batchIndex++;

          if (batchResult.success && batchResult.assertion) {
            const jsonLdAssertion = jsonLdAssertions[jsonLdIndex];
            jsonLdIndex++;

            if (jsonLdAssertion) {
              results.push({
                id: batchResult.assertion.id,
                index: i,
                success: true,
                data: jsonLdAssertion,
              });
            } else {
              results.push({
                id: batchResult.assertion.id,
                index: i,
                success: false,
                error: {
                  code: 'CONVERSION_ERROR',
                  message: 'Failed to convert assertion to response format',
                  details: { batchId, assertionId: batchResult.assertion.id },
                },
              });
            }
          } else {
            results.push({
              index: i,
              success: false,
              error: {
                code: 'CREATION_ERROR',
                message: batchResult.error || 'Failed to create assertion',
                details: { batchId, batchIndex: i },
              },
            });
          }
        } else {
          results.push(validationResult);
        }
      }

      // Calculate summary
      const successful = results.filter((r) => r.success).length;
      const failed = results.length - successful;
      const processingTimeMs = Date.now() - startTime;

      return {
        results,
        summary: {
          total: results.length,
          successful,
          failed,
          processingTimeMs,
        },
        metadata: {
          batchId,
          timestamp: new Date().toISOString(),
          version: version.toString(),
        },
      };
    } catch (error) {
      logger.error('Failed to create assertions batch', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Retrieves multiple assertions in a batch operation
   * @param data The batch retrieval data
   * @param version The badge version to use for the response
   * @returns Batch operation results
   */
  async getAssertionsBatch(
    data: BatchRetrieveCredentialsDto,
    version: BadgeVersion = BadgeVersion.V3
  ): Promise<BatchOperationResponseDto<AssertionResponseDto>> {
    const startTime = Date.now();
    const batchId = `retrieve_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    try {
      logger.debug('Batch assertion retrieval data', {
        batchId,
        idCount: data.ids.length,
      });

      // Retrieve assertions from repository
      const assertions = await this.assertionRepository.findByIds(
        data.ids as Shared.IRI[]
      );

      // Convert to response format
      const results: BatchOperationResult<AssertionResponseDto>[] = [];

      for (let i = 0; i < data.ids.length; i++) {
        const id = data.ids[i];
        const assertion = assertions[i];

        if (assertion) {
          try {
            // Convert to JSON-LD format directly (avoid additional DB call)
            const jsonLdAssertion = assertion.toJsonLd(
              version
            ) as AssertionResponseDto;
            results.push({
              id,
              index: i,
              success: true,
              data: jsonLdAssertion,
            });
          } catch (_error) {
            results.push({
              id,
              index: i,
              success: false,
              error: {
                code: 'CONVERSION_ERROR',
                message: 'Failed to convert assertion to response format',
                details: { batchId, assertionId: id },
              },
            });
          }
        } else {
          results.push({
            id,
            index: i,
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: 'Assertion not found',
              details: { batchId, requestedId: id },
            },
          });
        }
      }

      // Calculate summary
      const successful = results.filter((r) => r.success).length;
      const failed = results.length - successful;
      const processingTimeMs = Date.now() - startTime;

      return {
        results,
        summary: {
          total: results.length,
          successful,
          failed,
          processingTimeMs,
        },
        metadata: {
          batchId,
          timestamp: new Date().toISOString(),
          version: version.toString(),
        },
      };
    } catch (error) {
      logger.error('Failed to retrieve assertions batch', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Updates the status of multiple assertions in a batch operation
   * @param data The batch status update data
   * @param version The badge version to use for the response
   * @returns Batch operation results
   */
  async updateAssertionStatusBatch(
    data: BatchUpdateCredentialStatusDto,
    version: BadgeVersion = BadgeVersion.V3
  ): Promise<BatchOperationResponseDto<AssertionResponseDto>> {
    const startTime = Date.now();
    const batchId = `update_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    try {
      logger.debug('Batch assertion status update data', {
        batchId,
        updateCount: data.updates.length,
      });

      // Perform batch status updates
      const updateResults = await this.assertionRepository.updateStatusBatch(
        data.updates.map((update) => ({
          ...update,
          id: update.id as Shared.IRI,
        }))
      );

      // Convert to response format
      const results: BatchOperationResult<AssertionResponseDto>[] = [];
      let index = 0;

      for (const updateResult of updateResults) {
        if (updateResult.success && updateResult.assertion) {
          try {
            // Convert to JSON-LD format directly (avoid additional DB call)
            const jsonLdAssertion = updateResult.assertion.toJsonLd(
              version
            ) as AssertionResponseDto;
            results.push({
              id: updateResult.id,
              index,
              success: true,
              data: jsonLdAssertion,
            });
          } catch (_error) {
            results.push({
              id: updateResult.id,
              index,
              success: false,
              error: {
                code: 'CONVERSION_ERROR',
                message: 'Failed to convert assertion to response format',
                details: { batchId, assertionId: updateResult.id },
              },
            });
          }
        } else {
          results.push({
            id: updateResult.id,
            index,
            success: false,
            error: {
              code: 'UPDATE_ERROR',
              message:
                updateResult.error || 'Failed to update assertion status',
              details: { batchId },
            },
          });
        }
        index++;
      }

      // Calculate summary
      const successful = results.filter((r) => r.success).length;
      const failed = results.length - successful;
      const processingTimeMs = Date.now() - startTime;

      return {
        results,
        summary: {
          total: results.length,
          successful,
          failed,
          processingTimeMs,
        },
        metadata: {
          batchId,
          timestamp: new Date().toISOString(),
          version: version.toString(),
        },
      };
    } catch (error) {
      logger.error('Failed to update assertion status batch', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
}
