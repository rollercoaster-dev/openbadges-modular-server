/**
 * Repository interfaces for the Assertion domain
 *
 * This file defines the repository interface for the Assertion domain entity
 * following the Data Mapper pattern. It specifies the contract that all
 * Assertion repository implementations must fulfill.
 */

import { Assertion } from './assertion.entity';
import { Shared } from 'openbadges-types';

export interface AssertionRepository {
  /**
   * Creates a new assertion
   * @param assertion The assertion to create
   * @returns The created assertion with its ID
   */
  create(assertion: Omit<Assertion, 'id'>): Promise<Assertion>;

  /**
   * Finds all assertions
   * @returns An array of all assertions
   */
  findAll(): Promise<Assertion[]>;

  /**
   * Finds an assertion by its ID
   * @param id The ID of the assertion to find
   * @returns The assertion if found, null otherwise
   */
  findById(id: Shared.IRI): Promise<Assertion | null>;

  /**
   * Finds all assertions for a specific badge class
   * @param badgeClassId The ID of the badge class
   * @returns An array of assertions
   */
  findByBadgeClass(badgeClassId: Shared.IRI): Promise<Assertion[]>;

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
  update(id: Shared.IRI, assertion: Partial<Assertion>): Promise<Assertion | null>;

  /**
   * Deletes an assertion by its ID
   * @param id The ID of the assertion to delete
   * @returns True if the assertion was deleted, false otherwise
   */
  delete(id: Shared.IRI): Promise<boolean>;

  /**
   * Revokes an assertion
   * @param id The ID of the assertion to revoke
   * @param reason The reason for revocation
   * @returns The revoked assertion if found, null otherwise
   */
  revoke(id: Shared.IRI, reason: string): Promise<Assertion | null>;

  /**
   * Verifies an assertion's validity
   * @param id The ID of the assertion to verify
   * @returns An object with isValid flag and optional reason for invalidity
   */
  verify(id: Shared.IRI): Promise<{ isValid: boolean; reason?: string }>;

  /**
   * Creates multiple assertions in a batch operation
   * @param assertions The assertions to create
   * @returns An array of results indicating success/failure for each assertion
   */
  createBatch(assertions: Omit<Assertion, 'id'>[]): Promise<Array<{
    success: boolean;
    assertion?: Assertion;
    error?: string;
  }>>;

  /**
   * Finds multiple assertions by their IDs
   * @param ids The IDs of the assertions to find
   * @returns An array of assertions (null for not found)
   */
  findByIds(ids: Shared.IRI[]): Promise<(Assertion | null)[]>;

  /**
   * Updates the status of multiple assertions in a batch operation
   * @param updates Array of status updates to apply
   * @returns An array of results indicating success/failure for each update
   */
  updateStatusBatch(updates: Array<{
    id: Shared.IRI;
    status: 'revoked' | 'suspended' | 'active';
    reason?: string;
  }>): Promise<Array<{
    id: Shared.IRI;
    success: boolean;
    assertion?: Assertion;
    error?: string;
  }>>;
}
