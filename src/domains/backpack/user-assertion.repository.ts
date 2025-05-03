/**
 * Interface for UserAssertion repositories
 */
import { UserAssertion } from './user-assertion.entity';
import { Shared } from 'openbadges-types';
import { UserAssertionStatus } from './backpack.types';
import { UserAssertionCreateParams, UserAssertionQueryParams } from './repository.types';

export interface UserAssertionRepository {
  /**
   * Adds an assertion to a user's backpack
   * @param userId The ID of the platform user
   * @param assertionId The ID of the assertion to add
   * @param metadata Optional metadata about the user-assertion relationship
   * @returns The created user assertion
   */
  addAssertion(userId: Shared.IRI, assertionId: Shared.IRI, metadata?: Record<string, unknown>): Promise<UserAssertion>;

  /**
   * Adds an assertion to a user's backpack using params object
   * @param params The user assertion creation parameters
   * @returns The created user assertion
   */
  addAssertion(params: UserAssertionCreateParams): Promise<UserAssertion>;

  /**
   * Removes an assertion from a user's backpack
   * @param userId The ID of the platform user
   * @param assertionId The ID of the assertion to remove
   * @returns True if the assertion was removed, false otherwise
   */
  removeAssertion(userId: Shared.IRI, assertionId: Shared.IRI): Promise<boolean>;

  /**
   * Updates the status of an assertion in a user's backpack
   * @param userId The ID of the platform user
   * @param assertionId The ID of the assertion to update
   * @param status The new status of the assertion
   * @returns True if the assertion status was updated, false otherwise
   */
  updateStatus(userId: Shared.IRI, assertionId: Shared.IRI, status: UserAssertionStatus): Promise<boolean>;

  /**
   * Gets all assertions in a user's backpack
   * @param userId The ID of the platform user
   * @returns An array of assertions in the user's backpack
   */
  getUserAssertions(userId: Shared.IRI, params?: UserAssertionQueryParams): Promise<UserAssertion[]>;

  /**
   * Checks if a user has a specific assertion in their backpack
   * @param userId The ID of the platform user
   * @param assertionId The ID of the assertion to check
   * @returns True if the user has the assertion, false otherwise
   */
  hasAssertion(userId: Shared.IRI, assertionId: Shared.IRI): Promise<boolean>;

  /**
   * Finds a user assertion by user ID and assertion ID
   * @param userId The ID of the platform user
   * @param assertionId The ID of the assertion
   * @returns The user assertion if found, null otherwise
   */
  findByUserAndAssertion(userId: Shared.IRI, assertionId: Shared.IRI): Promise<UserAssertion | null>;
}
