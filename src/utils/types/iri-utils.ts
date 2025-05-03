/**
 * Utility functions for handling IRI types
 *
 * This file contains utility functions for handling IRI types and conversions
 * between string and Shared.IRI types.
 */

import { Shared } from 'openbadges-types';
import { IRICompatible, ObjectWithIRIs, ObjectWithStrings } from './iri.types';

/**
 * Converts a string to a Shared.IRI
 * @param value The string to convert
 * @returns The converted Shared.IRI
 */
export function toIRI(value: IRICompatible): Shared.IRI | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  return value as Shared.IRI;
}

/**
 * Converts a Shared.IRI to a string
 * @param value The Shared.IRI to convert
 * @returns The converted string
 */
export function toString(value: IRICompatible): string | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  return value.toString();
}

/**
 * Checks if a value is a valid IRI
 * @param value The value to check
 * @returns True if the value is a valid IRI, false otherwise
 */
export function isValidIRI(value: unknown): boolean {
  if (value === null || value === undefined || value === '') {
    return false;
  }

  try {
    // Try to create a URL from the value
    new URL(value.toString());
    return true;
  } catch {
    // If it's not a URL, check if it's a UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value.toString());
  }
}

/**
 * Ensures a value is a valid IRI
 * @param value The value to check
 * @returns The value as a Shared.IRI if valid, null otherwise
 */
export function ensureValidIRI(value: unknown): Shared.IRI | null {
  if (isValidIRI(value)) {
    return value as Shared.IRI;
  }
  return null;
}

/**
 * Converts an array of strings to an array of Shared.IRIs
 * @param values The array of strings to convert
 * @returns The converted array of Shared.IRIs
 */
export function toIRIArray(values: IRICompatible[] | null | undefined): Shared.IRI[] {
  if (values === null || values === undefined) {
    return [];
  }
  return values.map(value => toIRI(value)).filter(Boolean) as Shared.IRI[];
}

/**
 * Converts an array of Shared.IRIs to an array of strings
 * @param values The array of Shared.IRIs to convert
 * @returns The converted array of strings
 */
export function toStringArray(values: IRICompatible[] | null | undefined): string[] {
  if (values === null || values === undefined) {
    return [];
  }
  return values.map(value => toString(value)).filter(Boolean) as string[];
}

/**
 * Converts an object with IRI properties to an object with string properties
 * @param obj The object to convert
 * @param iriProperties The properties to convert
 * @returns The converted object
 */
export function objectWithIRIToString<T extends Record<string, unknown>>(
  obj: T,
  iriProperties: string[]
): ObjectWithStrings<T> {
  const result: Record<string, unknown> = { ...obj };

  for (const prop of iriProperties) {
    if (result[prop] !== undefined && result[prop] !== null) {
      result[prop] = toString(result[prop] as Shared.IRI);
    }
  }

  return result as ObjectWithStrings<T>;
}

/**
 * Converts an object with string properties to an object with IRI properties
 * @param obj The object to convert
 * @param iriProperties The properties to convert
 * @returns The converted object
 */
export function objectWithStringToIRI<T extends Record<string, unknown>>(
  obj: T,
  iriProperties: string[]
): ObjectWithIRIs<T> {
  const result: Record<string, unknown> = { ...obj };

  for (const prop of iriProperties) {
    if (result[prop] !== undefined && result[prop] !== null) {
      result[prop] = toIRI(result[prop] as string);
    }
  }

  return result as ObjectWithIRIs<T>;
}
