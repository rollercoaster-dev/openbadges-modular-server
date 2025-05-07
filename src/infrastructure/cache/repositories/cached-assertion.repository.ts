/**
 * Cached Assertion Repository
 *
 * This class wraps an AssertionRepository implementation and adds caching functionality.
 * It caches assertion entities to improve read performance.
 */

import { Assertion } from '../../../domains/assertion/assertion.entity';
import { AssertionRepository } from '../../../domains/assertion/assertion.repository';
import { Shared } from 'openbadges-types';
import { CacheRepositoryWrapper } from './cache-repository.wrapper';

export class CachedAssertionRepository extends CacheRepositoryWrapper<Assertion, AssertionRepository> implements AssertionRepository {
  /**
   * Creates a new cached assertion repository
   * @param repository The assertion repository to wrap
   */
  constructor(repository: AssertionRepository) {
    super(repository, 'assertion');
  }

  /**
   * Creates a new assertion
   * @param assertion The assertion to create
   * @returns The created assertion with its ID
   */
  async create(assertion: Omit<Assertion, 'id'>): Promise<Assertion> {
    const result = await this.repository.create(assertion);

    // Invalidate cache after creation
    this.invalidateEntity(result);

    // Also invalidate badge class-related caches
    if ('badgeClassId' in assertion) {
      this.cache.delete(`badgeClass:${(assertion as { badgeClassId?: Shared.IRI }).badgeClassId}`);
    }

    return result;
  }

  /**
   * Finds all assertions
   * @returns An array of all assertions
   */
  async findAll(): Promise<Assertion[]> {
    if (!this.enabled) {
      return this.repository.findAll();
    }

    const cacheKey = 'collection:all';

    // Try to get from cache
    const cached = this.cache.get<Assertion[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // Get from repository
    const assertions = await this.repository.findAll();

    // Cache the result
    this.cache.set(cacheKey, assertions);

    // Also cache individual assertions
    for (const assertion of assertions) {
      this.cache.set(this.generateIdKey(assertion.id), assertion);
    }

    return assertions;
  }

  /**
   * Finds an assertion by its ID
   * @param id The ID of the assertion to find
   * @returns The assertion if found, null otherwise
   */
  async findById(id: Shared.IRI): Promise<Assertion | null> {
    if (!this.enabled) {
      return this.repository.findById(id);
    }

    const cacheKey = this.generateIdKey(id as string);

    // Try to get from cache
    const cached = this.cache.get<Assertion>(cacheKey);
    if (cached) {
      return cached;
    }

    // Get from repository
    const assertion = await this.repository.findById(id);

    // Cache the result (even if null)
    if (assertion) {
      this.cache.set(cacheKey, assertion);
    }

    return assertion;
  }

  /**
   * Finds all assertions for a specific badge class
   * @param badgeClassId The ID of the badge class
   * @returns An array of assertions
   */
  async findByBadgeClass(badgeClassId: Shared.IRI): Promise<Assertion[]> {
    if (!this.enabled) {
      return this.repository.findByBadgeClass(badgeClassId);
    }

    const cacheKey = `badgeClass:${badgeClassId}`;

    // Try to get from cache
    const cached = this.cache.get<Assertion[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // Get from repository
    const assertions = await this.repository.findByBadgeClass(badgeClassId);

    // Cache the result
    this.cache.set(cacheKey, assertions);

    // Also cache individual assertions
    for (const assertion of assertions) {
      this.cache.set(this.generateIdKey(assertion.id), assertion);
    }

    return assertions;
  }

  /**
   * Finds all assertions for a specific recipient
   * @param recipientId The ID of the recipient
   * @returns An array of assertions
   */
  async findByRecipient(recipientId: string): Promise<Assertion[]> {
    if (!this.enabled) {
      return this.repository.findByRecipient(recipientId);
    }

    const cacheKey = `recipient:${recipientId}`;

    // Try to get from cache
    const cached = this.cache.get<Assertion[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // Get from repository
    const assertions = await this.repository.findByRecipient(recipientId);

    // Cache the result
    this.cache.set(cacheKey, assertions);

    // Also cache individual assertions
    for (const assertion of assertions) {
      this.cache.set(this.generateIdKey(assertion.id), assertion);
    }

    return assertions;
  }

  /**
   * Updates an existing assertion
   * @param id The ID of the assertion to update
   * @param assertion The updated assertion data
   * @returns The updated assertion if found, null otherwise
   */
  async update(id: Shared.IRI, assertion: Partial<Assertion>): Promise<Assertion | null> {
    const result = await this.repository.update(id, assertion);

    // Invalidate cache after update
    if (result) {
      this.invalidateEntity(result);

      // Also invalidate badge class-related caches
      if ('badgeClassId' in assertion) {
        this.cache.delete(`badgeClass:${(assertion as { badgeClassId?: Shared.IRI }).badgeClassId}`);
      } else if (result['badgeClassId']) {
        this.cache.delete(`badgeClass:${result['badgeClassId']}`);
      }

      // Also invalidate recipient-related caches
      if (result.recipient && result.recipient.identity) {
        this.cache.delete(`recipient:${result.recipient.identity}`);
      }
    }

    return result;
  }

  /**
   * Deletes an assertion
   * @param id The ID of the assertion to delete
   * @returns True if the assertion was deleted, false otherwise
   */
  async delete(id: Shared.IRI): Promise<boolean> {
    // Get the assertion before deletion to get related IDs
    const assertion = await this.findById(id);

    const result = await this.repository.delete(id);

    // Invalidate cache after deletion
    if (result) {
      this.cache.delete(this.generateIdKey(id as string));
      this.invalidateCollections();

      // Also invalidate badge class-related caches
      if (assertion && assertion['badgeClassId']) {
        this.cache.delete(`badgeClass:${assertion['badgeClassId']}`);
      }

      // Also invalidate recipient-related caches
      if (assertion && assertion.recipient && assertion.recipient.identity) {
        this.cache.delete(`recipient:${assertion.recipient.identity}`);
      }
    }

    return result;
  }

  /**
   * Gets the ID of an assertion entity
   * @param entity The assertion entity
   * @returns The assertion ID
   */
  protected getEntityId(entity: Assertion): string | null {
    return entity.id;
  }

  /**
   * Revokes an assertion
   * @param id The ID of the assertion to revoke
   * @param reason The reason for revocation
   * @returns The revoked assertion if found, null otherwise
   */
  async revoke(id: Shared.IRI, reason: string): Promise<Assertion | null> {
    const result = await this.repository.revoke(id, reason);

    // Invalidate cache after revocation
    if (result) {
      this.invalidateEntity(result);
    }

    return result;
  }

  /**
   * Verifies an assertion
   * @param id The ID of the assertion to verify
   * @returns Verification result
   */
  async verify(id: Shared.IRI): Promise<{ isValid: boolean; reason?: string }> {
    // Don't cache verification results as they may change over time
    return this.repository.verify(id);
  }
}
