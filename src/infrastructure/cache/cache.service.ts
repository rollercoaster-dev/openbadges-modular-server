/**
 * Cache Service Implementation for Open Badges API
 *
 * This class implements the CacheInterface using lru.min, a fast and efficient
 * LRU (Least Recently Used) cache implementation that's compatible with Bun.js.
 */

// Import createLRU function from lru.min
import { createLRU } from 'lru.min';

// Define a more specific type for the LRU cache instance
type LRUType = {
  get: (key: string) => unknown;
  set: (key: string, value: unknown) => void;
  peek: (key: string) => unknown;
  has: (key: string) => boolean;
  delete: (key: string) => boolean;
  clear: () => void;
  keys: () => IterableIterator<string>;
  size: number;
};

import { CacheInterface, CacheStats } from './cache.interface';

export interface CacheOptions {
  /**
   * Maximum number of items in the cache
   * @default 1000
   */
  max?: number;

  /**
   * Default TTL (Time To Live) in seconds
   * @default 3600 (1 hour)
   */
  ttl?: number;

  /**
   * Whether to update item age on get operations
   * @default true
   */
  updateAgeOnGet?: boolean;
}

export class CacheService implements CacheInterface {
  private cache: LRUType;
  private hits: number = 0;
  private misses: number = 0;
  // Note: defaultTtl is kept for API compatibility but not used with lru.min
  // @ts-ignore - This is intentionally unused but kept for future compatibility
  private defaultTtl: number;

  /**
   * Creates a new cache service
   * @param options Cache options
   */
  constructor(options: CacheOptions = {}) {
    const { max = 1000, ttl = 3600 } = options;

    // Create a new LRU cache instance using the createLRU function
    this.cache = createLRU({
      max,
      // Note: lru.min doesn't support updateAgeOnGet directly
      // It always updates age on get by design
    });

    this.defaultTtl = ttl;
  }

  /**
   * Stores a value in the cache
   * @param key The cache key
   * @param value The value to store
   * @param ttl Time to live in seconds (optional) - Note: lru.min doesn't support TTL directly
   * @returns True if the value was stored successfully
   */
  set<T>(key: string, value: T, _ttl?: number): boolean {
    // Note: lru.min's createLRU doesn't support maxAge parameter
    // We're ignoring ttl for now as the library doesn't support it
    // If we needed to use ttl, we would use: const maxAge = (_ttl || this.defaultTtl) * 1000;
    this.cache.set(key, value);
    return true; // Always return true as the set operation doesn't return a value
  }

  /**
   * Retrieves a value from the cache
   * @param key The cache key
   * @returns The cached value or undefined if not found
   */
  get<T>(key: string): T | undefined {
    const value = this.cache.get(key) as T | undefined;

    if (value === undefined) {
      this.misses++;
    } else {
      this.hits++;
    }

    return value;
  }

  /**
   * Checks if a key exists in the cache
   * @param key The cache key
   * @returns True if the key exists
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Deletes a value from the cache
   * @param key The cache key
   * @returns True if the value was deleted successfully
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Deletes all values from the cache
   * @returns True if the cache was cleared successfully
   */
  clear(): boolean {
    this.cache.clear();
    return true; // Always return true as the clear operation doesn't return a value
  }

  /**
   * Gets cache statistics
   * @returns Cache statistics
   */
  getStats(): CacheStats {
    return {
      hits: this.hits,
      misses: this.misses,
      keys: this.size(),
      ksize: this.calculateKeysSize(),
      vsize: this.calculateValuesSize(),
    };
  }

  /**
   * Gets the keys in the cache
   * @returns Array of cache keys
   */
  keys(): string[] {
    // Convert IterableIterator to array and filter out any undefined/null values
    return Array.from(this.cache.keys()).filter(
      (key): key is string => key != null && typeof key === 'string'
    );
  }

  /**
   * Gets the size of the cache
   * @returns Number of items in the cache
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Calculates the approximate size of all keys in bytes
   * @returns Size in bytes
   */
  private calculateKeysSize(): number {
    return this.keys().reduce((size, key) => size + key.length * 2, 0);
  }

  /**
   * Calculates the approximate size of all values in bytes
   * This is a rough estimate as JavaScript doesn't provide direct memory usage information
   * @returns Size in bytes
   */
  private calculateValuesSize(): number {
    let size = 0;

    for (const key of this.keys()) {
      const value = this.get(key);
      if (value !== undefined) {
        size += this.estimateObjectSize(value);
      }
    }

    return size;
  }

  /**
   * Estimates the size of an object in bytes
   * This is a rough estimate as JavaScript doesn't provide direct memory usage information
   * @param obj The object to estimate
   * @returns Size in bytes
   */
  private estimateObjectSize(obj: unknown): number {
    if (obj === null || obj === undefined) {
      return 0;
    }

    if (typeof obj === 'string') {
      return obj.length * 2; // UTF-16 characters are 2 bytes each
    }

    if (typeof obj === 'number') {
      return 8; // Numbers are typically 8 bytes
    }

    if (typeof obj === 'boolean') {
      return 4; // Booleans are typically 4 bytes
    }

    if (Array.isArray(obj)) {
      return obj.reduce(
        (size, item) => size + this.estimateObjectSize(item),
        0
      );
    }

    if (typeof obj === 'object') {
      let size = 0;
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          size += key.length * 2; // Key size
          size += this.estimateObjectSize(obj[key]); // Value size
        }
      }
      return size;
    }

    return 0;
  }
}
