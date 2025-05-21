/**
 * Base Cache Repository Wrapper
 *
 * This abstract class provides a base implementation for caching repository operations.
 * It wraps a repository instance and adds caching functionality.
 */

import { CacheInterface } from '../cache.interface';
import { CacheFactory } from '../cache.factory';
import { config } from '@/config/config';

export abstract class CacheRepositoryWrapper<T, R> {
  protected repository: R;
  protected cache: CacheInterface;
  protected enabled: boolean;

  /**
   * Creates a new cache repository wrapper
   * @param repository The repository to wrap
   * @param cacheName The name of the cache to use
   */
  constructor(repository: R, cacheName: string) {
    this.repository = repository;
    this.cache = CacheFactory.getCache(cacheName);
    this.enabled = config.cache?.enabled !== false;
  }

  /**
   * Generates a cache key for an entity ID
   * @param id The entity ID
   * @returns The cache key
   */
  protected generateIdKey(id: string): string {
    return `id:${id}`;
  }

  /**
   * Invalidates all cache entries for an entity
   * @param entity The entity to invalidate
   */
  protected invalidateEntity(entity: T): void {
    if (!this.enabled) return;

    // Get the ID of the entity (implementation-specific)
    const id = this.getEntityId(entity);
    if (id) {
      // Invalidate by ID
      this.cache.delete(this.generateIdKey(id));
    }

    // Invalidate any collection caches
    this.invalidateCollections();
  }

  /**
   * Invalidates all collection caches (e.g., findAll results)
   */
  protected invalidateCollections(): void {
    if (!this.enabled) return;

    // Find all keys that start with 'collection:'
    const keys = this.cache
      .keys()
      .filter((key) => key.startsWith('collection:'));

    // Delete all collection keys
    for (const key of keys) {
      this.cache.delete(key);
    }
  }

  /**
   * Gets the ID of an entity
   * @param entity The entity
   * @returns The entity ID or null if not available
   */
  protected abstract getEntityId(entity: T): string | null;
}
