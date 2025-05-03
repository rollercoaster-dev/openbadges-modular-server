/**
 * Custom error classes for validation errors
 * 
 * These error classes provide more specific error types for validation failures,
 * making error handling more robust and explicit.
 */

/**
 * Base class for validation errors
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Error thrown when a date format is invalid
 */
export class InvalidDateFormatError extends ValidationError {
  public readonly value: unknown;
  
  constructor(message: string, value: unknown) {
    super(message);
    this.name = 'InvalidDateFormatError';
    this.value = value;
  }
}

/**
 * Error thrown when a required field is missing
 */
export class MissingRequiredFieldError extends ValidationError {
  public readonly field: string;
  
  constructor(field: string) {
    super(`Missing required field: ${field}`);
    this.name = 'MissingRequiredFieldError';
    this.field = field;
  }
}

/**
 * Error thrown when multiple required fields are missing
 */
export class MissingRequiredFieldsError extends ValidationError {
  public readonly fields: string[];
  
  constructor(fields: string[]) {
    super(`Missing required fields: ${fields.join(', ')}`);
    this.name = 'MissingRequiredFieldsError';
    this.fields = fields;
  }
}
