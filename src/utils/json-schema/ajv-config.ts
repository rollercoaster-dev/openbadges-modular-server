/**
 * AJV JSON Schema validation configuration
 * 
 * This module configures AJV for validating credentials against JSON schemas
 * referenced by the credentialSchema property in Open Badges v3.0.
 */

import Ajv, { type AjvOptions, type ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import { logger } from '../logging/logger.service.js';

/**
 * AJV configuration options optimized for credential schema validation
 */
const AJV_OPTIONS: AjvOptions = {
  // Allow strict mode for better validation
  strict: true,
  // Allow additional properties by default (credentials may have extensions)
  additionalProperties: true,
  // Remove additional properties that are not in schema
  removeAdditional: false,
  // Use defaults from schema
  useDefaults: true,
  // Coerce types when possible
  coerceTypes: false,
  // Allow unknown formats
  allowUnionTypes: true,
  // Validate formats
  validateFormats: true,
  // Add verbose errors
  verbose: true,
  // Allow async validation for remote schemas
  loadSchema: async (uri: string) => {
    logger.info(`Loading remote schema: ${uri}`);
    try {
      // Use global fetch which can be mocked in tests
      const response = await globalThis.fetch(uri);
      if (!response.ok) {
        throw new Error(`Failed to fetch schema: ${response.status} ${response.statusText}`);
      }
      const schema = await response.json();
      logger.debug(`Successfully loaded schema from ${uri}`);
      return schema;
    } catch (error) {
      logger.error(`Failed to load schema from ${uri}:`, error);
      throw error;
    }
  },
};

/**
 * Create and configure a new AJV instance for credential schema validation
 */
export function createAjvInstance(): Ajv {
  const ajv = new Ajv(AJV_OPTIONS);
  
  // Add standard formats (date, time, email, uri, etc.)
  addFormats(ajv);
  
  // Add custom formats specific to Open Badges/Verifiable Credentials
  ajv.addFormat('iri', {
    type: 'string',
    validate: (value: string) => {
      try {
        // Basic IRI validation - should be a valid URI
        new URL(value);
        return true;
      } catch {
        return false;
      }
    }
  });

  ajv.addFormat('datetime', {
    type: 'string',
    validate: (value: string) => {
      // ISO 8601 datetime validation
      const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
      if (!iso8601Regex.test(value)) {
        return false;
      }
      const date = new Date(value);
      return !isNaN(date.getTime());
    }
  });

  // Add error handling
  ajv.addKeyword({
    keyword: 'errorMessage',
    type: 'object',
    schemaType: 'object',
    compile: () => () => true
  });

  return ajv;
}

/**
 * Global AJV instance for credential schema validation
 */
export const ajvInstance = createAjvInstance();

/**
 * Cache for compiled validation functions
 */
const validationCache = new Map<string, ValidateFunction>();

/**
 * Get or create a validation function for a schema
 */
export async function getValidationFunction(
  schemaId: string, 
  schema?: object
): Promise<ValidateFunction> {
  // Check cache first
  if (validationCache.has(schemaId)) {
    const cached = validationCache.get(schemaId)!;
    return cached;
  }

  let validateFn: ValidateFunction;

  if (schema) {
    // Compile provided schema
    validateFn = ajvInstance.compile(schema);
  } else {
    // Load and compile remote schema
    validateFn = await ajvInstance.compileAsync({ $ref: schemaId });
  }

  // Cache the compiled function
  validationCache.set(schemaId, validateFn);
  
  return validateFn;
}

/**
 * Clear the validation cache
 */
export function clearValidationCache(): void {
  validationCache.clear();
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { size: number; keys: string[] } {
  return {
    size: validationCache.size,
    keys: Array.from(validationCache.keys())
  };
}
