/**
 * Middleware for validating Open Badges entities
 * 
 * This file contains middleware functions for validating entities
 * before they are processed by the controllers.
 */

import { Elysia } from 'elysia';
import { validateIssuer, validateBadgeClass, validateAssertion } from './entity-validator';
import { Issuer } from '../../domains/issuer/issuer.entity';
import { BadgeClass } from '../../domains/badgeClass/badgeClass.entity';
import { Assertion } from '../../domains/assertion/assertion.entity';

/**
 * Middleware for validating an issuer
 * @param issuer The issuer to validate
 * @param set The Elysia set object for setting response status
 * @returns The validation result or throws an error
 */
export function validateIssuerMiddleware({ body, set }: { body: any, set: any }) {
  const issuerData = Issuer.create(body);
  const { isValid, errors } = validateIssuer(issuerData);
  
  if (!isValid) {
    set.status = 400;
    return {
      success: false,
      error: 'Validation error',
      details: errors
    };
  }
  
  return { success: true };
}

/**
 * Middleware for validating a badge class
 * @param badgeClass The badge class to validate
 * @param set The Elysia set object for setting response status
 * @returns The validation result or throws an error
 */
export function validateBadgeClassMiddleware({ body, set }: { body: any, set: any }) {
  const badgeClassData = BadgeClass.create(body);
  const { isValid, errors } = validateBadgeClass(badgeClassData);
  
  if (!isValid) {
    set.status = 400;
    return {
      success: false,
      error: 'Validation error',
      details: errors
    };
  }
  
  return { success: true };
}

/**
 * Middleware for validating an assertion
 * @param assertion The assertion to validate
 * @param set The Elysia set object for setting response status
 * @returns The validation result or throws an error
 */
export function validateAssertionMiddleware({ body, set }: { body: any, set: any }) {
  const assertionData = Assertion.create(body);
  const { isValid, errors } = validateAssertion(assertionData);
  
  if (!isValid) {
    set.status = 400;
    return {
      success: false,
      error: 'Validation error',
      details: errors
    };
  }
  
  return { success: true };
}
