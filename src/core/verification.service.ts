/**
 * Verification service for Open Badges API
 *
 * This service handles the verification of assertions according to
 * the Open Badges 3.0 specification.
 */

import { Assertion } from '../domains/assertion/assertion.entity';
import { KeyService } from './key.service';
import { createVerification, verifyAssertion } from '../utils/crypto/signature';
import { logger } from '../utils/logging/logger.service';
import { config } from '../config/config';
import { Shared } from 'openbadges-types';
import { AssertionRepository } from '../domains/assertion/assertion.repository';

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
      verification.creator = `${config.openBadges.baseUrl}/public-keys/${keyId}`;

      // Create a new assertion with the verification
      return Assertion.create({
        ...assertion.toObject(),
        verification
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

      if (!assertion.verification || !assertion.verification.signatureValue) {
        logger.warn(`Assertion ${assertion.id} has no verification or signature`);
        return false;
      }

      // Extract the key ID from the creator URL
      let keyId = 'default';
      let validCreatorUrl = true;

      if (assertion.verification.creator) {
        const creatorUrl = assertion.verification.creator as string;
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
          logger.warn(`Invalid creator URL format: ${creatorUrl}`, { error: (error as Error).message });
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
        logger.warn(`Could not extract a valid key ID from creator URL: ${assertion.verification.creator}`);
        return false;
      }
      // Create a canonical representation of the assertion for verification
      const canonicalData = this.createCanonicalDataForSigning(assertion);

      // Verify the signature
      const isValid = verifyAssertion(
        canonicalData,
        assertion.verification,
        KeyService.getPublicKey(keyId)
      );

      if (!isValid) {
        logger.warn(`Signature verification failed for assertion ${assertion.id}`);
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
    assertionRepository: AssertionRepository
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
