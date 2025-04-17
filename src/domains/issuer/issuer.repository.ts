/**
 * Repository interfaces for the Issuer domain
 *
 * This file defines the repository interface for the Issuer domain entity
 * following the Data Mapper pattern. It specifies the contract that all
 * Issuer repository implementations must fulfill.
 */

import { Issuer } from './issuer.entity';
import { Shared } from 'openbadges-types';

export interface IssuerRepository {
  /**
   * Creates a new issuer
   * @param issuer The issuer to create
   * @returns The created issuer with its ID
   */
  create(issuer: Omit<Issuer, 'id'>): Promise<Issuer>;

  /**
   * Finds all issuers
   * @returns An array of all issuers
   */
  findAll(): Promise<Issuer[]>;

  /**
   * Finds an issuer by its ID
   * @param id The ID of the issuer to find
   * @returns The issuer if found, null otherwise
   */
  findById(id: Shared.IRI): Promise<Issuer | null>;

  /**
   * Updates an existing issuer
   * @param id The ID of the issuer to update
   * @param issuer The updated issuer data
   * @returns The updated issuer if found, null otherwise
   */
  update(id: Shared.IRI, issuer: Partial<Issuer>): Promise<Issuer | null>;

  /**
   * Deletes an issuer by its ID
   * @param id The ID of the issuer to delete
   * @returns True if the issuer was deleted, false otherwise
   */
  delete(id: Shared.IRI): Promise<boolean>;
}
