/**
 * Type utilities for working with openbadges-types
 * 
 * This file provides utility functions for working with the branded types
 * from the openbadges-types package, ensuring proper validation and conversion.
 */

import { Shared, createIRI, isIRI } from 'openbadges-types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Safely creates a Shared.IRI from a string or generates a new UUID as IRI
 * @param value Optional string to convert to IRI
 * @returns A valid Shared.IRI
 * @throws Error if the provided value is not a valid IRI
 */
export function createOrGenerateIRI(value?: string): Shared.IRI {
  if (value) {
    // Use the validation function from openbadges-types
    if (isIRI(value)) {
      return value as Shared.IRI;
    }
    throw new Error(`Invalid IRI: ${value}`);
  }
  // Generate a new UUID and convert to IRI
  return createIRI(uuidv4());
}

/**
 * Safely parses a JSON string to an object
 * @param value JSON string to parse
 * @param defaultValue Default value to return if parsing fails
 * @returns Parsed object or default value
 */
export function parseJSON<T>(value: string | null | undefined, defaultValue?: T): T | undefined {
  if (!value) return defaultValue;
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.error('Error parsing JSON:', error);
    return defaultValue;
  }
}

/**
 * Safely stringifies an object to JSON
 * @param value Object to stringify
 * @returns JSON string or null if stringification fails
 */
export function stringifyJSON(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  try {
    return JSON.stringify(value);
  } catch (error) {
    console.error('Error stringifying JSON:', error);
    return null;
  }
}

/**
 * Safely converts a string to a Shared.DateTime
 * @param value Date string to convert
 * @returns A valid Shared.DateTime or undefined
 */
export function toDateTime(value: string | Date | null | undefined): Shared.DateTime | undefined {
  if (!value) return undefined;
  
  try {
    const dateString = value instanceof Date ? value.toISOString() : value;
    // Validate that it's a proper ISO 8601 date
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(dateString)) {
      throw new Error(`Invalid ISO 8601 date: ${dateString}`);
    }
    return dateString as Shared.DateTime;
  } catch (error) {
    console.error('Error converting to DateTime:', error);
    return undefined;
  }
}

/**
 * Checks if a value is a non-empty string
 * @param value Value to check
 * @returns True if the value is a non-empty string
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Checks if a value is a valid URL
 * @param value Value to check
 * @returns True if the value is a valid URL
 */
export function isValidUrl(value: unknown): boolean {
  if (!isNonEmptyString(value)) return false;
  
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Safely converts a string to a URL IRI
 * @param value URL string to convert
 * @returns A valid Shared.IRI or undefined
 */
export function toUrlIRI(value: string | null | undefined): Shared.IRI | undefined {
  if (!value) return undefined;
  
  if (isValidUrl(value)) {
    return createIRI(value);
  }
  
  return undefined;
}
