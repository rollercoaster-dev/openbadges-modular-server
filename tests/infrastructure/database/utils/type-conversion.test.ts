
import { describe, expect, it } from 'bun:test';
import {
  convertJson,
  convertTimestamp,
  convertUuid,
  convertBoolean
} from '../../../../src/infrastructure/database/utils/type-conversion';

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
        if ('nested' in typedResult && typedResult.nested && typeof typedResult.nested === 'object') {
          const nested = typedResult.nested as { foo: string };
          expect(nested.foo).toBe('bar');
        }
      }
      // Should pass through non-string values
      expect(convertJson(testObject, 'sqlite', 'from')).toEqual(testObject);
    });

    it('should handle invalid JSON strings', () => {
      expect(convertJson('not valid json', 'sqlite', 'from')).toBeNull();
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
      expect(convertTimestamp(testTimestamp, 'postgresql', 'to')).toBeInstanceOf(Date);
      expect(convertTimestamp(testTimestamp, 'postgresql', 'to')).toEqual(testDate);
      expect(convertTimestamp('2023-01-01T12:00:00Z', 'postgresql', 'to')).toBeInstanceOf(Date);
    });

    it('should convert to numbers for SQLite when direction is "to"', () => {
      expect(convertTimestamp(testDate, 'sqlite', 'to')).toEqual(testTimestamp);
      expect(convertTimestamp(testTimestamp, 'sqlite', 'to')).toEqual(testTimestamp);
      expect(convertTimestamp('2023-01-01T12:00:00Z', 'sqlite', 'to')).toEqual(testTimestamp);
    });

    it('should convert to Date objects when direction is "from"', () => {
      expect(convertTimestamp(testDate, 'postgresql', 'from')).toEqual(testDate);
      expect(convertTimestamp(testTimestamp, 'sqlite', 'from')).toBeInstanceOf(Date);
      expect(convertTimestamp(testTimestamp, 'sqlite', 'from')).toEqual(testDate);
    });
  });

  describe('convertUuid', () => {
    const testUuid = '123e4567-e89b-12d3-a456-426614174000';

    it('should handle null and undefined values', () => {
      expect(convertUuid(null, 'postgresql', 'to')).toBeNull();
      expect(convertUuid(undefined, 'postgresql', 'to')).toBeUndefined();
    });

    it('should pass through UUID strings for both database types', () => {
      expect(convertUuid(testUuid, 'postgresql', 'to')).toEqual(testUuid);
      expect(convertUuid(testUuid, 'sqlite', 'to')).toEqual(testUuid);
      expect(convertUuid(testUuid, 'postgresql', 'from')).toEqual(testUuid);
      expect(convertUuid(testUuid, 'sqlite', 'from')).toEqual(testUuid);
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
