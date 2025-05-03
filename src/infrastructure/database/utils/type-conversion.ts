/**
 * Database Type Conversion Utilities
 *
 * This file provides utility functions for converting between different database types
 * when working with both PostgreSQL and SQLite.
 */

import { logger } from '@utils/logging/logger.service';

/**
 * Converts a value to/from JSON for database storage
 *
 * PostgreSQL can store JSON directly using jsonb type
 * SQLite needs to stringify/parse JSON as text
 *
 * @param value The value to convert
 * @param dbType The database type ('postgresql' or 'sqlite')
 * @param direction 'to' for app-to-db, 'from' for db-to-app
 * @returns The converted value
 */
export function convertJson<T>(
  value: T | string | null | undefined,
  dbType: 'postgresql' | 'sqlite',
  direction: 'to' | 'from'
): T | string | null | undefined {
  // Handle null/undefined
  if (value === null || value === undefined) {
    return value;
  }

  // For PostgreSQL, no conversion needed as it handles JSON natively
  if (dbType === 'postgresql') {
    return value;
  }

  // For SQLite, convert between string and object
  if (dbType === 'sqlite') {
    if (direction === 'to') {
      // Convert from app object to DB string
      return typeof value === 'string' ? value : JSON.stringify(value);
    } else {
      // Convert from DB string to app object
      if (typeof value !== 'string') {
        return value;
      }

      try {
        return JSON.parse(value) as T;
      } catch (error) {
        // Use logger instead of console.error
        logger.error('Error parsing JSON from database', { error });
        return null;
      }
    }
  }

  // Default fallback
  return value;
}

/**
 * Converts a timestamp value between different database formats
 *
 * PostgreSQL uses native timestamp type
 * SQLite uses integer (epoch milliseconds)
 *
 * @param value The timestamp value to convert
 * @param dbType The database type ('postgresql' or 'sqlite')
 * @param direction 'to' for app-to-db, 'from' for db-to-app
 * @returns The converted timestamp value
 */
export function convertTimestamp(
  value: Date | number | string | null | undefined,
  dbType: 'postgresql' | 'sqlite',
  direction: 'to' | 'from'
): Date | number | null | undefined {
  // FIX 1: Handle null/undefined correctly
  if (value === null) {
    return null;
  }
  if (value === undefined) {
    return undefined;
  }
  // At this point, value is: Date | number | string

  // --- Handle 'to' direction (App -> DB) ---
  if (direction === 'to') {
    let dateObj: Date | null = null;

    // Convert input to a Date object if it's not already one
    if (value instanceof Date) {
      dateObj = value;
    } else if (typeof value === 'number') {
      // Ensure number is treated as milliseconds epoch
      dateObj = new Date(value);
    } else if (typeof value === 'string') {
      try {
        dateObj = new Date(value);
        // Check if the date is valid after parsing
        if (isNaN(dateObj.getTime())) {
          // Use logger instead of console.warn
          logger.warn(`Invalid date string provided to convertTimestamp`, { value });
          dateObj = null;
        }
      } catch (_e) {
        // Use logger instead of console.warn
        logger.warn(`Error parsing date string in convertTimestamp`, { value });
        dateObj = null;
      }
    }

    // If conversion failed or input was invalid type
    if (!dateObj) {
      return null;
    }

    // Now convert the Date object to the target DB format
    if (dbType === 'postgresql') {
      return dateObj; // PG uses Date objects
    } else { // dbType === 'sqlite'
      return dateObj.getTime(); // SQLite uses numbers (epoch ms)
    }
  }

  // --- Handle 'from' direction (DB -> App) ---
  else { // direction === 'from'
    if (dbType === 'postgresql') {
      // Assume PG returns a Date object or something parsable by Date constructor
      if (value instanceof Date) {
        // Check if date is valid
        return isNaN(value.getTime()) ? null : value;
      }
      // Attempt to parse if not already a Date
      try {
        const dateObj = new Date(value as string | number);
        // Check if date is valid
        if (isNaN(dateObj.getTime())) {
           // Use logger instead of console.warn
           logger.warn(`Invalid date value received from PostgreSQL`, { value });
           return null;
        }
        return dateObj;
      } catch (_e) {
        // Use logger instead of console.warn
        logger.warn(`Error parsing date value from PostgreSQL`, { value });
        return null;
      }
    } else { // dbType === 'sqlite'
      // Assume SQLite returns a number (epoch ms)
      if (typeof value === 'number') {
        const dateObj = new Date(value);
        // Check if date is valid (e.g., handle potential huge numbers)
        if (isNaN(dateObj.getTime())) {
            // Use logger instead of console.warn
            logger.warn(`Invalid timestamp number received from SQLite`, { value });
            return null;
        }
        return dateObj;
      }
      // If SQLite returns something else, it's unexpected
      // Use logger instead of console.warn
      logger.warn(`Unexpected timestamp type received from SQLite`, { type: typeof value, value });
      return null;
    }
  }
}

/**
 * Converts a UUID value between different database formats
 *
 * PostgreSQL uses native uuid type
 * SQLite uses text
 *
 * @param value The UUID value
 * @param dbType The database type ('postgresql' or 'sqlite')
 * @param direction 'to' for app-to-db, 'from' for db-to-app
 * @returns The converted UUID value
 */
export function convertUuid(
  value: string | null | undefined,
  _dbType: 'postgresql' | 'sqlite',
  _direction: 'to' | 'from'
): string | null | undefined {
  // Both PostgreSQL and SQLite handle UUIDs as strings
  // This function is provided for completeness and future compatibility
  return value;
}

/**
 * Converts a boolean value between different database formats
 *
 * PostgreSQL uses native boolean type
 * SQLite uses integer (0/1)
 *
 * @param value The boolean value
 * @param dbType The database type ('postgresql' or 'sqlite')
 * @param direction 'to' for app-to-db, 'from' for db-to-app
 * @returns The converted boolean value
 */
export function convertBoolean(
  value: boolean | number | null | undefined,
  dbType: 'postgresql' | 'sqlite',
  direction: 'to' | 'from'
): boolean | number | null | undefined {
  // Handle null/undefined
  if (value === null || value === undefined) {
    return value;
  }

  // For PostgreSQL
  if (dbType === 'postgresql') {
    if (direction === 'to') {
      // Convert to PostgreSQL boolean
      if (typeof value === 'number') {
        return value !== 0;
      }
      return value;
    } else {
      // PostgreSQL returns boolean, no conversion needed
      return value;
    }
  }

  // For SQLite
  if (dbType === 'sqlite') {
    if (direction === 'to') {
      // Convert to SQLite boolean (integer)
      if (typeof value === 'boolean') {
        return value ? 1 : 0;
      }
      return value;
    } else {
      // Convert from SQLite boolean (integer) to boolean
      if (typeof value === 'number') {
        return value !== 0;
      }
      return value;
    }
  }

  // Default fallback
  return value;
}
