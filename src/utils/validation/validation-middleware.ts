/**
 * Middleware for validating Open Badges entities
 *
 * This file contains middleware functions for validating entities
 * before they are processed by the controllers.
 */

import { validateIssuer, validateBadgeClass, validateAssertion } from './entity-validator';
import { Issuer } from '../../domains/issuer/issuer.entity';
import { BadgeClass } from '../../domains/badgeClass/badgeClass.entity';
import { Assertion } from '../../domains/assertion/assertion.entity';
import { Context } from 'elysia';

/**
 * Response type for validation middleware
 */
interface ValidationResponse {
  success: boolean;
  error?: string;
  details?: Record<string, string[]>;
}

/**
 * Convert validation errors array to a record format
 * @param errors Array of error messages
 * @returns Record with error messages grouped by field
 */
function formatValidationErrors(errors: string[]): Record<string, string[]> {
  const formattedErrors: Record<string, string[]> = {};

  // Common field names in validation errors
  const knownFields = [
    'name', 'url', 'email', 'image', 'description', 'criteria',
    'issuer', 'badgeClass', 'recipient', 'issuedOn', 'expires',
    'verification', 'alignment', 'evidence', 'id', 'type'
  ];

  // Group errors by field or use 'general' for generic errors
  errors.forEach(error => {
    // Try to determine which field this error relates to
    const matchedField = knownFields.find(field =>
      error.toLowerCase().includes(`${field.toLowerCase()} is required`) ||
      error.toLowerCase().includes(`${field.toLowerCase()} must be`)
    );

    if (matchedField) {
      // Initialize the array for this field if it doesn't exist
      if (!formattedErrors[matchedField]) {
        formattedErrors[matchedField] = [];
      }
      formattedErrors[matchedField].push(error);
    } else {
      // Use 'general' for errors that don't match a specific field
      if (!formattedErrors['general']) {
        formattedErrors['general'] = [];
      }
      formattedErrors['general'].push(error);
    }
  });

  // If no errors were categorized, fall back to the previous behavior
  if (Object.keys(formattedErrors).length === 0) {
    formattedErrors['validation'] = errors;
  }

  return formattedErrors;
}

/**
 * Middleware for validating an issuer
 * @param issuer The issuer to validate
 * @param set The Elysia set object for setting response status
 * @returns The validation result or throws an error
 */
export function validateIssuerMiddleware(context: Context): ValidationResponse | void {
  const { body, set } = context;

  if (body && typeof body === 'object') {
    const issuerData = Issuer.create(body);
    const { isValid, errors } = validateIssuer(issuerData);

    if (!isValid) {
      set.status = 400;
      return {
        success: false,
        error: 'Validation error',
        details: formatValidationErrors(errors)
      };
    }
  }

  return { success: true };
}

/**
 * Middleware for validating a badge class
 * @param badgeClass The badge class to validate
 * @param set The Elysia set object for setting response status
 * @returns The validation result or throws an error
 */
export function validateBadgeClassMiddleware(context: Context): ValidationResponse | void {
  const { body, set } = context;

  if (body && typeof body === 'object') {
    const badgeClassData = BadgeClass.create(body);
    const { isValid, errors } = validateBadgeClass(badgeClassData);

    if (!isValid) {
      set.status = 400;
      return {
        success: false,
        error: 'Validation error',
        details: formatValidationErrors(errors)
      };
    }
  }

  return { success: true };
}

/**
 * Middleware for validating an assertion
 * @param assertion The assertion to validate
 * @param set The Elysia set object for setting response status
 * @returns The validation result or throws an error
 */
export function validateAssertionMiddleware(context: Context): ValidationResponse | void {
  const { body, set } = context;

  if (body && typeof body === 'object') {
    const assertionData = Assertion.create(body);
    const { isValid, errors } = validateAssertion(assertionData);

    if (!isValid) {
      set.status = 400;
      return {
        success: false,
        error: 'Validation error',
        details: formatValidationErrors(errors)
      };
    }
  }

  return { success: true };
}
