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
        // If the value is not a string, log a warning and return null
        // This handles the edge case where a non-string value is passed
        logger.warn('Expected string for JSON parsing from SQLite, got', {
          type: typeof value,
          value,
        });
        return null;
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

  // Explicit exhaustiveness check - fail fast for unsupported dbType
  logger.error('convertJson received unknown dbType', {
    dbType,
    direction,
    valueType: typeof value,
  });
  return value; // Return original value but log the configuration error
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
          logger.warn(`Invalid date string provided to convertTimestamp`, {
            value,
          });
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
    } else {
      // dbType === 'sqlite'
      return dateObj.getTime(); // SQLite uses numbers (epoch ms)
    }
  }

  // --- Handle 'from' direction (DB -> App) ---
  else {
    // direction === 'from'
    if (dbType === 'postgresql') {
      // Assume PG returns a Date object or something parsable by Date constructor
      if (value instanceof Date) {
        // Already a Date object
        // Check if date is valid
        return isNaN(value.getTime()) ? null : value;
      }
      // Explicitly check if it's string or number before parsing
      if (typeof value === 'string' || typeof value === 'number') {
        try {
          const dateObj = new Date(value);
          // Check if date is valid
          if (isNaN(dateObj.getTime())) {
            // Use logger instead of console.warn
            logger.warn(
              `Invalid date value received from PostgreSQL after parsing`,
              { value }
            );
            return null;
          }
          return dateObj;
        } catch (_e) {
          // Use logger instead of console.warn
          logger.warn(`Error parsing date value from PostgreSQL`, { value });
          return null;
        }
      } else {
        // Use logger instead of console.warn
        logger.warn(`Unexpected timestamp type received from PostgreSQL`, {
          type: typeof value,
          value,
        });
        return null;
      }
    } else {
      // dbType === 'sqlite'
      // Assume SQLite returns a number (epoch ms)
      if (typeof value === 'number') {
        // Check for non-finite numbers before creating Date
        if (!Number.isFinite(value)) {
          logger.warn(`Non-finite timestamp number received from SQLite`, {
            value,
          });
          return null;
        }
        try {
          const dateObj = new Date(value);
          // Check if date is valid (e.g., handle potential huge numbers)
          if (isNaN(dateObj.getTime())) {
            // Use logger instead of console.warn
            logger.warn(
              `Invalid timestamp number received from SQLite after parsing`,
              { value }
            );
            return null;
          }
          return dateObj;
        } catch (_e) {
          // Use logger instead of console.warn
          logger.warn(`Error creating Date from SQLite timestamp number`, {
            value,
          });
          return null;
        }
      } else {
        // If SQLite returns something else, it's unexpected
        // Use logger instead of console.warn
        logger.warn(`Unexpected timestamp type received from SQLite`, {
          type: typeof value,
          value,
        });
        return null;
      }
    }
  }
}

/**
 * Safely converts a value to a Date object.
 * Returns undefined if the value is null, undefined, or an invalid date string.
 * @param value The value to convert.
 * @returns A Date object or undefined.
 */
export function safeConvertToDate(value: unknown): Date | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }
  const date = new Date(value as string | number | Date);
  return isNaN(date.getTime()) ? undefined : date;
}

/**
 * Converts a UUID value between different database formats
 *
 * PostgreSQL uses native uuid type (requires plain UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
 * SQLite uses text (accepts any string format including URN: urn:uuid:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
 *
 * @param value The UUID value (can be URN format or plain UUID)
 * @param dbType The database type ('postgresql' or 'sqlite')
 * @param direction 'to' for app-to-db, 'from' for db-to-app
 * @returns The converted UUID value
 */
export function convertUuid(
  value: string | null | undefined,
  dbType: 'postgresql' | 'sqlite',
  direction: 'to' | 'from'
): string | null | undefined {
  // Handle null/undefined
  if (value === null || value === undefined) {
    return value;
  }

  // For SQLite, no conversion needed - it accepts any string format
  if (dbType === 'sqlite') {
    return value;
  }

  // For PostgreSQL, handle URN ↔ UUID conversion
  if (dbType === 'postgresql') {
    if (direction === 'to') {
      // Convert from app (URN format) to PostgreSQL (plain UUID)
      return urnToUuid(value) as string;
    } else {
      // Convert from PostgreSQL (plain UUID) to app (URN format)
      return uuidToUrn(value) as string;
    }
  }

  // Explicit exhaustiveness check - fail fast for unsupported dbType
  logger.error('convertUuid received unknown dbType', {
    dbType,
    direction,
    value: value ? '[REDACTED]' : value,
  });
  return value; // Return original value but log the configuration error
}

/**
 * Extracts a plain UUID from a URN format string
 *
 * @param urn The URN format string (e.g., "urn:uuid:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx")
 * @returns The plain UUID string (e.g., "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx") or original value if not URN format
 */
export function urnToUuid(
  urn: string | null | undefined | number
): string | null | undefined | number {
  if (typeof urn !== 'string') {
    // Only warn on unexpected object values, not expected null/undefined/number
    if (urn !== null && urn !== undefined && typeof urn === 'object') {
      logger.warn('urnToUuid received unexpected object value', {
        type: typeof urn,
        value: urn,
      });
    }
    return urn;
  }

  // Check if it's already in URN format
  if (urn.startsWith('urn:uuid:')) {
    const uuid = urn.substring(9); // Remove 'urn:uuid:' prefix

    // Validate the extracted UUID format
    if (isValidUuid(uuid)) {
      return uuid;
    } else {
      logger.warn('Invalid UUID extracted from URN', {
        urn,
        extractedUuid: uuid,
      });
      return urn; // Return original if extraction failed
    }
  }

  // If it's already a plain UUID, validate and return
  if (isValidUuid(urn)) {
    return urn;
  }

  // If it's neither URN nor valid UUID, log warning and return original
  logger.warn('Value is neither valid URN nor UUID format', { value: urn });
  return urn;
}

/**
 * Converts a plain UUID to URN format
 *
 * @param uuid The plain UUID string (e.g., "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx")
 * @returns The URN format string (e.g., "urn:uuid:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx")
 */
export function uuidToUrn(
  uuid: string | null | undefined | number
): string | null | undefined | number {
  if (typeof uuid !== 'string') {
    // Only warn on unexpected object values, not expected null/undefined/number
    if (uuid !== null && uuid !== undefined && typeof uuid === 'object') {
      logger.warn('uuidToUrn received unexpected object value', {
        type: typeof uuid,
        value: uuid,
      });
    }
    return uuid;
  }

  // If it's already in URN format, return as-is
  if (uuid.startsWith('urn:uuid:')) {
    return uuid;
  }

  // If it's a valid plain UUID, convert to URN format
  if (isValidUuid(uuid)) {
    return `urn:uuid:${uuid}`;
  }

  // If it's not a valid UUID, log warning and return original
  logger.warn('Value is not a valid UUID for URN conversion', { value: uuid });
  return uuid;
}

/**
 * Validates if a string is a valid UUID format
 *
 * @param value The string to validate
 * @returns True if the string is a valid UUID format
 */
export function isValidUuid(
  value: string | null | undefined | number
): boolean {
  if (typeof value !== 'string') {
    return false;
  }

  // UUID v4 regex pattern
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

/**
 * Validates if a string is a valid URN format
 *
 * @param value The string to validate
 * @returns True if the string is a valid URN format
 */
export function isValidUrn(value: string | null | undefined | number): boolean {
  if (typeof value !== 'string') {
    return false;
  }

  // Check if it starts with 'urn:uuid:' and has a valid UUID after
  if (value.startsWith('urn:uuid:')) {
    const uuid = value.substring(9);
    return isValidUuid(uuid);
  }

  return false;
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
      // Add safety check
      if (typeof value === 'boolean') {
        return value;
      } else {
        logger.warn('Unexpected boolean type received from PostgreSQL', {
          type: typeof value,
          value,
        });
        return null; // Or handle as needed, perhaps default to false?
      }
    }
  }

  // For SQLite
  if (dbType === 'sqlite') {
    if (direction === 'to') {
      // Convert App -> DB (SQLite integer)
      if (typeof value === 'boolean') {
        return value ? 1 : 0;
      } // If already number (0/1), pass through
      return value;
    } else {
      // Convert DB (SQLite integer) -> App (boolean)
      if (typeof value === 'number') {
        // Add safety check for valid integer boolean
        if (value === 0 || value === 1) {
          return value === 1;
        } else {
          logger.warn(
            'Unexpected integer value received for boolean from SQLite',
            { value }
          );
          return null; // Or default to false?
        }
      } else {
        logger.warn('Unexpected boolean type received from SQLite', {
          type: typeof value,
          value,
        });
        return null; // Or default to false?
      }
    }
  }

  // Explicit exhaustiveness check - fail fast for unsupported dbType
  logger.error('convertBoolean received unknown dbType', {
    dbType,
    direction,
    valueType: typeof value,
  });
  return value; // Return original value but log the configuration error
}
