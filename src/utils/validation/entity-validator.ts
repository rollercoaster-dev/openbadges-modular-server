/**
 * Entity validation utilities for Open Badges API
 *
 * This file contains utilities for validating entities according to
 * the Open Badges 3.0 specification using the openbadges-types package.
 */

import { Issuer } from '../../domains/issuer/issuer.entity';
import { BadgeClass } from '../../domains/badgeClass/badgeClass.entity';
import { Assertion } from '../../domains/assertion/assertion.entity';
import { Shared, OB3 } from 'openbadges-types';

/**
 * Validates a URL
 * @param url The URL to validate
 * @returns True if the URL is valid, false otherwise
 */
function isValidUrl(url: string | Shared.IRI): boolean {
  try {
    new URL(url.toString());
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates an email address
 * @param email The email to validate
 * @returns True if the email is valid, false otherwise
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates an ISO date string
 * @param date The date string to validate
 * @returns True if the date is valid, false otherwise
 */
function isValidDate(date: string): boolean {
  try {
    const d = new Date(date);
    return !isNaN(d.getTime());
  } catch {
    return false;
  }
}

/**
 * Validates an issuer entity
 * @param issuer The issuer to validate
 * @returns Validation result with errors if any
 */
export function validateIssuer(issuer: Issuer): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check required fields according to OB3.Issuer interface
  if (!issuer.id) {
    errors.push('Issuer ID is required');
  }

  if (!issuer.name) {
    errors.push('Issuer name is required');
  }

  if (!issuer.url) {
    errors.push('Issuer URL is required');
  } else if (!isValidUrl(issuer.url)) {
    errors.push('Issuer URL must be a valid URL');
  }

  if (issuer.image) {
    if (typeof issuer.image === 'string') {
      // Handle IRI or OB2.Image (which is just an IRI string)
      if (!isValidUrl(issuer.image)) {
        errors.push('Issuer image URL must be a valid URL');
      }
    } else if (typeof issuer.image === 'object' && 'id' in issuer.image) {
      // Handle OB3.ImageObject
      if (!isValidUrl(issuer.image.id)) {
        errors.push('Issuer image object ID must be a valid URL');
      }
    } else {
      // Handle unexpected type if necessary, though TypeScript should prevent this
      errors.push('Issuer image has an invalid type');
    }
  }

  // Validate email if provided
  if (issuer.email && !isValidEmail(issuer.email)) {
    errors.push('Issuer email must be a valid email address');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates a badge class entity
 * @param badgeClass The badge class to validate
 * @returns Validation result with errors if any
 */
export function validateBadgeClass(badgeClass: BadgeClass): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check required fields according to OB3.Achievement interface
  if (!badgeClass.id) {
    errors.push('Badge class ID is required');
  }

  if (!badgeClass.type) {
    errors.push('Badge class type is required');
  }

  if (!badgeClass.name) {
    errors.push('Badge class name is required');
  }

  if (!badgeClass.issuer) {
    errors.push('Badge class issuer is required');
  }

  if (!badgeClass.description) {
    errors.push('Badge class description is required');
  }

  if (!badgeClass.image) {
    errors.push('Badge class image is required');
  } else if (
    typeof badgeClass.image === 'string' &&
    !isValidUrl(badgeClass.image)
  ) {
    errors.push('Badge class image must be a valid URL');
  }

  if (!badgeClass.criteria) {
    errors.push('Badge class criteria is required');
  }

  // Check alignment if provided
  if (badgeClass.alignment) {
    badgeClass.alignment.forEach((alignment, index) => {
      if (!alignment.targetName) {
        errors.push(`Alignment ${index} must have a targetName`);
      }

      if (!alignment.targetUrl) {
        errors.push(`Alignment ${index} must have a targetUrl`);
      } else if (!isValidUrl(alignment.targetUrl)) {
        errors.push(`Alignment ${index} targetUrl must be a valid URL`);
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates an assertion entity
 * @param assertion The assertion to validate
 * @returns Validation result with errors if any
 */
export function validateAssertion(assertion: Assertion): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check required fields according to OB3.VerifiableCredential interface
  if (!assertion.id) {
    errors.push('Assertion ID is required');
  }

  if (!assertion.type) {
    errors.push('Assertion type is required');
  }

  if (!assertion.badgeClass) {
    errors.push('Assertion badge class is required');
  }

  if (!assertion.recipient) {
    errors.push('Assertion recipient is required');
  } else if (!assertion.recipient.type || !assertion.recipient.identity) {
    errors.push(
      'Assertion recipient must be a valid recipient object with identity and type'
    );
  }

  if (!assertion.issuedOn) {
    errors.push('Assertion issuedOn is required');
  } else if (!isValidDate(assertion.issuedOn)) {
    errors.push('Assertion issuedOn must be a valid ISO date string');
  }

  // Check optional fields if provided
  if (assertion.expires) {
    if (!isValidDate(assertion.expires)) {
      errors.push('Assertion expires must be a valid ISO date string');
    } else if (new Date(assertion.expires) <= new Date(assertion.issuedOn)) {
      errors.push('Assertion expires must be after issuedOn');
    }
  }

  // Check evidence if provided
  if (assertion.evidence) {
    assertion.evidence.forEach((evidence, index) => {
      if (!evidence.id && !evidence.narrative && !evidence.name) {
        errors.push(
          `Evidence ${index} must have at least one of: id, narrative, or name`
        );
      }

      if (evidence.id && !isValidUrl(evidence.id)) {
        errors.push(`Evidence ${index} id must be a valid URL`);
      }
    });
  }

  // Check verification if provided
  if (assertion.verification && typeof assertion.verification === 'object') {
    // Type guard: Check for properties unique to OB3.Proof to validate Proof-specific fields
    if (
      'signatureValue' in assertion.verification &&
      'creator' in assertion.verification &&
      'created' in assertion.verification
    ) {
      const verificationProof = assertion.verification as OB3.Proof;

      if (!verificationProof['creator']) {
        errors.push('Verification creator is required');
      } else if (
        typeof verificationProof['creator'] === 'string' &&
        !isValidUrl(verificationProof['creator'])
      ) {
        errors.push('Verification creator must be a valid URL');
      }

      if (!verificationProof.created) {
        errors.push('Verification created is required');
      } else if (!isValidDate(verificationProof.created)) {
        errors.push('Verification created must be a valid ISO date string');
      }

      if (!verificationProof['signatureValue']) {
        errors.push('Verification signatureValue is required');
      }
    } else if (assertion.verification.type === 'hosted') {
      // Handle hosted verification specific checks if any (currently none needed here)
    } else {
      // Handle cases where verification is present but not OB3 Proof or Hosted Verification
      // Add checks specific to OB2 VerificationObject or OB3 CredentialStatus if needed
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
