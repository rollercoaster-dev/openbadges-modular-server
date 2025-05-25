import { describe, expect, it } from 'bun:test';
import {
  convertJson,
  convertTimestamp,
  convertUuid,
  convertBoolean,
  urnToUuid,
  uuidToUrn,
  isValidUuid,
  isValidUrn,
} from '@/infrastructure/database/utils/type-conversion';

describe('Database Type Conversion Utilities', () => {
  describe('convertJson', () => {
    const testObject = { name: 'Test', value: 123, nested: { foo: 'bar' } };
    const testString = JSON.stringify(testObject);

    it('should handle null and undefined values', () => {
      expect(convertJson(null, 'postgresql', 'to')).toBeNull();
      expect(convertJson(undefined, 'postgresql', 'to')).toBeUndefined();
      expect(convertJson(null, 'sqlite', 'to')).toBeNull();
      expect(convertJson(undefined, 'sqlite', 'to')).toBeUndefined();
    });

    it('should pass through values for PostgreSQL', () => {
      expect(convertJson(testObject, 'postgresql', 'to')).toEqual(testObject);
      expect(convertJson(testObject, 'postgresql', 'from')).toEqual(testObject);
    });

    it('should convert object to JSON string for sqlite (to)', () => {
      const result = convertJson(testObject, 'sqlite', 'to');
      expect(typeof result).toBe('string');
      // Parse the string back to an object for property assertion
      const parsedResult = JSON.parse(result as string);
      expect(parsedResult).toEqual(testObject);
      expect(parsedResult.nested).toHaveProperty('foo', 'bar');
    });

    it('should return null for null input (to)', () => {
      expect(convertJson(null, 'sqlite', 'to')).toBeNull();
    });

    it('should not double-stringify', () => {
      expect(convertJson(testString, 'sqlite', 'to')).toEqual(testString);
    });

    it('should parse strings for SQLite when direction is "from"', () => {
      const result = convertJson(testString, 'sqlite', 'from');
      expect(typeof result).toBe('object');
      expect(result).toHaveProperty('name', 'Test');
      expect(result).toHaveProperty('value', 123);
      expect(result).toHaveProperty('nested');
      // Type assertion for TypeScript
      if (result && typeof result === 'object') {
        const typedResult = result as Record<string, unknown>;
        if (
          'nested' in typedResult &&
          typedResult.nested &&
          typeof typedResult.nested === 'object'
        ) {
          const nested = typedResult.nested as { foo: string };
          expect(nested.foo).toBe('bar');
        }
      }
      // Non-string values should now return null based on our implementation change
      expect(convertJson(testObject, 'sqlite', 'from')).toBeNull();
    });

    it('should handle invalid JSON strings', () => {
      expect(convertJson('not valid json', 'sqlite', 'from')).toBeNull();
    });

    it('should handle non-string values when direction is "from" for SQLite', () => {
      const nonStringValue = { test: 'object' };
      // When a non-string value is passed to convertJson with direction 'from',
      // it should now return null based on our implementation change
      expect(convertJson(nonStringValue, 'sqlite', 'from')).toBeNull();

      // Test with array
      const arrayValue = [1, 2, 3];
      expect(convertJson(arrayValue, 'sqlite', 'from')).toBeNull();

      // Test with number
      const numberValue = 123;
      expect(convertJson(numberValue, 'sqlite', 'from')).toBeNull();
    });
  });

  describe('convertTimestamp', () => {
    const testDate = new Date('2023-01-01T12:00:00Z');
    const testTimestamp = testDate.getTime();

    it('should handle null and undefined values', () => {
      expect(convertTimestamp(null, 'postgresql', 'to')).toBeNull();
      expect(convertTimestamp(undefined, 'postgresql', 'to')).toBeUndefined();
      expect(convertTimestamp(null, 'sqlite', 'to')).toBeNull();
      expect(convertTimestamp(undefined, 'sqlite', 'to')).toBeUndefined();
    });

    it('should convert to Date objects for PostgreSQL when direction is "to"', () => {
      expect(convertTimestamp(testDate, 'postgresql', 'to')).toEqual(testDate);
      expect(
        convertTimestamp(testTimestamp, 'postgresql', 'to')
      ).toBeInstanceOf(Date);
      expect(convertTimestamp(testTimestamp, 'postgresql', 'to')).toEqual(
        testDate
      );
      expect(
        convertTimestamp('2023-01-01T12:00:00Z', 'postgresql', 'to')
      ).toBeInstanceOf(Date);
    });

    it('should convert to numbers for SQLite when direction is "to"', () => {
      expect(convertTimestamp(testDate, 'sqlite', 'to')).toEqual(testTimestamp);
      expect(convertTimestamp(testTimestamp, 'sqlite', 'to')).toEqual(
        testTimestamp
      );
      expect(convertTimestamp('2023-01-01T12:00:00Z', 'sqlite', 'to')).toEqual(
        testTimestamp
      );
    });

    it('should convert to Date objects when direction is "from"', () => {
      expect(convertTimestamp(testDate, 'postgresql', 'from')).toEqual(
        testDate
      );
      expect(convertTimestamp(testTimestamp, 'sqlite', 'from')).toBeInstanceOf(
        Date
      );
      expect(convertTimestamp(testTimestamp, 'sqlite', 'from')).toEqual(
        testDate
      );
    });
  });

  describe('convertUuid', () => {
    const testUuid = '123e4567-e89b-12d3-a456-426614174000';
    const testUrn = 'urn:uuid:123e4567-e89b-12d3-a456-426614174000';

    it('should handle null and undefined values', () => {
      expect(convertUuid(null, 'postgresql', 'to')).toBeNull();
      expect(convertUuid(undefined, 'postgresql', 'to')).toBeUndefined();
      expect(convertUuid(null, 'sqlite', 'to')).toBeNull();
      expect(convertUuid(undefined, 'sqlite', 'to')).toBeUndefined();
    });

    it('should pass through values for SQLite (no conversion needed)', () => {
      expect(convertUuid(testUuid, 'sqlite', 'to')).toEqual(testUuid);
      expect(convertUuid(testUrn, 'sqlite', 'to')).toEqual(testUrn);
      expect(convertUuid(testUuid, 'sqlite', 'from')).toEqual(testUuid);
      expect(convertUuid(testUrn, 'sqlite', 'from')).toEqual(testUrn);
    });

    it('should convert URN to UUID for PostgreSQL when direction is "to"', () => {
      expect(convertUuid(testUrn, 'postgresql', 'to')).toEqual(testUuid);
      expect(convertUuid(testUuid, 'postgresql', 'to')).toEqual(testUuid); // Already plain UUID
    });

    it('should convert UUID to URN for PostgreSQL when direction is "from"', () => {
      expect(convertUuid(testUuid, 'postgresql', 'from')).toEqual(testUrn);
      expect(convertUuid(testUrn, 'postgresql', 'from')).toEqual(testUrn); // Already URN
    });
  });

  describe('urnToUuid', () => {
    const testUuid = '123e4567-e89b-12d3-a456-426614174000';
    const testUrn = 'urn:uuid:123e4567-e89b-12d3-a456-426614174000';

    it('should extract UUID from valid URN format', () => {
      expect(urnToUuid(testUrn)).toEqual(testUuid);
    });

    it('should return plain UUID unchanged if already in UUID format', () => {
      expect(urnToUuid(testUuid)).toEqual(testUuid);
    });

    it('should handle invalid URN format gracefully', () => {
      expect(urnToUuid('urn:uuid:invalid-uuid')).toEqual(
        'urn:uuid:invalid-uuid'
      );
      expect(urnToUuid('not-a-urn')).toEqual('not-a-urn');
      expect(urnToUuid('urn:invalid:format')).toEqual('urn:invalid:format');
    });

    it('should handle non-string input gracefully', () => {
      // @ts-expect-error Testing runtime behavior
      expect(urnToUuid(null)).toEqual(null);
      // @ts-expect-error Testing runtime behavior
      expect(urnToUuid(undefined)).toEqual(undefined);
      // @ts-expect-error Testing runtime behavior
      expect(urnToUuid(123)).toEqual(123);
    });
  });

  describe('uuidToUrn', () => {
    const testUuid = '123e4567-e89b-12d3-a456-426614174000';
    const testUrn = 'urn:uuid:123e4567-e89b-12d3-a456-426614174000';

    it('should convert valid UUID to URN format', () => {
      expect(uuidToUrn(testUuid)).toEqual(testUrn);
    });

    it('should return URN unchanged if already in URN format', () => {
      expect(uuidToUrn(testUrn)).toEqual(testUrn);
    });

    it('should handle invalid UUID format gracefully', () => {
      expect(uuidToUrn('invalid-uuid')).toEqual('invalid-uuid');
      expect(uuidToUrn('not-a-uuid')).toEqual('not-a-uuid');
    });

    it('should handle non-string input gracefully', () => {
      // @ts-expect-error Testing runtime behavior
      expect(uuidToUrn(null)).toEqual(null);
      // @ts-expect-error Testing runtime behavior
      expect(uuidToUrn(undefined)).toEqual(undefined);
      // @ts-expect-error Testing runtime behavior
      expect(uuidToUrn(123)).toEqual(123);
    });
  });

  describe('isValidUuid', () => {
    it('should validate correct UUID formats', () => {
      expect(isValidUuid('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
      expect(isValidUuid('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
      expect(isValidUuid('6ba7b810-9dad-11d1-80b4-00c04fd430c8')).toBe(true);
    });

    it('should reject invalid UUID formats', () => {
      expect(isValidUuid('invalid-uuid')).toBe(false);
      expect(isValidUuid('123e4567-e89b-12d3-a456')).toBe(false); // Too short
      expect(isValidUuid('123e4567-e89b-12d3-a456-426614174000-extra')).toBe(
        false
      ); // Too long
      expect(isValidUuid('urn:uuid:123e4567-e89b-12d3-a456-426614174000')).toBe(
        false
      ); // URN format
      expect(isValidUuid('')).toBe(false);
    });

    it('should handle non-string input', () => {
      // @ts-expect-error Testing runtime behavior
      expect(isValidUuid(null)).toBe(false);
      // @ts-expect-error Testing runtime behavior
      expect(isValidUuid(undefined)).toBe(false);
      // @ts-expect-error Testing runtime behavior
      expect(isValidUuid(123)).toBe(false);
    });
  });

  describe('isValidUrn', () => {
    it('should validate correct URN formats', () => {
      expect(isValidUrn('urn:uuid:123e4567-e89b-12d3-a456-426614174000')).toBe(
        true
      );
      expect(isValidUrn('urn:uuid:550e8400-e29b-41d4-a716-446655440000')).toBe(
        true
      );
    });

    it('should reject invalid URN formats', () => {
      expect(isValidUrn('123e4567-e89b-12d3-a456-426614174000')).toBe(false); // Plain UUID
      expect(isValidUrn('urn:uuid:invalid-uuid')).toBe(false); // Invalid UUID part
      expect(
        isValidUrn('urn:invalid:123e4567-e89b-12d3-a456-426614174000')
      ).toBe(false); // Wrong URN type
      expect(isValidUrn('not-a-urn')).toBe(false);
      expect(isValidUrn('')).toBe(false);
    });

    it('should handle non-string input', () => {
      // @ts-expect-error Testing runtime behavior
      expect(isValidUrn(null)).toBe(false);
      // @ts-expect-error Testing runtime behavior
      expect(isValidUrn(undefined)).toBe(false);
      // @ts-expect-error Testing runtime behavior
      expect(isValidUrn(123)).toBe(false);
    });
  });

  describe('convertBoolean', () => {
    it('should handle null and undefined values', () => {
      expect(convertBoolean(null, 'postgresql', 'to')).toBeNull();
      expect(convertBoolean(undefined, 'postgresql', 'to')).toBeUndefined();
      expect(convertBoolean(null, 'sqlite', 'to')).toBeNull();
      expect(convertBoolean(undefined, 'sqlite', 'to')).toBeUndefined();
    });

    it('should convert to boolean for PostgreSQL when direction is "to"', () => {
      expect(convertBoolean(true, 'postgresql', 'to')).toBe(true);
      expect(convertBoolean(false, 'postgresql', 'to')).toBe(false);
      expect(convertBoolean(1, 'postgresql', 'to')).toBe(true);
      expect(convertBoolean(0, 'postgresql', 'to')).toBe(false);
    });

    it('should convert to numbers for SQLite when direction is "to"', () => {
      expect(convertBoolean(true, 'sqlite', 'to')).toBe(1);
      expect(convertBoolean(false, 'sqlite', 'to')).toBe(0);
      expect(convertBoolean(1, 'sqlite', 'to')).toBe(1);
      expect(convertBoolean(0, 'sqlite', 'to')).toBe(0);
    });

    it('should convert to boolean when direction is "from"', () => {
      expect(convertBoolean(true, 'postgresql', 'from')).toBe(true);
      expect(convertBoolean(false, 'postgresql', 'from')).toBe(false);
      expect(convertBoolean(1, 'sqlite', 'from')).toBe(true);
      expect(convertBoolean(0, 'sqlite', 'from')).toBe(false);
    });
  });
});
