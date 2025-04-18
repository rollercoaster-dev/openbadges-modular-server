/**
 * Cache Interface for Open Badges API
 * 
 * This interface defines the contract that all cache implementations must fulfill.
 * It provides methods for storing, retrieving, and invalidating cached data.
 */

export interface CacheInterface {
  /**
   * Stores a value in the cache
   * @param key The cache key
   * @param value The value to store
   * @param ttl Time to live in seconds (optional)
   * @returns True if the value was stored successfully
   */
  set<T>(key: string, value: T, ttl?: number): boolean;

  /**
   * Retrieves a value from the cache
   * @param key The cache key
   * @returns The cached value or undefined if not found
   */
  get<T>(key: string): T | undefined;

  /**
   * Checks if a key exists in the cache
   * @param key The cache key
   * @returns True if the key exists
   */
  has(key: string): boolean;

  /**
   * Deletes a value from the cache
   * @param key The cache key
   * @returns True if the value was deleted successfully
   */
  delete(key: string): boolean;

  /**
   * Deletes all values from the cache
   * @returns True if the cache was cleared successfully
   */
  clear(): boolean;

  /**
   * Gets cache statistics
   * @returns Cache statistics
   */
  getStats(): CacheStats;

  /**
   * Gets the keys in the cache
   * @returns Array of cache keys
   */
  keys(): string[];

  /**
   * Gets the size of the cache
   * @returns Number of items in the cache
   */
  size(): number;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  hits: number;
  misses: number;
  keys: number;
  ksize: number;
  vsize: number;
}
