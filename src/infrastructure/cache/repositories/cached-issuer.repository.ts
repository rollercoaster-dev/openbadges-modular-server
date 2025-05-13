/**
 * Cached Issuer Repository
 *
 * This class wraps an IssuerRepository implementation and adds caching functionality.
 * It caches issuer entities to improve read performance.
 */

import { Issuer } from '../../../domains/issuer/issuer.entity';
import { IssuerRepository } from '../../../domains/issuer/issuer.repository';
import { Shared } from 'openbadges-types';
import { CacheRepositoryWrapper } from './cache-repository.wrapper';

export class CachedIssuerRepository extends CacheRepositoryWrapper<Issuer, IssuerRepository> implements IssuerRepository {
  /**
   * Creates a new cached issuer repository
   * @param repository The issuer repository to wrap
   */
  constructor(repository: IssuerRepository) {
    super(repository, 'issuer');
  }

  /**
   * Creates a new issuer
   * @param issuer The issuer to create
   * @returns The created issuer with its ID
   */
  async create(issuer: Omit<Issuer, 'id'>): Promise<Issuer> {
    const result = await this.repository.create(issuer);

    // Invalidate cache after creation
    this.invalidateEntity(result);

    return result;
  }

  /**
   * Finds all issuers
   * @returns An array of all issuers
   */
  async findAll(): Promise<Issuer[]> {
    if (!this.enabled) {
      return this.repository.findAll();
    }

    const cacheKey = 'collection:all';

    // Try to get from cache
    const cached = this.cache.get<Issuer[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // Get from repository
    const issuers = await this.repository.findAll();

    // Cache the result
    this.cache.set(cacheKey, issuers);

    // Also cache individual issuers
    for (const issuer of issuers) {
      this.cache.set(this.generateIdKey(issuer.id), issuer);
    }

    return issuers;
  }

  /**
   * Finds an issuer by its ID
   * @param id The ID of the issuer to find
   * @returns The issuer if found, null otherwise
   */
  async findById(id: Shared.IRI): Promise<Issuer | null> {
    if (!this.enabled) {
      return this.repository.findById(id);
    }

    const cacheKey = this.generateIdKey(id as string);

    // Try to get from cache
    const cached = this.cache.get<Issuer>(cacheKey);
    if (cached) {
      return cached;
    }

    // Get from repository
    const issuer = await this.repository.findById(id);

    // Cache the result (even if null)
    if (issuer) {
      this.cache.set(cacheKey, issuer);
    }

    return issuer;
  }

  /**
   * Updates an existing issuer
   * @param id The ID of the issuer to update
   * @param issuer The updated issuer data
   * @returns The updated issuer if found, null otherwise
   */
  async update(id: Shared.IRI, issuer: Partial<Issuer>): Promise<Issuer | null> {
    // Invalidate the cache for the ID before updating
    // This ensures we don't have stale data even if the ID changes
    this.cache.delete(this.generateIdKey(id as string));
    this.invalidateCollections();

    const result = await this.repository.update(id, issuer);

    // Invalidate cache after update for the result entity
    if (result) {
      this.invalidateEntity(result);
    }

    return result;
  }

  /**
   * Deletes an issuer
   * @param id The ID of the issuer to delete
   * @returns True if the issuer was deleted, false otherwise
   */
  async delete(id: Shared.IRI): Promise<boolean> {
    const result = await this.repository.delete(id);

    // Invalidate cache after deletion
    if (result) {
      this.cache.delete(this.generateIdKey(id as string));
      this.invalidateCollections();
    }

    return result;
  }

  /**
   * Gets the ID of an issuer entity
   * @param entity The issuer entity
   * @returns The issuer ID
   */
  protected getEntityId(entity: Issuer): string | null {
    return entity.id;
  }
}
