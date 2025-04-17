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
   * @returns The created assertion
   */
  async createAssertion(data: Record<string, any>, version: BadgeVersion = BadgeVersion.V3): Promise<Record<string, any>> {
    const assertion = Assertion.create(data);
    const createdAssertion = await this.assertionRepository.create(assertion);

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
   * @returns True if the assertion is valid, false otherwise
   */
  async verifyAssertion(id: string): Promise<{ isValid: boolean; reason?: string }> {
    const assertion = await this.assertionRepository.findById(toIRI(id) as Shared.IRI);
    if (!assertion) {
      return { isValid: false, reason: 'Assertion not found' };
    }

    // Check if revoked
    if (assertion.revoked) {
      return {
        isValid: false,
        reason: assertion.revocationReason || 'Assertion has been revoked'
      };
    }

    // Check if expired
    if (assertion.expires) {
      const expiryDate = new Date(assertion.expires);
      const now = new Date();
      if (expiryDate < now) {
        return { isValid: false, reason: 'Assertion has expired' };
      }
    }

    // Verify badge class exists
    const badgeClass = await this.badgeClassRepository.findById(assertion.badgeClass);
    if (!badgeClass) {
      return { isValid: false, reason: 'Referenced badge class not found' };
    }

    // Verify issuer exists
    const issuer = await this.issuerRepository.findById(badgeClass.issuer);
    if (!issuer) {
      return { isValid: false, reason: 'Referenced issuer not found' };
    }

    // Additional verification logic could be added here

    return { isValid: true };
  }
}
