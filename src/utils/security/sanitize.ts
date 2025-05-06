/**
 * Security utilities for sanitizing sensitive information
 *
 * This file contains utility functions for sanitizing sensitive information
 * before logging or displaying it.
 */

/**
 * Sanitizes a database connection string by masking the password
 * @param connectionString The database connection string to sanitize
 * @returns The sanitized connection string with password masked
 */
export function sanitizeConnectionString(connectionString: string): string {
  if (!connectionString) return connectionString;

  // Replace password in standard connection string format
  // Format: postgresql://username:password@host:port/database
  return connectionString.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@');
}

/**
 * Sanitizes an object that might contain sensitive information
 * @param obj The object to sanitize
 * @param sensitiveKeys Array of keys to mask in the object
 * @returns A new object with sensitive values masked
 */
export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  sensitiveKeys: string[] = ['password', 'secret', 'key', 'token', 'apiKey', 'api_key']
): T {
  if (!obj || typeof obj !== 'object') return obj;

  // Create a new object to avoid modifying the original
  const result = { ...obj };

  for (const key of Object.keys(result)) {
    // Check if the key contains any of the sensitive key names
    if (sensitiveKeys.some(sensitiveKey =>
      key.toLowerCase().includes(sensitiveKey.toLowerCase())
    )) {
      // Mask the value if it's a string
      if (typeof result[key] === 'string') {
        result[key as keyof T] = '***' as any;
      }
    } else if (typeof result[key] === 'object' && result[key] !== null) {
      // Recursively sanitize nested objects
      result[key as keyof T] = sanitizeObject(
        result[key] as Record<string, unknown>,
        sensitiveKeys
      ) as any;
    }
  }

  return result;
}
