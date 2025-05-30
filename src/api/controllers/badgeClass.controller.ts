/**
 * BadgeClass controller for Open Badges API
 *
 * This file defines the controller for badge class-related operations.
 * It supports both Open Badges 2.0 and 3.0 specifications.
 */

import { BadgeClass } from '../../domains/badgeClass/badgeClass.entity';
import { BadgeClassRepository } from '../../domains/badgeClass/badgeClass.repository';
import { IssuerRepository } from '../../domains/issuer/issuer.repository';
import { BadgeVersion } from '../../utils/version/badge-version';
import { toIRI } from '../../utils/types/iri-utils';
import { Shared } from 'openbadges-types';
import {
  CreateBadgeClassDto,
  BadgeClassResponseDto,
  UpdateBadgeClassDto,
} from '../dtos';
import {
  CreateBadgeClassSchema,
  UpdateBadgeClassSchema,
} from '../validation/badgeClass.schemas';
import { logger } from '../../utils/logging/logger.service';
import { z } from 'zod';
import { UserPermission } from '../../domains/user/user.entity';
import { BadRequestError } from '../../infrastructure/errors/bad-request.error';

// Define types inferred from Zod schemas
type ValidatedCreateBadgeClassData = z.infer<typeof CreateBadgeClassSchema>;
type ValidatedUpdateBadgeClassData = z.infer<typeof UpdateBadgeClassSchema>;

/**
 * Maps validated badge class data to an internal BadgeClass entity format
 * @param data Validated badge class data from Zod schema
 * @param options Configuration options for mapping
 * @param options.allowId Whether to allow mapping the id field (default: false)
 * @returns Data mapped to Partial<BadgeClass> format
 */
function mapToBadgeClassEntity(
  data: ValidatedCreateBadgeClassData | ValidatedUpdateBadgeClassData,
  { allowId = false } = {}
): Partial<BadgeClass> {
  // Create a clean object with only the properties needed for the BadgeClass entity
  const mappedData: Partial<BadgeClass> = {};

  // Map standard properties
  if (data.name !== undefined) mappedData.name = data.name;
  if (data.description !== undefined) mappedData.description = data.description;
  if (data.issuer !== undefined) mappedData.issuer = data.issuer as Shared.IRI;

  // Handle image which could be string URL or object
  if (data.image !== undefined) {
    // For simplicity, we'll just pass the image through and let the entity handle it
    // This avoids complex type casting issues
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mappedData as any).image = data.image;
  }

  // Handle criteria which could be string URL or object
  if (data.criteria !== undefined) {
    // For simplicity, we'll just pass the criteria through and let the entity handle it
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mappedData as any).criteria = data.criteria;
  }

  // Handle other properties
  if (allowId && 'id' in data && data.id !== undefined) {
    mappedData.id = data.id as Shared.IRI;
  }
  if (data.tags !== undefined) mappedData.tags = data.tags;
  if (data.alignment !== undefined) {
    // For simplicity, we'll just pass the alignment through and let the entity handle it
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mappedData as any).alignment = data.alignment;
  }

  // Return the mapped data
  return mappedData;
}

/**
 * Controller for badge class-related operations
 */
export class BadgeClassController {
  /**
   * Constructor
   * @param badgeClassRepository The badge class repository
   * @param issuerRepository The issuer repository (optional for backward compatibility)
   */
  constructor(
    private badgeClassRepository: BadgeClassRepository,
    private issuerRepository?: IssuerRepository
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

    const raw = user.claims['permissions'];
    return Array.isArray(raw) && raw.includes(permission);
  }

  /**
   * Creates a new badge class
   * @param data The badge class data
   * @param version The badge version to use for the response
   * @param user The authenticated user
   * @returns The created badge class
   */
  async createBadgeClass(
    data: CreateBadgeClassDto,
    version: BadgeVersion = BadgeVersion.V3,
    user?: { claims?: Record<string, unknown> } | null
  ): Promise<BadgeClassResponseDto> {
    // Check if user has permission to create badge classes
    if (user && !this.hasPermission(user, UserPermission.CREATE_BADGE_CLASS)) {
      logger.warn(
        `User ${
          user.claims?.['sub'] || 'unknown'
        } attempted to create a badge class without permission`
      );
      throw new BadRequestError(
        'Insufficient permissions to create badge class'
      );
    }
    try {
      // Validate incoming data using Zod schema first!
      const validatedData = CreateBadgeClassSchema.parse(data);

      // Ensure referenced issuer exists
      if (validatedData.issuer && this.issuerRepository) {
        const issuer = await this.issuerRepository.findById(
          toIRI(validatedData.issuer) as Shared.IRI
        );
        if (!issuer) {
          throw new BadRequestError(
            `Referenced issuer '${validatedData.issuer}' does not exist`
          );
        }
      }

      // Create badge class entity using the mapping function
      const badgeClass = BadgeClass.create(
        mapToBadgeClassEntity(validatedData)
      );
      const createdBadgeClass = await this.badgeClassRepository.create(
        badgeClass
      );

      // Return formatted response
      return createdBadgeClass.toJsonLd(version) as BadgeClassResponseDto;
    } catch (error) {
      logger.error('Error creating badge class', {
        error: error instanceof Error ? error.message : String(error),
        data,
      });
      throw error;
    }
  }

  /**
   * Gets all badge classes
   * @param version The badge version to use for the response
   * @returns All badge classes
   */
  async getAllBadgeClasses(
    version: BadgeVersion = BadgeVersion.V3
  ): Promise<BadgeClassResponseDto[]> {
    const badgeClasses = await this.badgeClassRepository.findAll();
    return badgeClasses.map(
      (badgeClass) => badgeClass.toJsonLd(version) as BadgeClassResponseDto
    );
  }

  /**
   * Gets a badge class by ID
   * @param id The badge class ID
   * @param version The badge version to use for the response
   * @returns The badge class with the specified ID
   */
  async getBadgeClassById(
    id: string,
    version: BadgeVersion = BadgeVersion.V3
  ): Promise<BadgeClassResponseDto | null> {
    const badgeClass = await this.badgeClassRepository.findById(
      toIRI(id) as Shared.IRI
    );
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
  async getBadgeClassesByIssuer(
    issuerId: string,
    version: BadgeVersion = BadgeVersion.V3
  ): Promise<BadgeClassResponseDto[]> {
    const badgeClasses = await this.badgeClassRepository.findByIssuer(
      toIRI(issuerId) as Shared.IRI
    );
    return badgeClasses.map(
      (badgeClass) => badgeClass.toJsonLd(version) as BadgeClassResponseDto
    );
  }

  /**
   * Updates a badge class
   * @param id The badge class ID
   * @param data The updated badge class data
   * @param version The badge version to use for the response
   * @param user The authenticated user
   * @returns The updated badge class
   */
  async updateBadgeClass(
    id: string,
    data: UpdateBadgeClassDto,
    version: BadgeVersion = BadgeVersion.V3,
    user?: { claims?: Record<string, unknown> } | null
  ): Promise<BadgeClassResponseDto | null> {
    // Check if user has permission to update badge classes
    if (user && !this.hasPermission(user, UserPermission.UPDATE_BADGE_CLASS)) {
      logger.warn(
        `User ${
          user.claims?.['sub'] || 'unknown'
        } attempted to update badge class ${id} without permission`
      );
      throw new BadRequestError(
        'Insufficient permissions to update badge class'
      );
    }
    try {
      // Validate incoming data using Zod schema first!
      const validatedData = UpdateBadgeClassSchema.parse(data);

      // Ensure referenced issuer exists
      if (validatedData.issuer && this.issuerRepository) {
        const issuer = await this.issuerRepository.findById(
          toIRI(validatedData.issuer) as Shared.IRI
        );
        if (!issuer) {
          throw new BadRequestError(
            `Referenced issuer '${validatedData.issuer}' does not exist`
          );
        }
      }

      // Use validated data mapped to entity format
      const updatedBadgeClass = await this.badgeClassRepository.update(
        toIRI(id) as Shared.IRI,
        mapToBadgeClassEntity(validatedData, { allowId: true })
      );
      if (!updatedBadgeClass) {
        return null;
      }
      return updatedBadgeClass.toJsonLd(version) as BadgeClassResponseDto;
    } catch (error) {
      logger.error('Error updating badge class', {
        id,
        error: error instanceof Error ? error.message : String(error),
        data,
      });
      throw error;
    }
  }

  /**
   * Deletes a badge class
   * @param id The badge class ID
   * @param version The badge version (for logging and future extensibility)
   * @param user The authenticated user
   * @returns True if the badge class was deleted, false otherwise
   */
  async deleteBadgeClass(
    id: string,
    version: BadgeVersion = BadgeVersion.V3,
    user?: { claims?: Record<string, unknown> } | null
  ): Promise<boolean> {
    // Check if user has permission to delete badge classes
    if (user && !this.hasPermission(user, UserPermission.DELETE_BADGE_CLASS)) {
      logger.warn(
        `User ${
          user.claims?.['sub'] || 'unknown'
        } attempted to delete badge class ${id} without permission`
      );
      throw new BadRequestError(
        'Insufficient permissions to delete badge class'
      );
    }

    const iri = toIRI(id) as Shared.IRI;

    // Log the delete operation with version information for audit purposes
    logger.info('Deleting badge class', {
      id: iri,
      version,
      user: user?.claims?.['sub'] || 'unknown',
    });

    return await this.badgeClassRepository.delete(iri);
  }
}
