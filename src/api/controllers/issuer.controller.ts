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
import { Shared, OB2, OB3 } from 'openbadges-types';

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
  async createIssuer(data: Partial<OB2.Profile | OB3.Issuer>, version: BadgeVersion = BadgeVersion.V3): Promise<OB2.Profile | OB3.Issuer> {
    // Note: Runtime validation needed here to ensure 'data' conforms to expected structure
    const issuer = Issuer.create(data as Partial<Issuer>); // Cast needed as Issuer entity internal structure might differ slightly
    const createdIssuer = await this.issuerRepository.create(issuer);
    // Assuming toJsonLd will be refined to return the specific type based on version
    return createdIssuer.toJsonLd(version) as OB2.Profile | OB3.Issuer;
  }

  /**
   * Gets all issuers
   * @param version The badge version to use for the response
   * @returns All issuers
   */
  async getAllIssuers(version: BadgeVersion = BadgeVersion.V3): Promise<(OB2.Profile | OB3.Issuer)[]> {
    const issuers = await this.issuerRepository.findAll();
    // Assuming toJsonLd will be refined to return the specific type based on version
    return issuers.map(issuer => issuer.toJsonLd(version) as OB2.Profile | OB3.Issuer);
  }

  /**
   * Gets an issuer by ID
   * @param id The issuer ID
   * @param version The badge version to use for the response
   * @returns The issuer with the specified ID
   */
  async getIssuerById(id: string, version: BadgeVersion = BadgeVersion.V3): Promise<OB2.Profile | OB3.Issuer | null> {
    const issuer = await this.issuerRepository.findById(toIRI(id) as Shared.IRI);
    if (!issuer) {
      return null;
    }
    // Assuming toJsonLd will be refined to return the specific type based on version
    return issuer.toJsonLd(version) as OB2.Profile | OB3.Issuer;
  }

  /**
   * Updates an issuer
   * @param id The issuer ID
   * @param data The updated issuer data
   * @param version The badge version to use for the response
   * @returns The updated issuer
   */
  async updateIssuer(id: string, data: Partial<OB2.Profile | OB3.Issuer>, version: BadgeVersion = BadgeVersion.V3): Promise<OB2.Profile | OB3.Issuer | null> {
    // Note: Runtime validation needed here
    const updatedIssuer = await this.issuerRepository.update(toIRI(id) as Shared.IRI, data as Partial<Issuer>); // Cast needed
    if (!updatedIssuer) {
      return null;
    }
    // Assuming toJsonLd will be refined to return the specific type based on version
    return updatedIssuer.toJsonLd(version) as OB2.Profile | OB3.Issuer;
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
