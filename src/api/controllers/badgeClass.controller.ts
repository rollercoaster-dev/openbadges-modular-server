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
import { Shared } from 'openbadges-types';
import { CreateBadgeClassDto, BadgeClassResponseDto, UpdateBadgeClassDto } from '../dtos';
import { CreateBadgeClassSchema, UpdateBadgeClassSchema } from '../validation/badgeClass.schemas';
import { logger } from '../../utils/logging/logger.service';

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
  async createBadgeClass(data: CreateBadgeClassDto, version: BadgeVersion = BadgeVersion.V3): Promise<BadgeClassResponseDto> {
    try {
      // Validate incoming data using Zod schema first!
      const validatedData = CreateBadgeClassSchema.parse(data);

      // Create badge class entity
      const badgeClass = BadgeClass.create(validatedData as Partial<BadgeClass>);
      const createdBadgeClass = await this.badgeClassRepository.create(badgeClass);
      
      // Return formatted response
      return createdBadgeClass.toJsonLd(version) as BadgeClassResponseDto;
    } catch (error) {
      logger.error('Error creating badge class', { 
        error: error instanceof Error ? error.message : String(error),
        data 
      });
      throw error;
    }
  }

  /**
   * Gets all badge classes
   * @param version The badge version to use for the response
   * @returns All badge classes
   */
  async getAllBadgeClasses(version: BadgeVersion = BadgeVersion.V3): Promise<BadgeClassResponseDto[]> {
    const badgeClasses = await this.badgeClassRepository.findAll();
    return badgeClasses.map(badgeClass => badgeClass.toJsonLd(version) as BadgeClassResponseDto);
  }

  /**
   * Gets a badge class by ID
   * @param id The badge class ID
   * @param version The badge version to use for the response
   * @returns The badge class with the specified ID
   */
  async getBadgeClassById(id: string, version: BadgeVersion = BadgeVersion.V3): Promise<BadgeClassResponseDto | null> {
    const badgeClass = await this.badgeClassRepository.findById(toIRI(id) as Shared.IRI);
    if (!badgeClass) {
      return null;
    }
    return badgeClass.toJsonLd(version) as BadgeClassResponseDto;
  }

  /**
   * Gets badge classes by issuer ID
   * @param issuerId The issuer ID
   * @param version The badge version to use for the response
   * @returns The badge classes for the specified issuer
   */
  async getBadgeClassesByIssuer(issuerId: string, version: BadgeVersion = BadgeVersion.V3): Promise<BadgeClassResponseDto[]> {
    const badgeClasses = await this.badgeClassRepository.findByIssuer(toIRI(issuerId) as Shared.IRI);
    return badgeClasses.map(badgeClass => badgeClass.toJsonLd(version) as BadgeClassResponseDto);
  }

  /**
   * Updates a badge class
   * @param id The badge class ID
   * @param data The updated badge class data
   * @param version The badge version to use for the response
   * @returns The updated badge class
   */
  async updateBadgeClass(id: string, data: UpdateBadgeClassDto, version: BadgeVersion = BadgeVersion.V3): Promise<BadgeClassResponseDto | null> {
    try {
      // Validate incoming data using Zod schema first!
      const validatedData = UpdateBadgeClassSchema.parse(data);

      // Use validated data. Casting might still be needed depending on alignment with internal entity types.
      const updatedBadgeClass = await this.badgeClassRepository.update(toIRI(id) as Shared.IRI, validatedData as Partial<BadgeClass>);
      if (!updatedBadgeClass) {
        return null;
      }
      return updatedBadgeClass.toJsonLd(version) as BadgeClassResponseDto;
    } catch (error) {
      logger.error('Error updating badge class', { 
        id,
        error: error instanceof Error ? error.message : String(error),
        data 
      });
      throw error;
    }
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
