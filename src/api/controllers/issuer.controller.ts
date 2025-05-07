/**
 * Issuer controller for Open Badges API
 *
 * This file defines the controller for issuer-related operations.
 * It supports both Open Badges 2.0 and 3.0 specifications.
 */

import { Issuer } from '../../domains/issuer/issuer.entity';
import { IssuerRepository } from '../../domains/issuer/issuer.repository';
import { BadgeVersion } from '../../utils/version/badge-version';
import { toIRI } from '../../utils/types/iri-utils';
import { Shared, OB2 } from 'openbadges-types';
import { CreateIssuerDto, IssuerResponseDto, UpdateIssuerDto } from '../dtos';
import { CreateIssuerSchema, UpdateIssuerSchema } from '../validation/issuer.schemas';
import { logger } from '../../utils/logging/logger.service';
import { z } from 'zod';
import { UserPermission } from '../../domains/user/user.entity';

// Define types inferred from Zod schemas
type ValidatedCreateIssuerData = z.infer<typeof CreateIssuerSchema>;
type ValidatedUpdateIssuerData = z.infer<typeof UpdateIssuerSchema>;

/**
 * Maps validated issuer data to an internal Issuer entity format
 * @param data Validated issuer data from Zod schema
 * @returns Data mapped to Partial<Issuer> format
 */
function mapToIssuerEntity(data: ValidatedCreateIssuerData | ValidatedUpdateIssuerData): Partial<Issuer> {
  // Create a clean object with only the properties needed for the Issuer entity
  const mappedData: Partial<Issuer> = {};

  // Map standard properties
  if (data.name !== undefined) mappedData.name = data.name;
  if (data.url !== undefined) mappedData.url = data.url as Shared.IRI; // Cast URL to IRI type
  if (data.email !== undefined) mappedData.email = data.email;
  if (data.description !== undefined) mappedData.description = data.description;
  if (data.image !== undefined) {
    // Handle image which could be string URL or object
    if (typeof data.image === 'string') {
      mappedData.image = data.image as Shared.IRI; // Cast string to IRI
    } else {
      // Handle image object (could be OB2.Image or similar structure for OB3)
      mappedData.image = data.image as OB2.Image;
    }
  }
  if ('id' in data && data.id !== undefined) mappedData.id = data.id as Shared.IRI;

  // Return the mapped data
  return mappedData;
}

/**
 * Controller for issuer-related operations
 */
export class IssuerController {
  /**
   * Constructor
   * @param issuerRepository The issuer repository
   */
  constructor(private issuerRepository: IssuerRepository) {}

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
   * Creates a new issuer
   * @param data The issuer data
   * @param version The badge version to use for the response
   * @param user The authenticated user
   * @returns The created issuer
   */
  async createIssuer(data: CreateIssuerDto, version: BadgeVersion = BadgeVersion.V3, user?: { claims?: Record<string, unknown> } | null): Promise<IssuerResponseDto> {
    // Check if user has permission to create issuers
    if (user && !this.hasPermission(user, UserPermission.CREATE_ISSUER)) {
      logger.warn(`User ${user.claims?.['sub'] || 'unknown'} attempted to create an issuer without permission`);
      throw new Error('Insufficient permissions to create issuer');
    }
    try {
      // Validate incoming data using Zod schema first!
      const validatedData = CreateIssuerSchema.parse(data);

      // Create issuer entity using the mapping function
      const issuer = Issuer.create(mapToIssuerEntity(validatedData));
      const createdIssuer = await this.issuerRepository.create(issuer);

      // Return formatted response
      return createdIssuer.toJsonLd(version) as IssuerResponseDto;
    } catch (error) {
      logger.error('Error creating issuer', {
        error: error instanceof Error ? error.message : String(error),
        data
      });
      throw error;
    }
  }

  /**
   * Gets all issuers
   * @param version The badge version to use for the response
   * @returns All issuers
   */
  async getAllIssuers(version: BadgeVersion = BadgeVersion.V3): Promise<IssuerResponseDto[]> {
    const issuers = await this.issuerRepository.findAll();
    return issuers.map(issuer => issuer.toJsonLd(version) as IssuerResponseDto);
  }

  /**
   * Gets an issuer by ID
   * @param id The issuer ID
   * @param version The badge version to use for the response
   * @returns The issuer with the specified ID
   */
  async getIssuerById(id: string, version: BadgeVersion = BadgeVersion.V3): Promise<IssuerResponseDto | null> {
    const issuer = await this.issuerRepository.findById(toIRI(id) as Shared.IRI);
    if (!issuer) {
      return null;
    }
    return issuer.toJsonLd(version) as IssuerResponseDto;
  }

  /**
   * Updates an issuer
   * @param id The issuer ID
   * @param data The updated issuer data
   * @param version The badge version to use for the response
   * @param user The authenticated user
   * @returns The updated issuer
   */
  async updateIssuer(id: string, data: UpdateIssuerDto, version: BadgeVersion = BadgeVersion.V3, user?: { claims?: Record<string, unknown> } | null): Promise<IssuerResponseDto | null> {
    // Check if user has permission to update issuers
    if (user && !this.hasPermission(user, UserPermission.UPDATE_ISSUER)) {
      logger.warn(`User ${user.claims?.['sub'] || 'unknown'} attempted to update issuer ${id} without permission`);
      throw new Error('Insufficient permissions to update issuer');
    }
    try {
      // Validate incoming data using Zod schema first!
      const validatedData = UpdateIssuerSchema.parse(data);

      // Use validated data mapped to entity format
      const updatedIssuer = await this.issuerRepository.update(toIRI(id) as Shared.IRI, mapToIssuerEntity(validatedData));
      if (!updatedIssuer) {
        return null;
      }
      return updatedIssuer.toJsonLd(version) as IssuerResponseDto;
    } catch (error) {
      logger.error('Error updating issuer', {
        id,
        error: error instanceof Error ? error.message : String(error),
        data
      });
      throw error;
    }
  }

  /**
   * Deletes an issuer
   * @param id The issuer ID
   * @param user The authenticated user
   * @returns True if the issuer was deleted, false otherwise
   */
  async deleteIssuer(id: string, user?: { claims?: Record<string, unknown> } | null): Promise<boolean> {
    // Check if user has permission to delete issuers
    if (user && !this.hasPermission(user, UserPermission.DELETE_ISSUER)) {
      logger.warn(`User ${user.claims?.['sub'] || 'unknown'} attempted to delete issuer ${id} without permission`);
      throw new Error('Insufficient permissions to delete issuer');
    }

    return await this.issuerRepository.delete(toIRI(id) as Shared.IRI);
  }
}
