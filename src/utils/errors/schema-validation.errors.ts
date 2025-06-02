/**
 * Schema validation error types for Open Badges credential schema validation
 */

/**
 * Base class for all schema validation errors
 */
export class SchemaValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SchemaValidationError';
  }
}

/**
 * Error thrown when a credential schema cannot be fetched
 */
export class SchemaFetchError extends SchemaValidationError {
  public readonly schemaUrl: string;

  constructor(schemaUrl: string) {
    super(`Failed to fetch schema from ${schemaUrl}`);
    this.name = 'SchemaFetchError';
    this.schemaUrl = schemaUrl;
  }
}

/**
 * Error thrown when a fetched schema is invalid JSON Schema
 */
export class InvalidSchemaError extends SchemaValidationError {
  public readonly schemaUrl: string;

  constructor(schemaUrl: string, details: string) {
    super(`Invalid JSON Schema at ${schemaUrl}: ${details}`);
    this.name = 'InvalidSchemaError';
    this.schemaUrl = schemaUrl;
  }
}

/**
 * Error thrown when credential validation against schema fails
 */
export class CredentialSchemaValidationError extends SchemaValidationError {
  public readonly schemaUrl: string;
  public readonly validationErrors: Array<{
    instancePath: string;
    schemaPath: string;
    keyword: string;
    params: Record<string, unknown>;
    message?: string;
  }>;

  constructor(
    schemaUrl: string,
    validationErrors: Array<{
      instancePath: string;
      schemaPath: string;
      keyword: string;
      params: Record<string, unknown>;
      message?: string;
    }>
  ) {
    const errorSummary = validationErrors
      .map(err => `${err.instancePath || 'root'}: ${err.message || err.keyword}`)
      .join('; ');

    super(`Credential validation failed against schema ${schemaUrl}: ${errorSummary}`);
    this.name = 'CredentialSchemaValidationError';
    this.schemaUrl = schemaUrl;
    this.validationErrors = validationErrors;
  }
}

/**
 * Error thrown when an unsupported schema type is encountered
 */
export class UnsupportedSchemaTypeError extends SchemaValidationError {
  public readonly schemaType: string;

  constructor(schemaType: string) {
    super(`Unsupported credential schema type: ${schemaType}`);
    this.name = 'UnsupportedSchemaTypeError';
    this.schemaType = schemaType;
  }
}

/**
 * Error thrown when schema validation times out
 */
export class SchemaValidationTimeoutError extends SchemaValidationError {
  public readonly timeoutMs: number;

  constructor(timeoutMs: number) {
    super(`Schema validation timed out after ${timeoutMs}ms`);
    this.name = 'SchemaValidationTimeoutError';
    this.timeoutMs = timeoutMs;
  }
}
