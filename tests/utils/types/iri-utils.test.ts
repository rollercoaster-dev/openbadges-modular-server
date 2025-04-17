/**
 * Unit tests for IRI utilities
 *
 * This file contains tests for the IRI utility functions to ensure
 * they correctly handle conversions between string and Shared.IRI types.
 */

import { describe, expect, it } from 'bun:test';
import { Shared } from 'openbadges-types';
import {
  toIRI,
  toString,
  isValidIRI,
  ensureValidIRI,
  toIRIArray,
  toStringArray,
  objectWithIRIToString,
  objectWithStringToIRI
} from '../../../src/utils/types/iri-utils';

describe('IRI Utilities', () => {
  describe('toIRI', () => {
    it('should convert a string to a Shared.IRI', () => {
      const result = toIRI('https://example.com/badge');
      expect(result).toBe('https://example.com/badge' as Shared.IRI);
      expect(typeof result).toBe('string');
    });

    it('should return null for null or undefined values', () => {
      expect(toIRI(null)).toBe(null);
      expect(toIRI(undefined)).toBe(null);
      expect(toIRI('')).toBe(null);
    });

    it('should return the same value for a Shared.IRI', () => {
      const iri = 'https://example.com/badge' as Shared.IRI;
      expect(toIRI(iri)).toBe(iri);
    });
  });

  describe('toString', () => {
    it('should convert a Shared.IRI to a string', () => {
      const iri = 'https://example.com/badge' as Shared.IRI;
      const result = toString(iri);
      expect(result).toBe('https://example.com/badge');
      expect(typeof result).toBe('string');
    });

    it('should return null for null or undefined values', () => {
      expect(toString(null)).toBe(null);
      expect(toString(undefined)).toBe(null);
      expect(toString('')).toBe(null);
    });

    it('should return the same value for a string', () => {
      const str = 'https://example.com/badge';
      expect(toString(str)).toBe(str);
    });
  });

  describe('isValidIRI', () => {
    it('should return true for valid URLs', () => {
      expect(isValidIRI('https://example.com/badge')).toBe(true);
      expect(isValidIRI('http://example.com')).toBe(true);
      expect(isValidIRI('https://example.com/badge?param=value')).toBe(true);
    });

    it('should return true for valid UUIDs', () => {
      expect(isValidIRI('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
      expect(isValidIRI('00000000-0000-0000-0000-000000000000')).toBe(true);
    });

    it('should return false for invalid IRIs', () => {
      expect(isValidIRI('not-a-url')).toBe(false);
      expect(isValidIRI('123')).toBe(false);
      expect(isValidIRI('')).toBe(false);
      expect(isValidIRI(null)).toBe(false);
      expect(isValidIRI(undefined)).toBe(false);
    });
  });

  describe('ensureValidIRI', () => {
    it('should return the value as a Shared.IRI if valid', () => {
      const result = ensureValidIRI('https://example.com/badge');
      expect(result).toBe('https://example.com/badge' as Shared.IRI);
    });

    it('should return null for invalid IRIs', () => {
      expect(ensureValidIRI('not-a-url')).toBe(null);
      expect(ensureValidIRI('')).toBe(null);
      expect(ensureValidIRI(null)).toBe(null);
      expect(ensureValidIRI(undefined)).toBe(null);
    });
  });

  describe('toIRIArray', () => {
    it('should convert an array of strings to an array of Shared.IRIs', () => {
      const result = toIRIArray(['https://example.com/badge1', 'https://example.com/badge2']);
      expect(result).toEqual(['https://example.com/badge1' as Shared.IRI, 'https://example.com/badge2' as Shared.IRI]);
    });

    it('should filter out invalid IRIs', () => {
      const result = toIRIArray(['https://example.com/badge', '', null, undefined]);
      expect(result).toEqual(['https://example.com/badge' as Shared.IRI]);
    });

    it('should return an empty array for null or undefined values', () => {
      expect(toIRIArray(null)).toEqual([]);
      expect(toIRIArray(undefined)).toEqual([]);
    });
  });

  describe('toStringArray', () => {
    it('should convert an array of Shared.IRIs to an array of strings', () => {
      const iris = ['https://example.com/badge1', 'https://example.com/badge2'] as Shared.IRI[];
      const result = toStringArray(iris);
      expect(result).toEqual(['https://example.com/badge1', 'https://example.com/badge2']);
    });

    it('should filter out invalid values', () => {
      const iris = ['https://example.com/badge', '', null, undefined] as (Shared.IRI | null | undefined | string)[];
      const result = toStringArray(iris);
      expect(result).toEqual(['https://example.com/badge']);
    });

    it('should return an empty array for null or undefined values', () => {
      expect(toStringArray(null)).toEqual([]);
      expect(toStringArray(undefined)).toEqual([]);
    });
  });

  describe('objectWithIRIToString', () => {
    it('should convert IRI properties to string properties', () => {
      const obj = {
        id: '123e4567-e89b-12d3-a456-426614174000' as Shared.IRI,
        url: 'https://example.com/badge' as Shared.IRI,
        name: 'Test Badge'
      };
      const result = objectWithIRIToString(obj, ['id', 'url']);
      expect(result).toEqual({
        id: '123e4567-e89b-12d3-a456-426614174000',
        url: 'https://example.com/badge',
        name: 'Test Badge'
      });
    });

    it('should handle null or undefined properties', () => {
      const obj = {
        id: '123e4567-e89b-12d3-a456-426614174000' as Shared.IRI,
        url: null,
        image: undefined,
        name: 'Test Badge'
      };
      const result = objectWithIRIToString(obj, ['id', 'url', 'image']);
      expect(result).toEqual({
        id: '123e4567-e89b-12d3-a456-426614174000',
        url: null,
        image: undefined,
        name: 'Test Badge'
      });
    });
  });

  describe('objectWithStringToIRI', () => {
    it('should convert string properties to IRI properties', () => {
      const obj = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        url: 'https://example.com/badge',
        name: 'Test Badge'
      };
      const result = objectWithStringToIRI(obj, ['id', 'url']);
      expect(result).toEqual({
        id: '123e4567-e89b-12d3-a456-426614174000',
        url: 'https://example.com/badge',
        name: 'Test Badge'
      });
    });

    it('should handle null or undefined properties', () => {
      const obj = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        url: null,
        image: undefined,
        name: 'Test Badge'
      };
      const result = objectWithStringToIRI(obj, ['id', 'url', 'image']);
      expect(result).toEqual({
        id: '123e4567-e89b-12d3-a456-426614174000',
        url: null,
        image: undefined,
        name: 'Test Badge'
      });
    });
  });
});
