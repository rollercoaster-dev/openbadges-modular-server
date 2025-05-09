/**
 * Tests for validation error classes
 */

import { describe, expect, it } from 'bun:test';
import { 
  ValidationError, 
  InvalidDateFormatError, 
  MissingRequiredFieldError,
  MissingRequiredFieldsError
} from '@/utils/errors/validation.errors';

describe('ValidationError', () => {
  it('should create a ValidationError with the correct name and message', () => {
    const error = new ValidationError('Test validation error');
    expect(error.name).toBe('ValidationError');
    expect(error.message).toBe('Test validation error');
    expect(error instanceof Error).toBe(true);
  });
});

describe('InvalidDateFormatError', () => {
  it('should create an InvalidDateFormatError with the correct name, message, and value', () => {
    const invalidValue = 'not-a-date';
    const error = new InvalidDateFormatError('Invalid date format', invalidValue);
    
    expect(error.name).toBe('InvalidDateFormatError');
    expect(error.message).toBe('Invalid date format');
    expect(error.value).toBe(invalidValue);
    expect(error instanceof ValidationError).toBe(true);
  });
});

describe('MissingRequiredFieldError', () => {
  it('should create a MissingRequiredFieldError with the correct name, message, and field', () => {
    const fieldName = 'testField';
    const error = new MissingRequiredFieldError(fieldName);
    
    expect(error.name).toBe('MissingRequiredFieldError');
    expect(error.message).toBe(`Missing required field: ${fieldName}`);
    expect(error.field).toBe(fieldName);
    expect(error instanceof ValidationError).toBe(true);
  });
});

describe('MissingRequiredFieldsError', () => {
  it('should create a MissingRequiredFieldsError with the correct name, message, and fields', () => {
    const fields = ['field1', 'field2', 'field3'];
    const error = new MissingRequiredFieldsError(fields);
    
    expect(error.name).toBe('MissingRequiredFieldsError');
    expect(error.message).toBe(`Missing required fields: ${fields.join(', ')}`);
    expect(error.fields).toEqual(fields);
    expect(error instanceof ValidationError).toBe(true);
  });
});
