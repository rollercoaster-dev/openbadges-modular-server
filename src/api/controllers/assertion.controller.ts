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
import { BadgeVersion } from '../../utils/version/badge-version';
import { toIRI } from '../../utils/types/iri-utils';
import { Shared, OB2, OB3 } from 'openbadges-types';
import { VerificationService } from '../../core/verification.service';
import { KeyService } from '../../core/key.service';
import { logger } from '../../utils/logging/logger.service';

/**
 * Maps incoming partial OB2/OB3 data to the internal Partial<Assertion> format.
 * Only copies properties defined in the internal Assertion entity.
 * @param data Input data (Partial<OB2.Assertion | OB3.VerifiableCredential>)
 * @returns Mapped data (Partial<Assertion>)
 */
const mapToPartialAssertion = (
  data: Partial<OB2.Assertion | OB3.VerifiableCredential>
): Partial<Assertion> => {
  const mappedData: Partial<Assertion> = {};

  // Helper to format dates as ISO strings for the Assertion entity
  const formatAssertionDateString = (dateInput: unknown): string | undefined => {
    if (dateInput instanceof Date) {
      return dateInput.toISOString();
    }
    // Pass through strings/numbers assuming they are valid ISO/epoch representations
    // Downstream validation should catch invalid formats if necessary
    if (typeof dateInput === 'string') {
      // Basic check: return string directly
      return dateInput;
    }
     if (typeof dateInput === 'number') {
        // Convert epoch ms to ISO string
        try {
          return new Date(dateInput).toISOString();
        } catch {
          logger.warn('Could not convert numeric date to ISO string', { value: dateInput });
          return undefined;
        }
    }
    logger.warn('Unsupported date format received in mapToPartialAssertion', { value: dateInput });
    return undefined;
  };

  // Map properties using safe assertions based on Assertion entity types
  if (data.id !== undefined) mappedData.id = data.id as Shared.IRI;
  if (data.badgeClass !== undefined) mappedData.badgeClass = data.badgeClass as Shared.IRI;
  if (data.recipient !== undefined) mappedData.recipient = data.recipient as OB2.IdentityObject | OB3.CredentialSubject;
  if (data.verification !== undefined) mappedData.verification = data.verification as OB2.VerificationObject | OB3.Proof | OB3.CredentialStatus;
  if (data.evidence !== undefined) mappedData.evidence = data.evidence as OB2.Evidence[] | OB3.Evidence[];
  if (data.revoked !== undefined) mappedData.revoked = data.revoked as boolean;
  if (data.revocationReason !== undefined) mappedData.revocationReason = data.revocationReason as string;

  // Map date properties, ensuring they are strings
  if (data.issuedOn !== undefined) {
    const formattedDate = formatAssertionDateString(data.issuedOn);
    if (formattedDate !== undefined) {
      mappedData.issuedOn = formattedDate;
    } else {
      // Log warning? Or should this be an error since issuedOn is required by entity?
      // For now, let's log and skip assignment if format is invalid.
       logger.warn('Skipping invalid issuedOn assignment due to format', { value: data.issuedOn });
    }
  }
  if (data.expires !== undefined) {
     mappedData.expires = formatAssertionDateString(data.expires); // Undefined is acceptable for expires
  }

  // Properties not part of internal Assertion entity are intentionally ignored:
  // issuer, narrative, image, etc.

  return mappedData;
};

/**
 * Controller for assertion-related operations
 */
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
   * Creates a new assertion
   * @param data The assertion data
   * @param version The badge version to use for the response
   * @param sign Whether to sign the assertion (default: true)
   * @returns The created assertion
   */
  async createAssertion(
    data: Partial<OB2.Assertion | OB3.VerifiableCredential>,
    version: BadgeVersion = BadgeVersion.V3,
    sign: boolean = true
  ): Promise<OB2.Assertion | OB3.VerifiableCredential> {
    try {
      // Initialize the key service
      await KeyService.initialize();

      // Map incoming data to internal format
      const mappedData = mapToPartialAssertion(data);

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
          const issuer = await this.issuerRepository.findById(badgeClass.issuer);
          // Pass entities directly
          return createdAssertion.toJsonLd(version, badgeClass, issuer);
        }
      }

      return createdAssertion.toJsonLd(version);
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
          const issuer = await this.issuerRepository.findById(badgeClass.issuer);
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
        const issuer = await this.issuerRepository.findById(badgeClass.issuer);
        // Pass entities directly
        return assertion.toJsonLd(version, badgeClass, issuer);
      }
    }

    return assertion.toJsonLd(version);
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
        const issuer = await this.issuerRepository.findById(badgeClass.issuer);
        // Pass entities directly
        return assertions.map(assertion =>
          assertion.toJsonLd(version, badgeClass, issuer)
        );
      }
    }

    return assertions.map(assertion => assertion.toJsonLd(version));
  }

  /**
   * Updates an assertion
   * @param id The assertion ID
   * @param data The updated assertion data
   * @param version The badge version to use for the response
   * @returns The updated assertion
   */
  async updateAssertion(
    id: string, 
    data: Partial<OB2.Assertion | OB3.VerifiableCredential>, 
    version: BadgeVersion = BadgeVersion.V3
  ): Promise<OB2.Assertion | OB3.VerifiableCredential | null> {
    const mappedData = mapToPartialAssertion(data);
    const updatedAssertion = await this.assertionRepository.update(toIRI(id) as Shared.IRI, mappedData);
    if (!updatedAssertion) {
      return null;
    }

    if (version === BadgeVersion.V3) {
      const badgeClass = await this.badgeClassRepository.findById(updatedAssertion.badgeClass);
      if (badgeClass) {
        const issuer = await this.issuerRepository.findById(badgeClass.issuer);
        // Pass entities directly
        return updatedAssertion.toJsonLd(version, badgeClass, issuer);
      }
    }

    return updatedAssertion.toJsonLd(version);
  }

  /**
   * Revokes an assertion
   * @param id The assertion ID
   * @param reason The revocation reason
   * @returns True if the assertion was revoked, false otherwise
   */
  async revokeAssertion(id: string, reason: string): Promise<boolean> {
    const result = await this.assertionRepository.revoke(toIRI(id) as Shared.IRI, reason);
    return result !== null;
  }

  /**
   * Verifies an assertion
   * @param id The assertion ID
   * @returns Verification results
   */
  async verifyAssertion(id: string): Promise<{
    isValid: boolean;
    isExpired: boolean;
    isRevoked: boolean;
    hasValidSignature: boolean;
    details?: string;
  }> {
    try {
      // Initialize the key service
      await KeyService.initialize();

      // Get the assertion
      const assertion = await this.assertionRepository.findById(toIRI(id) as Shared.IRI);
      if (!assertion) {
        return {
          isValid: false,
          isExpired: false,
          isRevoked: false,
          hasValidSignature: false,
          details: 'Assertion not found'
        };
      }

      // Verify badge class exists
      const badgeClass = await this.badgeClassRepository.findById(assertion.badgeClass);
      if (!badgeClass) {
        return {
          isValid: false,
          isExpired: false,
          isRevoked: false,
          hasValidSignature: false,
          details: 'Referenced badge class not found'
        };
      }

      // Verify issuer exists
      const issuer = await this.issuerRepository.findById(badgeClass.issuer);
      if (!issuer) {
        return {
          isValid: false,
          isExpired: false,
          isRevoked: false,
          hasValidSignature: false,
          details: 'Referenced issuer not found'
        };
      }

      // Use the verification service to verify the assertion
      return await VerificationService.verifyAssertion(assertion);
    } catch (error) {
      logger.logError(`Failed to verify assertion with ID ${id}`, error as Error);
      return {
        isValid: false,
        isExpired: false,
        isRevoked: false,
        hasValidSignature: false,
        details: 'Error during verification process'
      };
    }
  }

  /**
   * Signs an existing assertion
   * @param id The assertion ID
   * @param keyId Optional key ID to use for signing (defaults to 'default')
   * @param version The badge version to use for the response
   * @returns The signed assertion
   */
  async signAssertion(
    id: string,
    keyId: string = 'default',
    version: BadgeVersion = BadgeVersion.V3
  ): Promise<OB2.Assertion | OB3.VerifiableCredential | null> { 
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
      const updatedAssertion = await this.assertionRepository.update(assertion.id, signedAssertion.toObject());
      if (!updatedAssertion) {
        return null;
      }

      // For a complete response, we need the badge class and issuer
      if (version === BadgeVersion.V3) {
        const badgeClass = await this.badgeClassRepository.findById(signedAssertion.badgeClass);
        const issuer = await this.issuerRepository.findById(badgeClass?.issuer); // Use optional chaining for safety
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
