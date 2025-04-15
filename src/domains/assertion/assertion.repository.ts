/**
 * Repository interfaces for the Assertion domain
 * 
 * This file defines the repository interface for the Assertion domain entity
 * following the Data Mapper pattern. It specifies the contract that all
 * Assertion repository implementations must fulfill.
 */

import { Assertion } from './assertion.entity';

export interface AssertionRepository {
  /**
   * Creates a new assertion
   * @param assertion The assertion to create
   * @returns The created assertion with its ID
   */
  create(assertion: Omit<Assertion, 'id'>): Promise<Assertion>;
  
  /**
   * Finds an assertion by its ID
   * @param id The ID of the assertion to find
   * @returns The assertion if found, null otherwise
   */
  findById(id: string): Promise<Assertion | null>;
  
  /**
   * Finds all assertions for a specific badge class
   * @param badgeClassId The ID of the badge class
   * @returns An array of assertions
   */
  findByBadgeClass(badgeClassId: string): Promise<Assertion[]>;
  
  /**
   * Finds all assertions issued to a specific recipient
   * @param recipientId The ID of the recipient
   * @returns An array of assertions
   */
  findByRecipient(recipientId: string): Promise<Assertion[]>;
  
  /**
   * Updates an existing assertion
   * @param id The ID of the assertion to update
   * @param assertion The updated assertion data
   * @returns The updated assertion if found, null otherwise
   */
  update(id: string, assertion: Partial<Assertion>): Promise<Assertion | null>;
  
  /**
   * Deletes an assertion by its ID
   * @param id The ID of the assertion to delete
   * @returns True if the assertion was deleted, false otherwise
   */
  delete(id: string): Promise<boolean>;
  
  /**
   * Revokes an assertion
   * @param id The ID of the assertion to revoke
   * @param reason The reason for revocation
   * @returns The revoked assertion if found, null otherwise
   */
  revoke(id: string, reason: string): Promise<Assertion | null>;
  
  /**
   * Verifies an assertion's validity
   * @param id The ID of the assertion to verify
   * @returns True if the assertion is valid, false otherwise
   */
  verify(id: string): Promise<boolean>;
}
