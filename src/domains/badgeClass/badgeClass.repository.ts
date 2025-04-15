/**
 * Repository interfaces for the BadgeClass domain
 * 
 * This file defines the repository interface for the BadgeClass domain entity
 * following the Data Mapper pattern. It specifies the contract that all
 * BadgeClass repository implementations must fulfill.
 */

import { BadgeClass } from './badgeClass.entity';

export interface BadgeClassRepository {
  /**
   * Creates a new badge class
   * @param badgeClass The badge class to create
   * @returns The created badge class with its ID
   */
  create(badgeClass: Omit<BadgeClass, 'id'>): Promise<BadgeClass>;
  
  /**
   * Finds a badge class by its ID
   * @param id The ID of the badge class to find
   * @returns The badge class if found, null otherwise
   */
  findById(id: string): Promise<BadgeClass | null>;
  
  /**
   * Finds all badge classes issued by a specific issuer
   * @param issuerId The ID of the issuer
   * @returns An array of badge classes
   */
  findByIssuer(issuerId: string): Promise<BadgeClass[]>;
  
  /**
   * Updates an existing badge class
   * @param id The ID of the badge class to update
   * @param badgeClass The updated badge class data
   * @returns The updated badge class if found, null otherwise
   */
  update(id: string, badgeClass: Partial<BadgeClass>): Promise<BadgeClass | null>;
  
  /**
   * Deletes a badge class by its ID
   * @param id The ID of the badge class to delete
   * @returns True if the badge class was deleted, false otherwise
   */
  delete(id: string): Promise<boolean>;
}
