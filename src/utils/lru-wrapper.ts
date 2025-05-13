/**
 * Wrapper for lru.min module to fix ESM import issues
 * 
 * This wrapper provides a default export for the lru.min module,
 * which is missing in the original module.
 */

// Import the module
import * as lruModule from 'lru.min';

// Re-export with a default export
export default lruModule;

// Also re-export all named exports
export * from 'lru.min';
