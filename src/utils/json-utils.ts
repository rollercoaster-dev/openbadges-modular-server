/**
 * Shared JSON utility functions for safe parsing and handling
 * 
 * This module provides centralized JSON parsing utilities to avoid duplication
 * across mappers and other components.
 */

import { logger } from '@utils/logging/logger.service';

/**
 * Safely parses a JSON string or returns the value if it's already an object
 * 
 * @param json The value to parse (string, object, or other)
 * @param defaultValue The default value to return if parsing fails
 * @returns The parsed object or the default value
 */
export function safeParseJson<T>(json: unknown, defaultValue: T): T {
  // If it's a string, try to parse it
  if (typeof json === 'string') {
    try {
      return JSON.parse(json) as T;
    } catch (error) {
      logger.warn('Failed to parse JSON string', { 
        error: error instanceof Error ? error.message : String(error),
        jsonLength: json.length 
      });
      return defaultValue;
    }
  }
  
  // If it's already an object (less common from DB but possible), return it
  if (typeof json === 'object' && json !== null) {
    return json as T;
  }
  
  // For any other type (null, undefined, number, boolean), return default
  return defaultValue;
}

/**
 * Safely parses a JSON string with field name context for better logging
 * 
 * @param value The JSON string to parse
 * @param fieldName The name of the field being parsed (for logging context)
 * @returns The parsed object or null if parsing fails
 */
export function safeJsonParse<T>(
  value: string | null | undefined,
  fieldName: string
): T | null {
  if (!value) return null;

  try {
    return JSON.parse(value) as T;
  } catch (error) {
    logger.warn('Failed to parse JSON field', { 
      fieldName, 
      valueLength: value.length,
      error: error instanceof Error ? error.message : String(error)
    });
    return null;
  }
}

/**
 * Safely stringifies a value to JSON, handling edge cases
 * 
 * @param value The value to stringify
 * @param fieldName Optional field name for logging context
 * @returns The JSON string or null if stringification fails
 */
export function safeJsonStringify(
  value: unknown,
  fieldName?: string
): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  try {
    return JSON.stringify(value);
  } catch (error) {
    logger.warn('Failed to stringify value to JSON', {
      fieldName,
      valueType: typeof value,
      error: error instanceof Error ? error.message : String(error)
    });
    return null;
  }
}

/**
 * Validates if a string is valid JSON without parsing it
 * 
 * @param value The string to validate
 * @returns True if the string is valid JSON
 */
export function isValidJson(value: string): boolean {
  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
}
