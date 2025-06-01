/**
 * Schema Validation Service for Open Badges v3.0 Credential Schema Validation
 * 
 * This service handles validation of credentials against external JSON schemas
 * referenced by the credentialSchema property in verifiable credentials.
 */

import { Injectable } from '@nestjs/common';
import { type ValidateFunction } from 'ajv';
import { ajvInstance, getValidationFunction } from '../utils/json-schema/ajv-config';
import { logger } from '../utils/logging/logger.service';
import {
  SchemaValidationError,
  SchemaFetchError,
  InvalidSchemaError,
  CredentialSchemaValidationError,
  UnsupportedSchemaTypeError,
  SchemaValidationTimeoutError
} from '../utils/errors/schema-validation.errors';

/**
 * Represents a credential schema reference
 */
export interface CredentialSchema {
  id: string;
  type: string;
}

/**
 * Supported credential schema types
 */
export enum SupportedSchemaTypes {
  JSON_SCHEMA_VALIDATOR_2019 = '1EdTechJsonSchemaValidator2019',
  JSON_SCHEMA_VALIDATOR_2020 = 'JsonSchemaValidator2020'
}

/**
 * Custom validation rule function type
 */
export type CustomValidationRule = (credential: any, context: ValidationContext) => Promise<ValidationResult>;

/**
 * Validation context for custom rules
 */
export interface ValidationContext {
  credentialType?: string;
  issuer?: string;
  schemaUrl?: string;
}

/**
 * Validation result from custom rules
 */
export interface ValidationResult {
  isValid: boolean;
  errors?: string[];
}

/**
 * Configuration options for schema validation
 */
export interface SchemaValidationOptions {
  /** Timeout for schema fetching in milliseconds */
  timeoutMs?: number;
  /** Whether to cache schemas */
  enableCaching?: boolean;
  /** Whether to validate schema format before using */
  validateSchemaFormat?: boolean;
  /** Custom validation rules to apply */
  customRules?: CustomValidationRule[];
}

/**
 * Default validation options
 */
const DEFAULT_OPTIONS: Required<Omit<SchemaValidationOptions, 'customRules'>> & { customRules: CustomValidationRule[] } = {
  timeoutMs: 10000, // 10 seconds
  enableCaching: true,
  validateSchemaFormat: true,
  customRules: []
};

@Injectable()
export class SchemaValidationService {
  private readonly schemaCache = new Map<string, object>();
  private readonly validationFunctionCache = new Map<string, ValidateFunction>();

  /**
   * Validate a credential against its referenced schemas
   */
  async validateCredential(
    credential: any,
    credentialSchemas: CredentialSchema[],
    options: SchemaValidationOptions = {}
  ): Promise<void> {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    if (!credentialSchemas || credentialSchemas.length === 0) {
      logger.debug('No credential schemas provided, skipping validation');
      return;
    }

    logger.info(`Validating credential against ${credentialSchemas.length} schema(s)`);

    // Validate each schema
    for (const credentialSchema of credentialSchemas) {
      await this.validateAgainstSchema(credential, credentialSchema, opts);
    }

    // Apply custom validation rules
    if (opts.customRules.length > 0) {
      await this.applyCustomValidationRules(credential, credentialSchemas, opts);
    }

    logger.info('Credential validation completed successfully');
  }

  /**
   * Validate a credential against a single schema
   */
  private async validateAgainstSchema(
    credential: any,
    credentialSchema: CredentialSchema,
    options: Required<SchemaValidationOptions>
  ): Promise<void> {
    // Check if schema type is supported
    if (!this.isSupportedSchemaType(credentialSchema.type)) {
      throw new UnsupportedSchemaTypeError(credentialSchema.type);
    }

    try {
      // Get validation function (with timeout)
      const validateFn = await this.withTimeout(
        this.getValidationFunction(credentialSchema, options),
        options.timeoutMs
      );

      // Validate the credential
      const isValid = validateFn(credential);

      if (!isValid && validateFn.errors) {
        throw new CredentialSchemaValidationError(
          credentialSchema.id,
          validateFn.errors.map(error => ({
            instancePath: error.instancePath,
            schemaPath: error.schemaPath,
            keyword: error.keyword,
            params: error.params || {},
            message: error.message
          }))
        );
      }

      logger.debug(`Credential validated successfully against schema: ${credentialSchema.id}`);
    } catch (error) {
      if (error instanceof SchemaValidationError) {
        throw error;
      }
      
      logger.error(`Unexpected error during schema validation:`, error);
      throw new SchemaValidationError(`Unexpected error during validation: ${error.message}`);
    }
  }

  /**
   * Get or create a validation function for a schema
   */
  private async getValidationFunction(
    credentialSchema: CredentialSchema,
    options: Required<SchemaValidationOptions>
  ): Promise<ValidateFunction> {
    const cacheKey = credentialSchema.id;

    // Check cache first
    if (options.enableCaching && this.validationFunctionCache.has(cacheKey)) {
      logger.debug(`Using cached validation function for schema: ${credentialSchema.id}`);
      return this.validationFunctionCache.get(cacheKey)!;
    }

    try {
      // Load schema if not cached
      const schema = await this.loadSchema(credentialSchema.id, options);

      // Validate schema format if requested
      if (options.validateSchemaFormat) {
        this.validateSchemaFormat(schema, credentialSchema.id);
      }

      // Get validation function
      const validateFn = await getValidationFunction(credentialSchema.id, schema);

      // Cache the validation function
      if (options.enableCaching) {
        this.validationFunctionCache.set(cacheKey, validateFn);
      }

      return validateFn;
    } catch (error) {
      logger.error(`Failed to get validation function for schema ${credentialSchema.id}:`, error);
      throw new SchemaFetchError(credentialSchema.id);
    }
  }

  /**
   * Load a schema from URL with caching
   */
  private async loadSchema(schemaUrl: string, options: Required<SchemaValidationOptions>): Promise<object> {
    // Check cache first
    if (options.enableCaching && this.schemaCache.has(schemaUrl)) {
      logger.debug(`Using cached schema: ${schemaUrl}`);
      return this.schemaCache.get(schemaUrl)!;
    }

    try {
      logger.info(`Fetching schema from: ${schemaUrl}`);
      
      const response = await fetch(schemaUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const schema = await response.json();

      // Cache the schema
      if (options.enableCaching) {
        this.schemaCache.set(schemaUrl, schema);
      }

      logger.debug(`Successfully loaded and cached schema: ${schemaUrl}`);
      return schema;
    } catch (error) {
      logger.error(`Failed to fetch schema from ${schemaUrl}:`, error);
      throw new SchemaFetchError(schemaUrl);
    }
  }

  /**
   * Validate that a fetched object is a valid JSON Schema
   */
  private validateSchemaFormat(schema: any, schemaUrl: string): void {
    if (!schema || typeof schema !== 'object') {
      throw new InvalidSchemaError(schemaUrl, 'Schema is not a valid object');
    }

    // Basic JSON Schema validation - check for required properties
    if (!schema.$schema && !schema.type && !schema.properties && !schema.items) {
      throw new InvalidSchemaError(
        schemaUrl, 
        'Schema does not appear to be a valid JSON Schema (missing $schema, type, properties, or items)'
      );
    }
  }

  /**
   * Apply custom validation rules to a credential
   */
  private async applyCustomValidationRules(
    credential: any,
    credentialSchemas: CredentialSchema[],
    options: Required<Omit<SchemaValidationOptions, 'customRules'>> & { customRules: CustomValidationRule[] }
  ): Promise<void> {
    logger.info(`Applying ${options.customRules.length} custom validation rule(s)`);

    const context: ValidationContext = {
      credentialType: credential.type,
      issuer: credential.issuer?.id || credential.issuer,
      schemaUrl: credentialSchemas[0]?.id // Use first schema URL as context
    };

    const customErrors: string[] = [];

    for (const rule of options.customRules) {
      try {
        const result = await this.withTimeout(rule(credential, context), options.timeoutMs);

        if (!result.isValid) {
          if (result.errors && result.errors.length > 0) {
            customErrors.push(...result.errors);
          } else {
            customErrors.push('Custom validation rule failed');
          }
        }
      } catch (error) {
        logger.error('Custom validation rule threw an error:', error);
        customErrors.push(`Custom validation rule error: ${error.message}`);
      }
    }

    if (customErrors.length > 0) {
      throw new SchemaValidationError(`Custom validation failed: ${customErrors.join('; ')}`);
    }

    logger.debug('All custom validation rules passed');
  }

  /**
   * Check if a schema type is supported
   */
  private isSupportedSchemaType(schemaType: string): boolean {
    return Object.values(SupportedSchemaTypes).includes(schemaType as SupportedSchemaTypes);
  }

  /**
   * Execute a promise with timeout
   */
  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new SchemaValidationTimeoutError(timeoutMs)), timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]);
  }

  /**
   * Clear all caches
   */
  clearCaches(): void {
    this.schemaCache.clear();
    this.validationFunctionCache.clear();
    logger.info('Schema validation caches cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { schemas: number; validationFunctions: number } {
    return {
      schemas: this.schemaCache.size,
      validationFunctions: this.validationFunctionCache.size
    };
  }

  /**
   * Predefined custom validation rules
   */
  static readonly CustomRules = {
    /**
     * Validate that the credential has a valid issuance date
     */
    validateIssuanceDate: async (credential: any, context: ValidationContext): Promise<ValidationResult> => {
      const issuanceDate = credential.issuanceDate;

      if (!issuanceDate) {
        return { isValid: false, errors: ['Missing issuanceDate'] };
      }

      const date = new Date(issuanceDate);
      if (isNaN(date.getTime())) {
        return { isValid: false, errors: ['Invalid issuanceDate format'] };
      }

      // Check if issuance date is not in the future
      if (date > new Date()) {
        return { isValid: false, errors: ['issuanceDate cannot be in the future'] };
      }

      return { isValid: true };
    },

    /**
     * Validate that the credential has not expired
     */
    validateExpirationDate: async (credential: any, context: ValidationContext): Promise<ValidationResult> => {
      const expirationDate = credential.expirationDate;

      if (!expirationDate) {
        return { isValid: true }; // No expiration date is valid
      }

      const date = new Date(expirationDate);
      if (isNaN(date.getTime())) {
        return { isValid: false, errors: ['Invalid expirationDate format'] };
      }

      // Check if credential has expired
      if (date < new Date()) {
        return { isValid: false, errors: ['Credential has expired'] };
      }

      return { isValid: true };
    },

    /**
     * Validate that the credential has a valid issuer
     */
    validateIssuer: async (credential: any, context: ValidationContext): Promise<ValidationResult> => {
      const issuer = credential.issuer;

      if (!issuer) {
        return { isValid: false, errors: ['Missing issuer'] };
      }

      // If issuer is a string, it should be a valid URL
      if (typeof issuer === 'string') {
        try {
          new URL(issuer);
          return { isValid: true };
        } catch {
          return { isValid: false, errors: ['Issuer URL is invalid'] };
        }
      }

      // If issuer is an object, it should have an id
      if (typeof issuer === 'object' && issuer.id) {
        try {
          new URL(issuer.id);
          return { isValid: true };
        } catch {
          return { isValid: false, errors: ['Issuer id is not a valid URL'] };
        }
      }

      return { isValid: false, errors: ['Issuer must be a URL string or object with id property'] };
    }
  };
}
