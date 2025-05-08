/**
 * Verification service for Open Badges API
 *
 * This service handles the verification of assertions according to
 * the Open Badges 3.0 specification.
 */

import { Assertion } from '../domains/assertion/assertion.entity';
import { KeyService } from './key.service';
import { createVerification, verifyAssertion, DataIntegrityProof } from '../utils/crypto/signature';
import { logger } from '../utils/logging/logger.service';
import { Shared, OB3 } from 'openbadges-types';

// Type guard to check if an object is our specific DataIntegrityProof
function isDataIntegrityProof(proof: unknown): proof is DataIntegrityProof {
  return (
    typeof proof === 'object' &&
    proof !== null &&
    'type' in proof &&
    proof.type === 'DataIntegrityProof' &&
    'cryptosuite' in proof &&
    'created' in proof &&
    'proofPurpose' in proof &&
    'verificationMethod' in proof &&
    'proofValue' in proof
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

      // Create verification object (now DataIntegrityProof)
      const proof = createVerification(
        canonicalData,
        KeyService.getPrivateKey(keyId)
      );

      // The verificationMethod in DataIntegrityProof already contains the key's IRI.
      // So, no need to manually set `proof.verificationMethod` like we did for `verification.creator`.

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
        revoked: assertion.revoked,
        revocationReason: assertion.revocationReason,
        issuer: assertion.issuer,
        // Remove old verification property if it exists to avoid conflicts
        verification: undefined,
      };

      // Create a new assertion with the proof
      // The Assertion entity will need to be updated to accept a `proof` property.
      // For now, we assume it can be added or will replace 'verification'.
      return Assertion.create({
        ...assertionData,
        verification: proof as unknown as OB3.Proof, // Assign to existing 'verification' property
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

      // Check if assertion.verification exists and is a DataIntegrityProof object
      if (!assertion.verification || !isDataIntegrityProof(assertion.verification)) {
        logger.warn(`Assertion ${assertion.id} has no valid 'DataIntegrityProof' on its 'verification' property.`);
        return false;
      }

      // At this point, assertion.verification is known to be DataIntegrityProof
      const proofObject = assertion.verification as DataIntegrityProof; // assertion.verification is now our DataIntegrityProof

      // Extract the key ID from the verificationMethod URL
      let keyId = 'default';
      let validVerificationMethod = true;

      if (proofObject.verificationMethod) {
        const verificationMethodUrl = proofObject.verificationMethod as string;
        try {
          const url = new URL(verificationMethodUrl);
          const match = url.pathname.match(/\/public-keys\/([^/]+)$/);
          if (match && match[1]) {
            keyId = match[1];
          } else {
            logger.warn(`VerificationMethod URL does not match expected pattern: ${verificationMethodUrl}`);
            const simpleMatch = verificationMethodUrl.match(/\/public-keys\/([^/]+)$/);
            if (simpleMatch && simpleMatch[1]) {
              keyId = simpleMatch[1];
              logger.info(`Extracted key ID using fallback from verificationMethod: ${keyId}`);
            } else {
              validVerificationMethod = false;
            }
          }
        } catch (error) {
          logger.warn(`Invalid verificationMethod URL format: ${verificationMethodUrl}`, { error });
          const fallbackMatch = verificationMethodUrl.match(/\/public-keys\/([^/]+)$/);
          if (fallbackMatch && fallbackMatch[1]) {
            keyId = fallbackMatch[1];
            logger.info(`Extracted key ID using fallback from verificationMethod: ${keyId}`);
          } else {
            validVerificationMethod = false;
          }
        }
      }

      if (!validVerificationMethod) {
        logger.warn(`Could not extract valid key ID from verificationMethod: ${proofObject.verificationMethod}`);
        return false;
      }

      let publicKey: string;
      try {
        publicKey = KeyService.getPublicKey(keyId);
      } catch (_err) {
        logger.warn(`Key pair with ID ${keyId} not found for verificationMethod ${proofObject.verificationMethod}, cannot verify signature`);
        return false;
      }

      // Create a canonical representation of the assertion for verification
      const canonicalData = this.createCanonicalDataForSigning(assertion);

      // Verify the signature using the DataIntegrityProof
      const isValid = verifyAssertion(
        canonicalData,
        proofObject, // This is now DataIntegrityProof
        publicKey
      );

      if (!isValid) {
        logger.warn(`Signature verification failed for assertion ${assertion.id} using its verification proof.`);
      }
      return isValid;

    } catch (error) {
      logger.logError('Failed to verify assertion signature', error as Error);
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
