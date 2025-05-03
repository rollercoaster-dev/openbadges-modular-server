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

  // Group errors by field or use 'general' for generic errors
  errors.forEach(error => {
    formattedErrors['validation'] = formattedErrors['validation'] || [];
    formattedErrors['validation'].push(error);
  });

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
