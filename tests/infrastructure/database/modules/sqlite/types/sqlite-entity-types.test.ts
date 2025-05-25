/**
 * Test for centralized SQLite entity type definitions
 */

import { describe, it, expect } from 'bun:test';
import {
  SQLITE_ENTITY_TYPES,
  SqliteEntityType,
} from '@infrastructure/database/modules/sqlite/types/sqlite-database.types';

describe('SQLite Entity Types', () => {
  it('should have all expected entity types in the centralized definition', () => {
    const expectedTypes = [
      'issuer',
      'badgeClass',
      'assertion',
      'user',
      'platform',
      'apiKey',
      'platformUser',
      'userAssertion',
    ] as const;

    expect(SQLITE_ENTITY_TYPES).toEqual(expectedTypes);
  });

  it('should provide type safety for SqliteEntityType', () => {
    // This test verifies that the type system correctly constrains values
    const validEntityType: SqliteEntityType = 'issuer';
    expect(validEntityType).toBe('issuer');

    // Test that all defined types are valid
    SQLITE_ENTITY_TYPES.forEach((entityType) => {
      const typedValue: SqliteEntityType = entityType;
      expect(typeof typedValue).toBe('string');
      expect(SQLITE_ENTITY_TYPES).toContain(typedValue);
    });
  });

  it('should maintain consistency with expected entity types', () => {
    // Verify that we have the expected number of entity types
    expect(SQLITE_ENTITY_TYPES.length).toBe(8);

    // Verify that each type is a non-empty string
    SQLITE_ENTITY_TYPES.forEach((entityType) => {
      expect(typeof entityType).toBe('string');
      expect(entityType.length).toBeGreaterThan(0);
    });

    // Verify no duplicates
    const uniqueTypes = new Set(SQLITE_ENTITY_TYPES);
    expect(uniqueTypes.size).toBe(SQLITE_ENTITY_TYPES.length);
  });

  it('should support type checking functions', () => {
    // Helper function to check if a string is a valid entity type
    function isValidEntityType(value: string): value is SqliteEntityType {
      return (SQLITE_ENTITY_TYPES as readonly string[]).includes(value);
    }

    // Test valid types
    expect(isValidEntityType('issuer')).toBe(true);
    expect(isValidEntityType('badgeClass')).toBe(true);
    expect(isValidEntityType('assertion')).toBe(true);

    // Test invalid types
    expect(isValidEntityType('invalidType')).toBe(false);
    expect(isValidEntityType('')).toBe(false);
    expect(isValidEntityType('ISSUER')).toBe(false); // Case sensitive
  });
});
