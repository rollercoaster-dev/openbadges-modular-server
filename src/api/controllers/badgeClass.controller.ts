/**
 * BadgeClass controller for Open Badges API
 *
 * This file defines the controller for badge class-related operations.
 * It supports both Open Badges 2.0 and 3.0 specifications.
 */

import { BadgeClass } from '../../domains/badgeClass/badgeClass.entity';
import { BadgeClassRepository } from '../../domains/badgeClass/badgeClass.repository';
import { BadgeVersion } from '../../utils/version/badge-version';
import { toIRI } from '../../utils/types/iri-utils';
import { Shared, OB2, OB3 } from 'openbadges-types';

/**
 * Controller for badge class-related operations
 */
export class BadgeClassController {
  /**
   * Constructor
   * @param badgeClassRepository The badge class repository
   */
  constructor(private badgeClassRepository: BadgeClassRepository) {}

  /**
   * Creates a new badge class
   * @param data The badge class data
   * @param version The badge version to use for the response
   * @returns The created badge class
   */
  async createBadgeClass(data: Partial<OB2.BadgeClass | OB3.Achievement>, version: BadgeVersion = BadgeVersion.V3): Promise<OB2.BadgeClass | OB3.Achievement> {
    // Note: Runtime validation needed here
    const badgeClass = BadgeClass.create(data as Partial<BadgeClass>); // Cast needed
    const createdBadgeClass = await this.badgeClassRepository.create(badgeClass);
    // Assuming toJsonLd will be refined to return the specific type based on version
    return createdBadgeClass.toJsonLd(version) as OB2.BadgeClass | OB3.Achievement;
  }

  /**
   * Gets all badge classes
   * @param version The badge version to use for the response
   * @returns All badge classes
   */
  async getAllBadgeClasses(version: BadgeVersion = BadgeVersion.V3): Promise<(OB2.BadgeClass | OB3.Achievement)[]> {
    const badgeClasses = await this.badgeClassRepository.findAll();
    // Assuming toJsonLd will be refined to return the specific type based on version
    return badgeClasses.map(badgeClass => badgeClass.toJsonLd(version) as OB2.BadgeClass | OB3.Achievement);
  }

  /**
   * Gets a badge class by ID
   * @param id The badge class ID
   * @param version The badge version to use for the response
   * @returns The badge class with the specified ID
   */
  async getBadgeClassById(id: string, version: BadgeVersion = BadgeVersion.V3): Promise<OB2.BadgeClass | OB3.Achievement | null> {
    const badgeClass = await this.badgeClassRepository.findById(toIRI(id) as Shared.IRI);
    if (!badgeClass) {
      return null;
    }
    // Assuming toJsonLd will be refined to return the specific type based on version
    return badgeClass.toJsonLd(version) as OB2.BadgeClass | OB3.Achievement;
  }

  /**
   * Gets badge classes by issuer
   * @param issuerId The issuer ID
   * @param version The badge version to use for the response
   * @returns The badge classes for the specified issuer
   */
  async getBadgeClassesByIssuer(issuerId: string, version: BadgeVersion = BadgeVersion.V3): Promise<(OB2.BadgeClass | OB3.Achievement)[]> {
    const badgeClasses = await this.badgeClassRepository.findByIssuer(toIRI(issuerId) as Shared.IRI);
    // Assuming toJsonLd will be refined to return the specific type based on version
    return badgeClasses.map(badgeClass => badgeClass.toJsonLd(version) as OB2.BadgeClass | OB3.Achievement);
  }

  /**
   * Updates a badge class
   * @param id The badge class ID
   * @param data The updated badge class data
   * @param version The badge version to use for the response
   * @returns The updated badge class
   */
  async updateBadgeClass(id: string, data: Partial<OB2.BadgeClass | OB3.Achievement>, version: BadgeVersion = BadgeVersion.V3): Promise<OB2.BadgeClass | OB3.Achievement | null> {
    // Note: Runtime validation needed here
    const updatedBadgeClass = await this.badgeClassRepository.update(toIRI(id) as Shared.IRI, data as Partial<BadgeClass>); // Cast needed
    if (!updatedBadgeClass) {
      return null;
    }
    // Assuming toJsonLd will be refined to return the specific type based on version
    return updatedBadgeClass.toJsonLd(version) as OB2.BadgeClass | OB3.Achievement;
  }

  /**
   * Deletes a badge class
   * @param id The badge class ID
   * @returns True if the badge class was deleted, false otherwise
   */
  async deleteBadgeClass(id: string): Promise<boolean> {
    return await this.badgeClassRepository.delete(toIRI(id) as Shared.IRI);
  }
}
