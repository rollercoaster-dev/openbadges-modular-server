/**
 * Cache Factory for Open Badges API
 * 
 * This factory is responsible for creating and managing cache instances.
 * It provides a centralized way to access caches for different entities.
 */

import { CacheInterface } from './cache.interface';
import { CacheOptions, CacheService } from './cache.service';
import { config } from '../../config/config';

export class CacheFactory {
  private static caches: Map<string, CacheInterface> = new Map();
  
  /**
   * Gets or creates a cache instance for a specific entity
   * @param name The name of the cache (e.g., 'issuer', 'badgeClass', 'assertion')
   * @param options Cache options (optional, uses config defaults if not provided)
   * @returns A cache instance
   */
  static getCache(name: string, options?: CacheOptions): CacheInterface {
    if (!this.caches.has(name)) {
      // Use options from config if available
      const configOptions = config.cache?.entities?.[name] || config.cache?.default || {};
      
      // Merge with provided options, with provided options taking precedence
      const mergedOptions = { ...configOptions, ...options };
      
      // Create a new cache instance
      const cache = new CacheService(mergedOptions);
      this.caches.set(name, cache);
    }
    
    return this.caches.get(name)!;
  }
  
  /**
   * Gets all cache instances
   * @returns A map of all cache instances
   */
  static getAllCaches(): Map<string, CacheInterface> {
    return this.caches;
  }
  
  /**
   * Clears all cache instances
   */
  static clearAllCaches(): void {
    for (const cache of this.caches.values()) {
      cache.clear();
    }
  }
  
  /**
   * Gets cache statistics for all caches
   * @returns A map of cache statistics by cache name
   */
  static getAllCacheStats(): Record<string, any> {
    const stats: Record<string, any> = {};
    
    for (const [name, cache] of this.caches.entries()) {
      stats[name] = cache.getStats();
    }
    
    return stats;
  }
}
