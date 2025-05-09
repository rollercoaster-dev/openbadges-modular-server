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
import { MiddlewareHandler } from 'hono';
import { createMiddleware } from 'hono/factory';
import { CreateIssuerSchema } from '../../api/validation/issuer.schemas';
import { CreateBadgeClassSchema } from '../../api/validation/badgeClass.schemas';
import { CreateAssertionSchema } from '../../api/validation/assertion.schemas';
import { z } from 'zod';

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
 * Format Zod validation errors into a record format
 * @param result Zod validation result
 * @returns Record with error messages grouped by field
 */
function formatZodErrors(result: z.SafeParseError<unknown>): Record<string, string[]> {
  const formattedErrors: Record<string, string[]> = {};

  result.error.errors.forEach(err => {
    const path = err.path.join('.') || 'general';
    if (!formattedErrors[path]) {
      formattedErrors[path] = [];
    }
    formattedErrors[path].push(err.message);
  });

  return formattedErrors;
}

/**
 * Middleware for validating an issuer
 * @returns A Hono middleware handler
 */
export function validateIssuerMiddleware(): MiddlewareHandler {
  return createMiddleware(async (c, next) => {
    try {
      const body = await c.req.json();

      // First validate with Zod schema
      const result = CreateIssuerSchema.safeParse(body);
      if (!result.success) {
        return c.json({
          success: false,
          error: 'Validation error',
          details: formatZodErrors(result)
        }, 400);
      }

      // Then validate with entity validator for additional checks
      if (body && typeof body === 'object') {
        const issuerData = Issuer.create(body);
        const { isValid, errors } = validateIssuer(issuerData);

        if (!isValid) {
          return c.json({
            success: false,
            error: 'Validation error',
            details: formatValidationErrors(errors)
          }, 400);
        }
      }

      await next();
    } catch (_error) {
      return c.json({
        success: false,
        error: 'Invalid request body',
        details: { general: ['Request body must be valid JSON'] }
      }, 400);
    }
  });
}

/**
 * Middleware for validating a badge class
 * @returns A Hono middleware handler
 */
export function validateBadgeClassMiddleware(): MiddlewareHandler {
  return createMiddleware(async (c, next) => {
    try {
      const body = await c.req.json();

      // First validate with Zod schema
      const result = CreateBadgeClassSchema.safeParse(body);
      if (!result.success) {
        return c.json({
          success: false,
          error: 'Validation error',
          details: formatZodErrors(result)
        }, 400);
      }

      // Then validate with entity validator for additional checks
      if (body && typeof body === 'object') {
        const badgeClassData = BadgeClass.create(body);
        const { isValid, errors } = validateBadgeClass(badgeClassData);

        if (!isValid) {
          return c.json({
            success: false,
            error: 'Validation error',
            details: formatValidationErrors(errors)
          }, 400);
        }
      }

      await next();
    } catch (_error) {
      return c.json({
        success: false,
        error: 'Invalid request body',
        details: { general: ['Request body must be valid JSON'] }
      }, 400);
    }
  });
}

/**
 * Middleware for validating an assertion
 * @returns A Hono middleware handler
 */
export function validateAssertionMiddleware(): MiddlewareHandler {
  return createMiddleware(async (c, next) => {
    try {
      const body = await c.req.json();

      // First validate with Zod schema
      const result = CreateAssertionSchema.safeParse(body);
      if (!result.success) {
        return c.json({
          success: false,
          error: 'Validation error',
          details: formatZodErrors(result)
        }, 400);
      }

      // Then validate with entity validator for additional checks
      if (body && typeof body === 'object') {
        const assertionData = Assertion.create(body);
        const { isValid, errors } = validateAssertion(assertionData);

        if (!isValid) {
          return c.json({
            success: false,
            error: 'Validation error',
            details: formatValidationErrors(errors)
          }, 400);
        }
      }

      await next();
    } catch (_error) {
      return c.json({
        success: false,
        error: 'Invalid request body',
        details: { general: ['Request body must be valid JSON'] }
      }, 400);
    }
  });
}
