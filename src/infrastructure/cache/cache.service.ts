/**
 * Cache Service Implementation for Open Badges API
 *
 * This class implements the CacheInterface using lru.min, a fast and efficient
 * LRU (Least Recently Used) cache implementation that's compatible with Bun.js.
 */

import * as LRUModule from 'lru.min';
type LRUType = any; // Type definition for LRU
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
  private defaultTtl: number;

  /**
   * Creates a new cache service
   * @param options Cache options
   */
  constructor(options: CacheOptions = {}) {
    const { max = 1000, ttl = 3600, updateAgeOnGet = true } = options;

    // Create a new LRU cache instance
    // @ts-ignore - LRU.min doesn't have proper TypeScript definitions
    const LRU = LRUModule.default || LRUModule;
    // @ts-ignore - Using any type to bypass TypeScript errors
    this.cache = new LRU({
      max,
      updateAgeOnGet
    });

    this.defaultTtl = ttl;
  }

  /**
   * Stores a value in the cache
   * @param key The cache key
   * @param value The value to store
   * @param ttl Time to live in seconds (optional)
   * @returns True if the value was stored successfully
   */
  set<T>(key: string, value: T, ttl?: number): boolean {
    const maxAge = (ttl || this.defaultTtl) * 1000; // Convert to milliseconds
    return this.cache.set(key, value, maxAge);
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
    return true;
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
      vsize: this.calculateValuesSize()
    };
  }

  /**
   * Gets the keys in the cache
   * @returns Array of cache keys
   */
  keys(): string[] {
    return this.cache.keys();
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
    return this.keys().reduce((size, key) => size + (key.length * 2), 0);
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
  private estimateObjectSize(obj: any): number {
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
      return obj.reduce((size, item) => size + this.estimateObjectSize(item), 0);
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
