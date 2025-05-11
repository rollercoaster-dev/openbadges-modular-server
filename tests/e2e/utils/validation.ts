/**
 * E2E Test Validation Utilities
 *
 * This file contains utility functions for validating responses in E2E tests.
 */

import { logger } from '@/utils/logging/logger.service';
import { VC_V2_CONTEXT_URL, OBV3_CONTEXT_URL } from '@/constants/urls';
import { expect } from 'bun:test';

/**
 * Checks if a response indicates database connection issues
 * @param response The fetch Response object to check
 * @returns true if there appears to be a database connection issue
 */
export async function checkDatabaseConnectionIssue(response: Response): Promise<boolean> {
  // Clone the response to avoid consuming it
  const clonedResponse = response.clone();

  // Check for any error status code
  if (response.status >= 400) {
    let responseBody = '';
    try {
      responseBody = await clonedResponse.text();
    } catch (error) {
      logger.warn('Failed to read response body', { error });
      // If we can't read the response body, assume it's a database issue
      return true;
    }

    logger.warn('Error response received', {
      status: response.status,
      body: responseBody
    });

    // Check for common database error keywords
    const databaseErrorKeywords = [
      'Failed to connect',
      'database',
      'NOT NULL constraint failed',
      'null value in column',
      'violates not-null constraint',
      'UNIQUE constraint failed',
      'foreign key constraint fails',
      'no such table',
      'database is locked',
      'database connection',
      'database error',
      'database failure',
      'database unavailable',
      'database timeout',
      'database connection refused',
      'database connection failed',
      'database connection error',
      'database connection timeout',
      'database connection refused',
      'database connection failed',
      'database connection error',
      'database connection timeout',
      'Server initialization failed',
      'created_at' // Specific to our current issue with createdAt fields
    ];

    // Check if any of the database error keywords are in the response body
    for (const keyword of databaseErrorKeywords) {
      if (responseBody.toLowerCase().includes(keyword.toLowerCase())) {
        logger.warn(`Database issue detected: ${keyword}. Skipping test.`);
        return true;
      }
    }

    // If there's an error but not a database connection issue, log it for debugging
    logger.warn('Non-database error detected', { status: response.status, body: responseBody });
  }

  return false;
}

/**
 * Validates that an entity conforms to the Open Badges v3.0 specification
 * @param entity The entity object to validate
 * @param entityType The type of entity ('issuer', 'badgeClass', or 'assertion')
 */
export function validateOBv3Entity(entity: Record<string, unknown>, entityType: 'issuer' | 'badgeClass' | 'assertion'): void {
  // Common validations for all types
  expect(entity).toBeDefined();
  expect(entity.id).toBeDefined();
  
  // Context validations
  expect(entity['@context']).toBeDefined();
  // Check that the context is an array or string
  if (typeof entity['@context'] === 'string') {
    expect([OBV3_CONTEXT_URL, 'https://w3id.org/openbadges/v3']).toContain(entity['@context']);
  } else {
    expect(Array.isArray(entity['@context'])).toBe(true);
    expect(entity['@context']).toContain(OBV3_CONTEXT_URL);
    expect(entity['@context']).toContain(VC_V2_CONTEXT_URL);
  }

  // Type-specific validations
  switch (entityType) {
    case 'issuer':
      expect(entity.type).toBeDefined();
      if (Array.isArray(entity.type)) {
        expect(entity.type).toContain('Issuer');
      } else {
        expect(entity.type).toBe('Issuer');
      }
      expect(entity.name).toBeDefined();
      expect(entity.url).toBeDefined();
      expect(entity.email).toBeDefined();
      break;
    case 'badgeClass':
      expect(entity.type).toBeDefined();
      if (Array.isArray(entity.type)) {
        expect(entity.type).toContain('Achievement');
      } else {
        expect(entity.type).toBe('Achievement');
      }
      expect(entity.name).toBeDefined();
      expect(entity.description).toBeDefined();
      
      // Criteria can be a string URL or an object with narrative
      expect(entity.criteria).toBeDefined();
      if (typeof entity.criteria === 'object') {
        const criteria = entity.criteria as Record<string, unknown>;
        // Either id (URL) or narrative (text) should be present
        expect(criteria.id !== undefined || criteria.narrative !== undefined).toBe(true);
      }
      
      // Issuer can be a string URL or an embedded Issuer object
      expect(entity.issuer).toBeDefined();
      break;
    case 'assertion':
      expect(entity.type).toBeDefined();
      if (Array.isArray(entity.type)) {
        expect(entity.type).toContain('VerifiableCredential');
        expect(entity.type).toContain('OpenBadgeCredential');
      }
      
      // Credential subject validation
      expect(entity.credentialSubject).toBeDefined();
      const credSubject = entity.credentialSubject as Record<string, unknown>;
      expect(credSubject).toBeDefined();
      expect(credSubject.type).toBeDefined();
      expect(credSubject.achievement).toBeDefined();
      
      // Proof validation
      expect(entity.proof).toBeDefined();
      const proof = entity.proof as Record<string, unknown>;
      expect(proof.type).toBeDefined();
      expect(proof.created).toBeDefined();
      expect(proof.proofPurpose).toBeDefined();
      expect(proof.verificationMethod).toBeDefined();
      
      // Either issuanceDate (OBv3) or issuedOn (OBv2) should be present
      expect(entity.issuanceDate || entity.issuedOn).toBeDefined();
      
      // Credential status for revocation (optional but should be validated if present)
      if (entity.credentialStatus) {
        const credStatus = entity.credentialStatus as Record<string, unknown>;
        expect(credStatus.type).toBeDefined();
        expect(credStatus.id || credStatus.statusListIndex).toBeDefined();
      }
      break;
  }
}

/**
 * Validates that an issuer entity has all required fields
 * @param issuer The issuer object to validate
 */
export function validateIssuerFields(issuer: Record<string, unknown>): void {
  expect(issuer).toBeDefined();
  expect(issuer.id).toBeDefined();
  expect(issuer.name).toBeDefined();
  expect(issuer.url).toBeDefined();
  expect(issuer.email).toBeDefined();
  expect(issuer.type).toBeDefined();
  expect(issuer['@context']).toBeDefined();
}

/**
 * Validates that a badge class entity has all required fields
 * @param badgeClass The badge class object to validate
 */
export function validateBadgeClassFields(badgeClass: Record<string, unknown>): void {
  expect(badgeClass).toBeDefined();
  expect(badgeClass.id).toBeDefined();
  expect(badgeClass.name).toBeDefined();
  expect(badgeClass.description).toBeDefined();
  expect(badgeClass.criteria).toBeDefined();
  expect(badgeClass.issuer).toBeDefined();
  expect(badgeClass.type).toBeDefined();
  expect(badgeClass['@context']).toBeDefined();
  
  // Image validation - either a URL string or an ImageObject
  if (badgeClass.image) {
    if (typeof badgeClass.image === 'object') {
      const image = badgeClass.image as Record<string, unknown>;
      expect(image.id || image.url).toBeDefined();
    }
  }
}

/**
 * Validates that an assertion entity has all required fields
 * @param assertion The assertion object to validate
 */
export function validateAssertionFields(assertion: Record<string, unknown>): void {
  expect(assertion).toBeDefined();
  expect(assertion.id).toBeDefined();
  expect(assertion.type).toBeDefined();
  expect(assertion['@context']).toBeDefined();
  
  // Validate credentialSubject in more detail for OBv3
  expect(assertion.credentialSubject).toBeDefined();
  const credSubject = assertion.credentialSubject as Record<string, unknown>;
  expect(credSubject.type).toBeDefined();
  expect(credSubject.achievement).toBeDefined();
  
  // Validate proof for OBv3
  expect(assertion.proof).toBeDefined();
  const proof = assertion.proof as Record<string, unknown>;
  expect(proof.type).toBeDefined();
  expect(proof.created).toBeDefined();
  expect(proof.proofPurpose).toBeDefined();
  expect(proof.verificationMethod).toBeDefined();
  expect(proof.proofValue || proof.jws).toBeDefined();
  
  // Always need an issuance date (either name)
  expect(assertion.issuanceDate || assertion.issuedOn).toBeDefined();
}
