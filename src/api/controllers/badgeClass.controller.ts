/**
 * BadgeClass controller for Open Badges API
 * 
 * This file defines the controller for badge class-related operations.
 * It supports both Open Badges 2.0 and 3.0 specifications.
 */

import { BadgeClass } from '../../domains/badgeClass/badgeClass.entity';
import { BadgeClassRepository } from '../../domains/badgeClass/badgeClass.repository';
import { BadgeVersion } from '../../utils/version/badge-version';

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
  async createBadgeClass(data: Record<string, any>, version: BadgeVersion = BadgeVersion.V3): Promise<Record<string, any>> {
    const badgeClass = BadgeClass.create(data);
    const createdBadgeClass = await this.badgeClassRepository.create(badgeClass);
    return createdBadgeClass.toJsonLd(version);
  }

  /**
   * Gets all badge classes
   * @param version The badge version to use for the response
   * @returns All badge classes
   */
  async getAllBadgeClasses(version: BadgeVersion = BadgeVersion.V3): Promise<Record<string, any>[]> {
    const badgeClasses = await this.badgeClassRepository.findAll();
    return badgeClasses.map(badgeClass => badgeClass.toJsonLd(version));
  }

  /**
   * Gets a badge class by ID
   * @param id The badge class ID
   * @param version The badge version to use for the response
   * @returns The badge class with the specified ID
   */
  async getBadgeClassById(id: string, version: BadgeVersion = BadgeVersion.V3): Promise<Record<string, any> | null> {
    const badgeClass = await this.badgeClassRepository.findById(id);
    if (!badgeClass) {
      return null;
    }
    return badgeClass.toJsonLd(version);
  }

  /**
   * Gets badge classes by issuer
   * @param issuerId The issuer ID
   * @param version The badge version to use for the response
   * @returns The badge classes for the specified issuer
   */
  async getBadgeClassesByIssuer(issuerId: string, version: BadgeVersion = BadgeVersion.V3): Promise<Record<string, any>[]> {
    const badgeClasses = await this.badgeClassRepository.findByIssuer(issuerId);
    return badgeClasses.map(badgeClass => badgeClass.toJsonLd(version));
  }

  /**
   * Updates a badge class
   * @param id The badge class ID
   * @param data The updated badge class data
   * @param version The badge version to use for the response
   * @returns The updated badge class
   */
  async updateBadgeClass(id: string, data: Record<string, any>, version: BadgeVersion = BadgeVersion.V3): Promise<Record<string, any> | null> {
    const updatedBadgeClass = await this.badgeClassRepository.update(id, data);
    if (!updatedBadgeClass) {
      return null;
    }
    return updatedBadgeClass.toJsonLd(version);
  }

  /**
   * Deletes a badge class
   * @param id The badge class ID
   * @returns True if the badge class was deleted, false otherwise
   */
  async deleteBadgeClass(id: string): Promise<boolean> {
    return await this.badgeClassRepository.delete(id);
  }
}
