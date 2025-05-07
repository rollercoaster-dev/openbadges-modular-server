/**
 * Verification service for Open Badges API
 *
 * This service handles the verification of assertions according to
 * the Open Badges 3.0 specification.
 */

import { Assertion } from '../domains/assertion/assertion.entity';
import { KeyService } from './key.service';
import { createVerification, verifyAssertion, SignedBadgeVerification } from '../utils/crypto/signature';
import { logger } from '../utils/logging/logger.service';
import { config } from '../config/config';
import { Shared, OB3, OB2 } from 'openbadges-types';
import { toIRI } from '../utils/types/iri-utils';

// Type guard to check if an object is our specific SignedBadgeVerification
function isSignedBadgeVerification(proof: unknown): proof is SignedBadgeVerification {
  return (
    typeof proof === 'object' &&
    proof !== null &&
    'type' in proof &&
    proof.type === 'SignedBadge' &&
    'creator' in proof &&
    'created' in proof &&
    'signatureValue' in proof
  );
}

export class VerificationService {
  /**
   * Creates a verification object for an assertion
   * @param assertion The assertion to create verification for
   * @param keyId Optional key ID to use for signing (defaults to 'default')
   * @returns The assertion with verification added
   */
  static async createVerificationForAssertion(assertion: Assertion, keyId: string = 'default'): Promise<Assertion> {
    try {
      // Ensure the key service is initialized
      await KeyService.initialize();

      // Create a canonical representation of the assertion for signing
      // This ensures that the signature is based on the essential data
      const canonicalData = this.createCanonicalDataForSigning(assertion);

      // Create verification object
      const verification = createVerification(
        canonicalData,
        KeyService.getPrivateKey(keyId)
      );

      // Add key ID to the verification object
      verification.creator = toIRI(`${config.openBadges.baseUrl}/public-keys/${keyId}`);

      // Get the assertion data as a plain object
      // Explicitly select the required fields from the assertion object
      const assertionData = {
        id: assertion.id,
        type: assertion.type,
        badgeClass: assertion.badgeClass,
        recipient: assertion.recipient,
        issuedOn: assertion.issuedOn,
        expires: assertion.expires,
        evidence: assertion.evidence,
        verification: assertion.verification,
        revoked: assertion.revoked,
        revocationReason: assertion.revocationReason,
        issuer: assertion.issuer,
      };

      // Create a new assertion with the verification
      return Assertion.create({
        ...assertionData,
        // Explicitly cast to the OB2 type, which SignedBadgeVerification is compatible with
        verification: verification as OB2.VerificationObject
      });
    } catch (error) {
      logger.logError('Failed to create verification for assertion', error as Error);
      throw error;
    }
  }

  /**
   * Creates a canonical representation of the assertion for signing
   * This ensures that the signature is based on the essential data
   * and is not affected by non-essential changes
   *
   * @param assertion The assertion to create canonical data for
   * @returns A string representation of the canonical data
   */
  private static createCanonicalDataForSigning(assertion: Assertion): string {
    // Create a minimal object with only the essential properties
    const essentialData = {
      id: assertion.id,
      type: assertion.type,
      // Use badgeClass property (internal) rather than badge (from toObject)
      badgeClass: assertion.badgeClass,
      recipient: assertion.recipient,
      issuedOn: assertion.issuedOn,
      expires: assertion.expires
    };

    // Convert to a stable string representation
    return JSON.stringify(essentialData, Object.keys(essentialData).sort());
  }

  /**
   * Verifies an assertion's signature
   * @param assertion The assertion to verify
   * @returns True if the assertion is valid, false otherwise
   */
  static async verifyAssertionSignature(assertion: Assertion): Promise<boolean> {
    try {
      // Ensure the key service is initialized
      await KeyService.initialize();

      // Type guard to check if verification is likely an OB3.Proof object
      if (!assertion.verification || typeof assertion.verification !== 'object' ||
          !('signatureValue' in assertion.verification) || !assertion.verification['signatureValue']) {
        logger.warn(`Assertion ${assertion.id} has no verification or signature suitable for checking.`);
        return false;
      }

      // At this point, assertion.verification is likely OB3.Proof, proceed with checks
      const verificationProof = assertion.verification as OB3.Proof; // Safe assertion after guard

      // Extract the key ID from the creator URL
      let keyId = 'default';
      let validCreatorUrl = true;

      if (verificationProof['creator']) {
        const creatorUrl = verificationProof['creator'] as string;
        try {
          // Try to parse as a valid URL
          const url = new URL(creatorUrl);
          const match = url.pathname.match(/\/public-keys\/([^/]+)$/);
          if (match && match[1]) {
            keyId = match[1];
          } else {
            logger.warn(`Creator URL does not match the expected pattern: ${creatorUrl}`);
            // Fallback to simple regex for non-standard URLs
            const simpleMatch = creatorUrl.match(/\/public-keys\/([^/]+)$/);
            if (simpleMatch && simpleMatch[1]) {
              keyId = simpleMatch[1];
              logger.info(`Extracted key ID using fallback method: ${keyId}`);
            } else {
              validCreatorUrl = false;
            }
          }
        } catch (error) {
          // If URL parsing fails, fall back to simple regex
          logger.warn(`Invalid creator URL format: ${creatorUrl}`, { error });
          const fallbackMatch = creatorUrl.match(/\/public-keys\/([^/]+)$/);
          if (fallbackMatch && fallbackMatch[1]) {
            keyId = fallbackMatch[1];
            logger.info(`Extracted key ID using fallback method: ${keyId}`);
          } else {
            validCreatorUrl = false;
          }
        }
      }

      // If we couldn't extract a valid key ID from the creator URL, return false
      if (!validCreatorUrl) {
        logger.warn(`Could not extract a valid key ID from creator URL: ${verificationProof['creator']}`);
        return false;
      }

      // Obtain public key, catch missing key errors
      let publicKey: string;
      try {
        publicKey = KeyService.getPublicKey(keyId);
      } catch (_err) {
        logger.warn(`Key pair with ID ${keyId} not found, cannot verify signature`);
        return false;
      }

      // Check if verificationProof is a SignedBadgeVerification object generated by our createVerification
      if (isSignedBadgeVerification(verificationProof)) {
        // At this point, verificationProof is known to be SignedBadgeVerification

        // Create a canonical representation of the assertion for verification
        const canonicalData = this.createCanonicalDataForSigning(assertion);

        // Verify the signature
        const isValid = verifyAssertion(
          canonicalData,
          verificationProof, // Type guard function guarantees the type
          publicKey
        );

        if (!isValid) {
          logger.warn(`Signature verification failed for assertion ${assertion.id}`);
        }
        return isValid;
      } else {
        // TODO: Implement proper OB3 proof verification or handle other verification types
        const proofType = typeof verificationProof === 'object' && verificationProof !== null && 'type' in verificationProof ? verificationProof.type : 'unstructured';
        logger.warn(`Signature verification for assertion ${assertion.id} skipped: Expected 'SignedBadge' verification type, but found '${proofType}'.`);
        return false;
      }
    } catch (error) {
      // Log as warning to avoid error-level logs in normal flows
      logger.warn('Failed to verify assertion signature', { error });
      return false;
    }
  }

  /**
   * Verifies an assertion's validity (not expired, not revoked, valid signature)
   * @param assertion The assertion to verify
   * @returns An object containing verification results
   */
  static async verifyAssertion(assertion: Assertion): Promise<{
    isValid: boolean;
    isExpired: boolean;
    isRevoked: boolean;
    hasValidSignature: boolean;
    details?: string;
  }> {
    try {
      // Check if revoked
      const isRevoked = !!assertion.revoked;
      let revocationReason = '';
      if (isRevoked && assertion.revocationReason) {
        revocationReason = assertion.revocationReason;
      }

      // Check if expired
      let isExpired = false;
      if (assertion.expires) {
        const expiryDate = new Date(assertion.expires);
        const now = new Date();
        isExpired = expiryDate < now;
      }

      // Check signature
      const hasValidSignature = await this.verifyAssertionSignature(assertion);

      // Overall validity
      const isValid = !isRevoked && !isExpired && hasValidSignature;

      // Determine details message
      let details = '';
      if (isRevoked) {
        details = `Assertion has been revoked${revocationReason ? `: ${revocationReason}` : ''}`;
      } else if (isExpired) {
        details = 'Assertion has expired';
      } else if (!hasValidSignature) {
        details = 'Assertion has an invalid signature';
      } else {
        details = 'Assertion is valid';
      }

      return {
        isValid,
        isExpired,
        isRevoked,
        hasValidSignature,
        details
      };
    } catch (error) {
      logger.logError('Failed to verify assertion', error as Error);
      return {
        isValid: false,
        isExpired: false,
        isRevoked: false,
        hasValidSignature: false,
        details: 'Error during verification process'
      };
    }
  }

  /**
   * Verifies an assertion by ID
   * @param assertionId The ID of the assertion to verify
   * @param assertionRepository The repository to use for fetching the assertion
   * @returns Verification results
   */
  static async verifyAssertionById(
    assertionId: Shared.IRI,
    assertionRepository: { findById: (id: Shared.IRI) => Promise<Assertion | null> }
  ): Promise<{
    isValid: boolean;
    isExpired: boolean;
    isRevoked: boolean;
    hasValidSignature: boolean;
    details?: string;
  }> {
    try {
      // Fetch the assertion
      const assertion = await assertionRepository.findById(assertionId);

      if (!assertion) {
        return {
          isValid: false,
          isExpired: false,
          isRevoked: false,
          hasValidSignature: false,
          details: 'Assertion not found'
        };
      }

      // Verify the assertion
      return await this.verifyAssertion(assertion);
    } catch (error) {
      logger.logError(`Failed to verify assertion with ID ${assertionId}`, error as Error);
      return {
        isValid: false,
        isExpired: false,
        isRevoked: false,
        hasValidSignature: false,
        details: 'Error during verification process'
      };
    }
  }
}
