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
import { Shared } from 'openbadges-types';
import { VerificationService } from '../../core/verification.service';
import { KeyService } from '../../core/key.service';
import { logger } from '../../utils/logging/logger.service';

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
    data: Record<string, any>,
    version: BadgeVersion = BadgeVersion.V3,
    sign: boolean = true
  ): Promise<Record<string, any>> {
    try {
      // Initialize the key service
      await KeyService.initialize();

      // Create the assertion
      const assertion = Assertion.create(data);

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
          if (issuer) {
            return createdAssertion.toJsonLd(version, badgeClass.toObject(), issuer.toObject());
          }
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
  async getAllAssertions(version: BadgeVersion = BadgeVersion.V3): Promise<Record<string, any>[]> {
    const assertions = await this.assertionRepository.findAll();

    // Use Promise.all for all versions to maintain consistency
    return Promise.all(assertions.map(async (assertion) => {
      // For V3, fetch related entities
      if (version === BadgeVersion.V3) {
        const badgeClass = await this.badgeClassRepository.findById(assertion.badgeClass);
        if (badgeClass) {
          const issuer = await this.issuerRepository.findById(badgeClass.issuer);
          if (issuer) {
            return assertion.toJsonLd(version, badgeClass.toObject(), issuer.toObject());
          }
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
  async getAssertionById(id: string, version: BadgeVersion = BadgeVersion.V3): Promise<Record<string, any> | null> {
    const assertion = await this.assertionRepository.findById(toIRI(id) as Shared.IRI);
    if (!assertion) {
      return null;
    }

    if (version === BadgeVersion.V3) {
      const badgeClass = await this.badgeClassRepository.findById(assertion.badgeClass);
      if (badgeClass) {
        const issuer = await this.issuerRepository.findById(badgeClass.issuer);
        if (issuer) {
          return assertion.toJsonLd(version, badgeClass.toObject(), issuer.toObject());
        }
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
  async getAssertionsByBadgeClass(badgeClassId: string, version: BadgeVersion = BadgeVersion.V3): Promise<Record<string, any>[]> {
    const assertions = await this.assertionRepository.findByBadgeClass(toIRI(badgeClassId) as Shared.IRI);

    if (version === BadgeVersion.V3) {
      const badgeClass = await this.badgeClassRepository.findById(toIRI(badgeClassId) as Shared.IRI);
      if (badgeClass) {
        const issuer = await this.issuerRepository.findById(badgeClass.issuer);
        if (issuer) {
          return assertions.map(assertion =>
            assertion.toJsonLd(version, badgeClass.toObject(), issuer.toObject())
          );
        }
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
  async updateAssertion(id: string, data: Record<string, any>, version: BadgeVersion = BadgeVersion.V3): Promise<Record<string, any> | null> {
    const updatedAssertion = await this.assertionRepository.update(toIRI(id) as Shared.IRI, data);
    if (!updatedAssertion) {
      return null;
    }

    if (version === BadgeVersion.V3) {
      const badgeClass = await this.badgeClassRepository.findById(updatedAssertion.badgeClass);
      if (badgeClass) {
        const issuer = await this.issuerRepository.findById(badgeClass.issuer);
        if (issuer) {
          return updatedAssertion.toJsonLd(version, badgeClass.toObject(), issuer.toObject());
        }
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
  ): Promise<Record<string, any> | null> {
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
        const badgeClass = await this.badgeClassRepository.findById(updatedAssertion.badgeClass);
        if (badgeClass) {
          const issuer = await this.issuerRepository.findById(badgeClass.issuer);
          if (issuer) {
            return updatedAssertion.toJsonLd(version, badgeClass.toObject(), issuer.toObject());
          }
        }
      }

      return updatedAssertion.toJsonLd(version);
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
