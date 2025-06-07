/**
 * Headers Helper for Test Utilities
 *
 * Provides safe conversion methods for Headers objects in test environments
 * where certain methods may not be available in all TypeScript configurations.
 */

/**
 * Safely converts a Headers object to a plain object for logging/debugging purposes
 * This function handles cases where Headers.entries() may not be available in the type definitions
 *
 * @param headers - The Headers object to convert
 * @returns A plain object representation of the headers
 */
export function headersToObject(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {};

  try {
    // Use headers.forEach which is the standard method available on Headers
    headers.forEach((value: string, key: string) => {
      result[key] = value;
    });
  } catch (_error) {
    // If forEach is not available, return an empty object with a note
    result['__error__'] = 'Failed to convert headers';
  }

  return result;
}
