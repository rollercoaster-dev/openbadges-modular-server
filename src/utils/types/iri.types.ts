/**
 * Type definitions for IRI-related utilities
 * 
 * These types are used across the application for handling IRIs
 * (Internationalized Resource Identifiers).
 */

import { Shared } from 'openbadges-types';

/**
 * Type representing values that can be converted to an IRI
 */
export type IRICompatible = string | Shared.IRI | null | undefined;

/**
 * Type for objects with IRI properties
 */
export type ObjectWithIRIs<T extends Record<string, unknown>> = T & {
  [K in keyof T]: T[K] extends Shared.IRI ? Shared.IRI : T[K];
};

/**
 * Type for objects with string properties that can be converted to IRIs
 */
export type ObjectWithStrings<T extends Record<string, unknown>> = T & {
  [K in keyof T]: T[K] extends Shared.IRI ? string : T[K];
};
