/**
 * Utility functions for handling IRI types
 *
 * This file contains utility functions for handling IRI types and conversions
 * between string and Shared.IRI types.
 */

import { Shared } from 'openbadges-types';
import { IRICompatible, ObjectWithIRIs, ObjectWithStrings } from './iri.types';
import { logger } from '../logging/logger.service';
import { v4 as uuidv4 } from 'uuid';

/**
 * Checks if a value is a valid IRI (strict: URL or UUID)
 */
export function isValidIRI(value: unknown): boolean {
  if (value == null || value === '') return false;
  try {
    new URL(value.toString());
    return true;
  } catch {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value.toString());
  }
}

/**
 * Converts a string to a Shared.IRI (strict: URL or UUID)
 * Use for Open Badges and general IRI validation.
 */
export function toIRI(value: IRICompatible): Shared.IRI | null {
  if (value == null || value === '') return null;
  if (typeof value === 'object' && value !== null) return value;
  if (isValidIRI(value)) return value as Shared.IRI;
  logger.warn('Invalid IRI value', { value });
  return null;
}

/**
 * Converts a Shared.IRI to a string
 * @param value The Shared.IRI to convert
 * @returns The converted string
 */
export function toString(value: IRICompatible): string | null {
  if (value == null || value === '') {
    return null;
  }
  return value.toString();
}

/**
 * Converts a string to an Issuer ID (relaxed: any non-empty string)
 * Use ONLY for issuer resource lookups, not for Open Badges data validation.
 * @param value The string to convert
 * @returns The value as Shared.IRI if non-empty, null otherwise
 */
/**
 * Converts a string to an Issuer ID (relaxed: any non-empty string)
 * Use ONLY for issuer resource lookups, not for Open Badges data validation.
 */
export function toIssuerId(value: IRICompatible): Shared.IRI | null {
  if (value == null || value === '') return null;
  return value as Shared.IRI;
}

/**
 * Ensures a value is a valid IRI
 * @param value The value to check
 * @returns The value as a Shared.IRI if valid, null otherwise
 */
/**
 * Ensures a value is a valid IRI (strict)
 */
export function ensureValidIRI(value: unknown): Shared.IRI | null {
  if (
    typeof value === 'string' ||
    (typeof value === 'object' && value !== null)
  ) {
    return toIRI(value as IRICompatible);
  }
  return null;
}

/**
 * Converts an array of strings to an array of Shared.IRIs
 * @param values The array of strings to convert
 * @returns The converted array of Shared.IRIs
 */
/**
 * Converts an array of strings to an array of Shared.IRIs (strict)
 */
export function toIRIArray(
  values: IRICompatible[] | null | undefined
): Shared.IRI[] {
  return (values ?? []).map(toIRI).filter(Boolean) as Shared.IRI[];
}

/**
 * Converts an array of Shared.IRIs to an array of strings
 * @param values The array of Shared.IRIs to convert
 * @returns The converted array of strings
 */
export function toStringArray(
  values: IRICompatible[] | null | undefined
): string[] {
  if (values == null) {
    return [];
  }
  return values.map((value) => toString(value)).filter(Boolean) as string[];
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
    if (result[prop] != null) {
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
 * @throws Error if any of the properties cannot be converted to a valid IRI
 */
export function objectWithStringToIRI<T extends Record<string, unknown>>(
  obj: T,
  iriProperties: string[]
): ObjectWithIRIs<T> {
  const result: Record<string, unknown> = { ...obj };
  const invalidProps: string[] = [];

  for (const prop of iriProperties) {
    if (result[prop] != null) {
      const iri = toIRI(result[prop] as string);
      if (iri === null) {
        // Track invalid properties
        invalidProps.push(prop);
      } else {
        result[prop] = iri;
      }
    }
  }

  // If any properties couldn't be converted, throw an error
  if (invalidProps.length > 0) {
    throw new Error(
      `Failed to convert properties to IRI: ${invalidProps.join(', ')}`
    );
  }

  return result as ObjectWithIRIs<T>;
}

/**
 * The `createOrGenerateIRI` function serves two purposes:
 * 1. It validates an existing IRI string and converts it into an IRI object.
 *    If the string is invalid, an error is thrown.
 * 2. If no argument is provided, it generates a new random UUID and returns it as an IRI.
 *
 * This utility ensures that all IRIs used in the API are valid and conform to expected standards.
 *
 * @param value Optional IRI string to validate and convert
 * @returns A valid Shared.IRI object
 * @throws Error if the provided value is not a valid IRI
 */
export function createOrGenerateIRI(value?: string): Shared.IRI {
  if (!value) {
    // Generate a new UUID-based IRI if no value is provided
    return `urn:uuid:${uuidv4()}` as Shared.IRI;
  }

  // Validate and convert the provided value
  const iri = toIRI(value);
  if (iri === null) {
    throw new Error(`Invalid IRI value: ${value}`);
  }

  return iri;
}
