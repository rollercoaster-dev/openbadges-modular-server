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
import { Shared } from 'openbadges-types';
import { CreateIssuerDto, IssuerResponseDto, UpdateIssuerDto } from '../dtos';
import { CreateIssuerSchema, UpdateIssuerSchema } from '../validation/issuer.schemas';
import { logger } from '../../utils/logging/logger.service';

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
   * Creates a new issuer
   * @param data The issuer data
   * @param version The badge version to use for the response
   * @returns The created issuer
   */
  async createIssuer(data: CreateIssuerDto, version: BadgeVersion = BadgeVersion.V3): Promise<IssuerResponseDto> {
    try {
      // Validate incoming data using Zod schema first!
      const validatedData = CreateIssuerSchema.parse(data);

      // Create issuer entity
      const issuer = Issuer.create(validatedData as Partial<Issuer>);
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
   * @returns The updated issuer
   */
  async updateIssuer(id: string, data: UpdateIssuerDto, version: BadgeVersion = BadgeVersion.V3): Promise<IssuerResponseDto | null> {
    try {
      // Validate incoming data using Zod schema first!
      const validatedData = UpdateIssuerSchema.parse(data);

      // Use validated data. Casting might still be needed depending on alignment with internal entity types.
      const updatedIssuer = await this.issuerRepository.update(toIRI(id) as Shared.IRI, validatedData as Partial<Issuer>);
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
   * @returns True if the issuer was deleted, false otherwise
   */
  async deleteIssuer(id: string): Promise<boolean> {
    return await this.issuerRepository.delete(toIRI(id) as Shared.IRI);
  }
}
