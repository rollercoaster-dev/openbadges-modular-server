import { join, dirname } from 'path';

/**
 * Resolves the migrations path relative to the project root.
 * This ensures the path works regardless of the current working directory
 * when tests are executed from different contexts (IDE, CLI, etc.).
 */
export function getMigrationsPath(): string {
  // Get the directory of this file using import.meta.path (Bun-specific)
  const currentFileDir = dirname(import.meta.path);

  // Navigate up to the project root and then to migrations
  // tests/test-utils -> tests -> project-root -> drizzle/migrations
  return join(currentFileDir, '../../drizzle/migrations');
}

/**
 * Alternative approach using process.cwd() with validation
 * Falls back to relative path resolution if needed
 */
export function getMigrationsPathSafe(): string {
  try {
    // First try using the file-relative approach
    return getMigrationsPath();
  } catch (_error) {
    // Fallback to process.cwd() based approach
    return join(process.cwd(), 'drizzle/migrations');
  }
}
