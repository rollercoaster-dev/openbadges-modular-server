/**
 * Issuer controller for Open Badges API
 * 
 * This file defines the controller for issuer-related operations.
 * It supports both Open Badges 2.0 and 3.0 specifications.
 */

import { Issuer } from '../../domains/issuer/issuer.entity';
import { IssuerRepository } from '../../domains/issuer/issuer.repository';
import { BadgeVersion } from '../../utils/version/badge-version';

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
  async createIssuer(data: Record<string, any>, version: BadgeVersion = BadgeVersion.V3): Promise<Record<string, any>> {
    const issuer = Issuer.create(data);
    const createdIssuer = await this.issuerRepository.create(issuer);
    return createdIssuer.toJsonLd(version);
  }

  /**
   * Gets all issuers
   * @param version The badge version to use for the response
   * @returns All issuers
   */
  async getAllIssuers(version: BadgeVersion = BadgeVersion.V3): Promise<Record<string, any>[]> {
    const issuers = await this.issuerRepository.findAll();
    return issuers.map(issuer => issuer.toJsonLd(version));
  }

  /**
   * Gets an issuer by ID
   * @param id The issuer ID
   * @param version The badge version to use for the response
   * @returns The issuer with the specified ID
   */
  async getIssuerById(id: string, version: BadgeVersion = BadgeVersion.V3): Promise<Record<string, any> | null> {
    const issuer = await this.issuerRepository.findById(id);
    if (!issuer) {
      return null;
    }
    return issuer.toJsonLd(version);
  }

  /**
   * Updates an issuer
   * @param id The issuer ID
   * @param data The updated issuer data
   * @param version The badge version to use for the response
   * @returns The updated issuer
   */
  async updateIssuer(id: string, data: Record<string, any>, version: BadgeVersion = BadgeVersion.V3): Promise<Record<string, any> | null> {
    const updatedIssuer = await this.issuerRepository.update(id, data);
    if (!updatedIssuer) {
      return null;
    }
    return updatedIssuer.toJsonLd(version);
  }

  /**
   * Deletes an issuer
   * @param id The issuer ID
   * @returns True if the issuer was deleted, false otherwise
   */
  async deleteIssuer(id: string): Promise<boolean> {
    return await this.issuerRepository.delete(id);
  }
}
