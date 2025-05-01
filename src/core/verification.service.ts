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
import { URL } from 'url';

// Define a type for the assertion repository interface
interface IAssertionRepository {
  // eslint-disable-next-line no-unused-vars
  findById(id: Shared.IRI): Promise<Assertion | null>;
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

      /**
       * Extract the key ID from the creator URL
       *
       * The creator URL is expected to be in the format:
       * https://example.com/public-keys/{keyId}
       *
       * We handle several edge cases:
       * 1. Standard URL with the expected pattern
       * 2. Valid URL but with unexpected path format
       * 3. Invalid URL format but with recognizable pattern
       * 4. Completely invalid or unrecognizable format
       */
      let keyId = 'default';
      let validCreatorUrl = true;

      if (assertion.verification.creator) {
        const creatorUrl = assertion.verification.creator as string;

        // Helper function to extract key ID using regex
        const extractKeyIdWithRegex = (url: string): string | null => {
          // Match patterns like "/public-keys/abc123" or "public-keys/abc123"
          // or even "public-keys\abc123" (Windows paths)
          const patterns = [
            /\/public-keys\/([^/\\]+)$/,  // Standard URL path
            /public-keys\/([^/\\]+)$/,    // Without leading slash
            /public-keys\\([^/\\]+)$/     // Windows path format
          ];

          for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match && match[1]) {
              return match[1];
            }
          }

          return null;
        };

        try {
          // Try to parse as a valid URL
          const url = new URL(creatorUrl);

          // First attempt: Extract from pathname using URL API
          const match = url.pathname.match(/\/public-keys\/([^/]+)$/);
          if (match && match[1]) {
            keyId = match[1];
            logger.debug(`Extracted key ID from URL pathname: ${keyId}`);
          } else {
            // Second attempt: Try the full URL with our regex patterns
            logger.warn(`Creator URL does not match the expected pathname pattern: ${creatorUrl}`);
            const extractedId = extractKeyIdWithRegex(creatorUrl);

            if (extractedId) {
              keyId = extractedId;
              logger.info(`Extracted key ID using fallback regex on full URL: ${keyId}`);
            } else {
              // Third attempt: Check if the hostname itself might contain the key ID
              // This handles cases where the URL might be malformed but still contains useful info
              const hostnameMatch = url.hostname.match(/([^.]+)/);
              if (hostnameMatch && hostnameMatch[1] && hostnameMatch[1] !== 'www') {
                keyId = hostnameMatch[1];
                logger.info(`Extracted potential key ID from hostname: ${keyId}`);
              } else {
                validCreatorUrl = false;
                logger.warn(`Could not extract key ID from URL: ${creatorUrl}`);
              }
            }
          }
        } catch (error) {
          // If URL parsing fails, fall back to simple regex on the string
          logger.warn(`Invalid creator URL format: ${creatorUrl}`, { error: error });

          const extractedId = extractKeyIdWithRegex(creatorUrl);
          if (extractedId) {
            keyId = extractedId;
            logger.info(`Extracted key ID from invalid URL using regex: ${keyId}`);
          } else {
            // Last resort: Try to find anything that looks like an ID
            // This is very permissive and should only be used as a last resort
            const lastResortMatch = creatorUrl.match(/([a-zA-Z0-9_-]{4,})/);
            if (lastResortMatch && lastResortMatch[1]) {
              keyId = lastResortMatch[1];
              logger.info(`Extracted potential key ID using last resort method: ${keyId}`);
            } else {
              validCreatorUrl = false;
              logger.warn(`Could not extract any valid key ID from: ${creatorUrl}`);
            }
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
    assertionRepository: IAssertionRepository
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
