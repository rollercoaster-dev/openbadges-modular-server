/**
 * Test for SQLite pagination types and validation
 */

import { describe, it, expect } from 'bun:test';
import {
  DEFAULT_PAGINATION,
  MAX_PAGINATION_LIMIT,
  SqlitePaginationParams,
} from '@infrastructure/database/modules/sqlite/types/sqlite-database.types';

describe('SQLite Pagination Types', () => {
  describe('DEFAULT_PAGINATION', () => {
    it('should have sensible default values', () => {
      expect(DEFAULT_PAGINATION.limit).toBe(100);
      expect(DEFAULT_PAGINATION.offset).toBe(0);
    });

    it('should be a constant object', () => {
      expect(typeof DEFAULT_PAGINATION).toBe('object');
      expect(DEFAULT_PAGINATION).not.toBeNull();
    });
  });

  describe('MAX_PAGINATION_LIMIT', () => {
    it('should have a reasonable maximum limit', () => {
      expect(MAX_PAGINATION_LIMIT).toBe(1000);
      expect(typeof MAX_PAGINATION_LIMIT).toBe('number');
      expect(MAX_PAGINATION_LIMIT).toBeGreaterThan(DEFAULT_PAGINATION.limit);
    });
  });

  describe('SqlitePaginationParams type', () => {
    it('should accept valid pagination parameters', () => {
      const validParams: SqlitePaginationParams = {
        limit: 50,
        offset: 10,
      };

      expect(validParams.limit).toBe(50);
      expect(validParams.offset).toBe(10);
    });

    it('should accept partial parameters', () => {
      const limitOnly: SqlitePaginationParams = { limit: 25 };
      const offsetOnly: SqlitePaginationParams = { offset: 5 };
      const empty: SqlitePaginationParams = {};

      expect(limitOnly.limit).toBe(25);
      expect(limitOnly.offset).toBeUndefined();

      expect(offsetOnly.limit).toBeUndefined();
      expect(offsetOnly.offset).toBe(5);

      expect(empty.limit).toBeUndefined();
      expect(empty.offset).toBeUndefined();
    });
  });

  describe('Pagination validation logic', () => {
    // Helper function that mimics the validation logic in repositories
    function validatePagination(
      params?: SqlitePaginationParams
    ): Required<SqlitePaginationParams> {
      const limit = params?.limit ?? DEFAULT_PAGINATION.limit;
      const offset = params?.offset ?? DEFAULT_PAGINATION.offset;

      // Validate limit
      if (limit <= 0) {
        throw new Error(
          `Invalid pagination limit: ${limit}. Must be greater than 0.`
        );
      }
      if (limit > MAX_PAGINATION_LIMIT) {
        throw new Error(
          `Pagination limit ${limit} exceeds maximum allowed limit of ${MAX_PAGINATION_LIMIT}.`
        );
      }

      // Validate offset
      if (offset < 0) {
        throw new Error(
          `Invalid pagination offset: ${offset}. Must be 0 or greater.`
        );
      }

      return { limit, offset };
    }

    it('should use defaults when no parameters provided', () => {
      const result = validatePagination();
      expect(result.limit).toBe(DEFAULT_PAGINATION.limit);
      expect(result.offset).toBe(DEFAULT_PAGINATION.offset);
    });

    it('should use defaults for undefined parameters', () => {
      const result = validatePagination({});
      expect(result.limit).toBe(DEFAULT_PAGINATION.limit);
      expect(result.offset).toBe(DEFAULT_PAGINATION.offset);
    });

    it('should accept valid parameters', () => {
      const result = validatePagination({ limit: 50, offset: 10 });
      expect(result.limit).toBe(50);
      expect(result.offset).toBe(10);
    });

    it('should reject invalid limit values', () => {
      expect(() => validatePagination({ limit: 0 })).toThrow(
        'Invalid pagination limit: 0. Must be greater than 0.'
      );

      expect(() => validatePagination({ limit: -1 })).toThrow(
        'Invalid pagination limit: -1. Must be greater than 0.'
      );

      expect(() => validatePagination({ limit: 1001 })).toThrow(
        'Pagination limit 1001 exceeds maximum allowed limit of 1000.'
      );
    });

    it('should reject invalid offset values', () => {
      expect(() => validatePagination({ offset: -1 })).toThrow(
        'Invalid pagination offset: -1. Must be 0 or greater.'
      );
    });

    it('should accept edge case values', () => {
      // Minimum valid values
      const minResult = validatePagination({ limit: 1, offset: 0 });
      expect(minResult.limit).toBe(1);
      expect(minResult.offset).toBe(0);

      // Maximum valid values
      const maxResult = validatePagination({
        limit: MAX_PAGINATION_LIMIT,
        offset: 999999,
      });
      expect(maxResult.limit).toBe(MAX_PAGINATION_LIMIT);
      expect(maxResult.offset).toBe(999999);
    });
  });
});
