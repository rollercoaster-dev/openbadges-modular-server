/**
 * Cached BadgeClass Repository
 * 
 * This class wraps a BadgeClassRepository implementation and adds caching functionality.
 * It caches badge class entities to improve read performance.
 */

import { BadgeClass } from '../../../domains/badgeClass/badgeClass.entity';
import { BadgeClassRepository } from '../../../domains/badgeClass/badgeClass.repository';
import { Shared } from 'openbadges-types';
import { CacheRepositoryWrapper } from './cache-repository.wrapper';

export class CachedBadgeClassRepository extends CacheRepositoryWrapper<BadgeClass, BadgeClassRepository> implements BadgeClassRepository {
  /**
   * Creates a new cached badge class repository
   * @param repository The badge class repository to wrap
   */
  constructor(repository: BadgeClassRepository) {
    super(repository, 'badgeClass');
  }

  /**
   * Creates a new badge class
   * @param badgeClass The badge class to create
   * @returns The created badge class with its ID
   */
  async create(badgeClass: Omit<BadgeClass, 'id'>): Promise<BadgeClass> {
    const result = await this.repository.create(badgeClass);
    
    // Invalidate cache after creation
    this.invalidateEntity(result);
    
    // Also invalidate issuer-related caches
    if ('issuerId' in badgeClass) {
      this.cache.delete(`issuer:${(badgeClass as { issuerId?: Shared.IRI }).issuerId}`);
    }
    
    return result;
  }

  /**
   * Finds all badge classes
   * @returns An array of all badge classes
   */
  async findAll(): Promise<BadgeClass[]> {
    if (!this.enabled) {
      return this.repository.findAll();
    }
    
    const cacheKey = 'collection:all';
    
    // Try to get from cache
    const cached = this.cache.get<BadgeClass[]>(cacheKey);
    if (cached) {
      return cached;
    }
    
    // Get from repository
    const badgeClasses = await this.repository.findAll();
    
    // Cache the result
    this.cache.set(cacheKey, badgeClasses);
    
    // Also cache individual badge classes
    for (const badgeClass of badgeClasses) {
      this.cache.set(this.generateIdKey(badgeClass.id), badgeClass);
    }
    
    return badgeClasses;
  }

  /**
   * Finds a badge class by its ID
   * @param id The ID of the badge class to find
   * @returns The badge class if found, null otherwise
   */
  async findById(id: Shared.IRI): Promise<BadgeClass | null> {
    if (!this.enabled) {
      return this.repository.findById(id);
    }
    
    const cacheKey = this.generateIdKey(id as string);
    
    // Try to get from cache
    const cached = this.cache.get<BadgeClass>(cacheKey);
    if (cached) {
      return cached;
    }
    
    // Get from repository
    const badgeClass = await this.repository.findById(id);
    
    // Cache the result (even if null)
    if (badgeClass) {
      this.cache.set(cacheKey, badgeClass);
    }
    
    return badgeClass;
  }

  /**
   * Finds all badge classes issued by a specific issuer
   * @param issuerId The ID of the issuer
   * @returns An array of badge classes
   */
  async findByIssuer(issuerId: Shared.IRI): Promise<BadgeClass[]> {
    if (!this.enabled) {
      return this.repository.findByIssuer(issuerId);
    }
    
    const cacheKey = `issuer:${issuerId}`;
    
    // Try to get from cache
    const cached = this.cache.get<BadgeClass[]>(cacheKey);
    if (cached) {
      return cached;
    }
    
    // Get from repository
    const badgeClasses = await this.repository.findByIssuer(issuerId);
    
    // Cache the result
    this.cache.set(cacheKey, badgeClasses);
    
    // Also cache individual badge classes
    for (const badgeClass of badgeClasses) {
      this.cache.set(this.generateIdKey(badgeClass.id), badgeClass);
    }
    
    return badgeClasses;
  }

  /**
   * Updates an existing badge class
   * @param id The ID of the badge class to update
   * @param badgeClass The updated badge class data
   * @returns The updated badge class if found, null otherwise
   */
  async update(id: Shared.IRI, badgeClass: Partial<BadgeClass>): Promise<BadgeClass | null> {
    const result = await this.repository.update(id, badgeClass);
    
    // Invalidate cache after update
    if (result) {
      this.invalidateEntity(result);
      
      // Also invalidate issuer-related caches
      if ('issuerId' in badgeClass) {
        this.cache.delete(`issuer:${(badgeClass as { issuerId?: Shared.IRI }).issuerId}`);
      } else if (result.issuerId) {
        this.cache.delete(`issuer:${result.issuerId}`);
      }
    }
    
    return result;
  }

  /**
   * Deletes a badge class
   * @param id The ID of the badge class to delete
   * @returns True if the badge class was deleted, false otherwise
   */
  async delete(id: Shared.IRI): Promise<boolean> {
    // Get the badge class before deletion to get the issuer ID
    const badgeClass = await this.findById(id);
    
    const result = await this.repository.delete(id);
    
    // Invalidate cache after deletion
    if (result) {
      this.cache.delete(this.generateIdKey(id as string));
      this.invalidateCollections();
      
      // Also invalidate issuer-related caches
      if (badgeClass && badgeClass.issuerId) {
        this.cache.delete(`issuer:${badgeClass.issuerId}`);
      }
    }
    
    return result;
  }

  /**
   * Gets the ID of a badge class entity
   * @param entity The badge class entity
   * @returns The badge class ID
   */
  protected getEntityId(entity: BadgeClass): string | null {
    return entity.id;
  }
}
